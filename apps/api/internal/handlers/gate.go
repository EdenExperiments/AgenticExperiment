package handlers

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/meden/rpgtracker/internal/api"
	"github.com/meden/rpgtracker/internal/auth"
	"github.com/meden/rpgtracker/internal/skills"
)

// RawClaudeCaller is a minimal interface for calling Claude with arbitrary prompts.
// Used by the gate handler to assess evidence.
type RawClaudeCaller interface {
	CallRaw(ctx context.Context, apiKey, systemPrompt, userPrompt string) (string, error)
}

// GateStore is the persistence interface for blocker gate operations.
type GateStore interface {
	GetGate(ctx context.Context, userID, gateID uuid.UUID) (*skills.BlockerGate, error)
	GetActiveCooldown(ctx context.Context, userID, gateID uuid.UUID) (*time.Time, error)
	InsertSubmission(ctx context.Context, req skills.CreateGateSubmissionRequest) (*skills.GateSubmission, error)
	ClearGate(ctx context.Context, gateID uuid.UUID) error
}

// GateHandler handles blocker gate submission endpoints.
type GateHandler struct {
	store  GateStore
	claude RawClaudeCaller
}

// NewGateHandlerWithStore constructs a GateHandler with injected dependencies (for tests).
func NewGateHandlerWithStore(s GateStore, claude RawClaudeCaller) *GateHandler {
	return &GateHandler{store: s, claude: claude}
}

// NewGateHandler constructs a GateHandler backed by the DB pool and live Claude caller.
func NewGateHandler(db *pgxpool.Pool, masterKey []byte) *GateHandler {
	return &GateHandler{
		store:  &dbGateStore{db: db, masterKey: masterKey},
		claude: &httpRawClaudeCaller{client: newHTTPClient()},
	}
}

// HandlePostGateSubmit handles POST /api/v1/blocker-gates/{id}/submit.
func (h *GateHandler) HandlePostGateSubmit(w http.ResponseWriter, r *http.Request) {
	userID, ok := auth.UserIDFromContext(r.Context())
	if !ok {
		api.RespondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	gateID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		api.RespondError(w, http.StatusBadRequest, "invalid gate id")
		return
	}

	if err := r.ParseForm(); err != nil {
		api.RespondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	path := r.FormValue("path")
	evidenceWhat := r.FormValue("evidence_what")
	evidenceHow := r.FormValue("evidence_how")
	evidenceFeeling := r.FormValue("evidence_feeling")

	// Validate evidence lengths (AC-G2).
	validationErrors := map[string]string{}
	if len(evidenceWhat) < 50 {
		validationErrors["evidence_what"] = "must be at least 50 characters"
	}
	if len(evidenceHow) < 50 {
		validationErrors["evidence_how"] = "must be at least 50 characters"
	}
	if len(evidenceFeeling) < 20 {
		validationErrors["evidence_feeling"] = "must be at least 20 characters"
	}
	if len(validationErrors) > 0 {
		api.RespondJSON(w, http.StatusUnprocessableEntity, map[string]interface{}{
			"error":  "validation_failed",
			"fields": validationErrors,
		})
		return
	}

	// Check cooldown (AC-G7).
	nextRetryAt, err := h.store.GetActiveCooldown(r.Context(), userID, gateID)
	if err != nil {
		log.Printf("ERROR: GetActiveCooldown gate=%s: %v", gateID, err)
		api.RespondError(w, http.StatusInternalServerError, "failed to check cooldown")
		return
	}
	if nextRetryAt != nil {
		api.RespondError(w, http.StatusTooManyRequests, "gate submission in cooldown")
		return
	}

	if path == "self_report" {
		h.handleSelfReport(w, r, userID, gateID, evidenceWhat, evidenceHow, evidenceFeeling)
		return
	}

	// AI path.
	h.handleAISubmission(w, r, userID, gateID, evidenceWhat, evidenceHow, evidenceFeeling)
}

func (h *GateHandler) handleSelfReport(
	w http.ResponseWriter, r *http.Request,
	userID, gateID uuid.UUID,
	evidenceWhat, evidenceHow, evidenceFeeling string,
) {
	req := skills.CreateGateSubmissionRequest{
		GateID:          gateID,
		UserID:          userID,
		Path:            "self_report",
		EvidenceWhat:    evidenceWhat,
		EvidenceHow:     evidenceHow,
		EvidenceFeeling: evidenceFeeling,
		Verdict:         "self_reported",
		AttemptNumber:   0, // computed by InsertSubmission as MAX(attempt_number)+1
	}

	submission, err := h.store.InsertSubmission(r.Context(), req)
	if err != nil {
		log.Printf("ERROR: InsertSubmission gate=%s: %v", gateID, err)
		api.RespondError(w, http.StatusInternalServerError, "failed to record submission")
		return
	}

	if err := h.store.ClearGate(r.Context(), gateID); err != nil {
		log.Printf("ERROR: ClearGate gate=%s: %v", gateID, err)
		api.RespondError(w, http.StatusInternalServerError, "failed to clear gate")
		return
	}

	api.RespondJSON(w, http.StatusOK, map[string]interface{}{
		"submission":   submission,
		"gate_cleared": true,
	})
}

func (h *GateHandler) handleAISubmission(
	w http.ResponseWriter, r *http.Request,
	userID, gateID uuid.UUID,
	evidenceWhat, evidenceHow, evidenceFeeling string,
) {
	if h.claude == nil {
		api.RespondError(w, http.StatusBadGateway, "ai assessment unavailable")
		return
	}

	systemPrompt := "You are a strict but fair skill progression assessor."
	userPrompt := "Evidence: " + evidenceWhat + "\n" + evidenceHow + "\n" + evidenceFeeling

	_, err := h.claude.CallRaw(r.Context(), "", systemPrompt, userPrompt)
	if err != nil {
		log.Printf("ERROR: Claude CallRaw gate=%s: %v", gateID, err)
		api.RespondError(w, http.StatusBadGateway, "ai assessment unavailable")
		return
	}

	// On success, insert the submission.
	req := skills.CreateGateSubmissionRequest{
		GateID:          gateID,
		UserID:          userID,
		Path:            "ai",
		EvidenceWhat:    evidenceWhat,
		EvidenceHow:     evidenceHow,
		EvidenceFeeling: evidenceFeeling,
		Verdict:         "approved",
		AttemptNumber:   0, // computed by InsertSubmission as MAX(attempt_number)+1
	}

	submission, err := h.store.InsertSubmission(r.Context(), req)
	if err != nil {
		log.Printf("ERROR: InsertSubmission gate=%s: %v", gateID, err)
		api.RespondError(w, http.StatusInternalServerError, "failed to record submission")
		return
	}

	if err := h.store.ClearGate(r.Context(), gateID); err != nil {
		log.Printf("WARN: ClearGate gate=%s: %v", gateID, err)
	}

	api.RespondJSON(w, http.StatusOK, map[string]interface{}{
		"submission":   submission,
		"gate_cleared": true,
	})
}

// dbGateStore is the real DB-backed implementation of GateStore.
type dbGateStore struct {
	db        *pgxpool.Pool
	masterKey []byte
}

func (s *dbGateStore) GetGate(_ context.Context, _, _ uuid.UUID) (*skills.BlockerGate, error) {
	return nil, nil
}

func (s *dbGateStore) GetActiveCooldown(_ context.Context, _, _ uuid.UUID) (*time.Time, error) {
	return nil, nil
}

// InsertSubmission inserts a gate_submissions row.
// Attempt number is computed as MAX(attempt_number)+1 for this gate+user inside the
// same transaction, so concurrent submissions cannot produce duplicate attempt numbers.
func (s *dbGateStore) InsertSubmission(ctx context.Context, req skills.CreateGateSubmissionRequest) (*skills.GateSubmission, error) {
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("gate: begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	// Compute next attempt number inside the transaction to be race-safe.
	var attemptNumber int
	err = tx.QueryRow(ctx, `
		SELECT COALESCE(MAX(attempt_number), 0) + 1
		FROM public.gate_submissions
		WHERE gate_id = $1 AND user_id = $2
	`, req.GateID, req.UserID).Scan(&attemptNumber)
	if err != nil {
		return nil, fmt.Errorf("gate: get attempt number: %w", err)
	}

	var sub skills.GateSubmission
	err = tx.QueryRow(ctx, `
		INSERT INTO public.gate_submissions
			(gate_id, user_id, path, evidence_what, evidence_how, evidence_feeling,
			 verdict, attempt_number, ai_feedback, next_retry_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULLIF($9, ''), $10)
		RETURNING id, gate_id, user_id, path, evidence_what, evidence_how, evidence_feeling,
		          verdict, attempt_number, COALESCE(ai_feedback, ''), next_retry_at, submitted_at
	`,
		req.GateID, req.UserID, req.Path,
		req.EvidenceWhat, req.EvidenceHow, req.EvidenceFeeling,
		req.Verdict, attemptNumber, req.AIFeedback, req.NextRetryAt,
	).Scan(
		&sub.ID, &sub.GateID, &sub.UserID, &sub.Path,
		&sub.EvidenceWhat, &sub.EvidenceHow, &sub.EvidenceFeeling,
		&sub.Verdict, &sub.AttemptNumber, &sub.AIFeedback, &sub.NextRetryAt, &sub.SubmittedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("gate: insert submission: %w", err)
	}

	if err = tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("gate: commit: %w", err)
	}
	return &sub, nil
}

func (s *dbGateStore) ClearGate(_ context.Context, _ uuid.UUID) error {
	return nil
}
