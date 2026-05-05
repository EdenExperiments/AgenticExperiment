package server

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/meden/rpgtracker/internal/api"
	"github.com/meden/rpgtracker/internal/auth"
	"github.com/meden/rpgtracker/internal/config"
	"github.com/meden/rpgtracker/internal/entitlements"
	"github.com/meden/rpgtracker/internal/handlers"
	"github.com/meden/rpgtracker/internal/users"
)

// Server wraps the standard http.Server and holds application dependencies.
type Server struct {
	httpServer *http.Server
	cfg        *config.Config
}

// NewServer creates a new Server wired with a chi router and basic routes.
func NewServer(cfg *config.Config, sessionMiddleware func(http.Handler) http.Handler, db *pgxpool.Pool, storageClient ...handlers.StorageClient) *Server {
	r := chi.NewRouter()
	r.Use(panicRecoveryMiddleware) // outermost: catches panics from any downstream middleware
	r.Use(middleware.Logger)

	r.NotFound(func(w http.ResponseWriter, r *http.Request) {
		api.RespondError(w, http.StatusNotFound, "not found")
	})

	authHandler := auth.NewAuthHandler(cfg.SupabaseProjectURL, cfg.SupabaseAnonKey)

	// Public routes
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		api.RespondJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})

	// Protected API routes
	r.Route("/api/v1", func(r chi.Router) {
		r.Use(sessionMiddleware)
		r.Use(ensureUserMiddleware(db))

		presetHandler := handlers.NewPresetHandler(db)
		r.Get("/presets", presetHandler.HandleGetPresets)
		r.Get("/presets/{id}", presetHandler.HandleGetPreset)

		skillHandler := handlers.NewSkillHandler(db)
		r.Post("/skills", skillHandler.HandlePostSkill)
		r.Get("/skills", skillHandler.HandleGetSkills)
		r.Get("/skills/{id}", skillHandler.HandleGetSkill)
		r.Put("/skills/{id}", skillHandler.HandlePutSkill)
		r.Delete("/skills/{id}", skillHandler.HandleDeleteSkill)
		r.Patch("/skills/{id}/favourite", skillHandler.HandlePatchFavourite)
		r.Put("/skills/{id}/tags", skillHandler.HandlePutSkillTags)
		r.Get("/tags", skillHandler.HandleGetTags)
		r.Get("/categories", skillHandler.HandleGetCategories)

		xpHandler := handlers.NewXPHandler(db)
		r.Post("/skills/{id}/xp", xpHandler.HandlePostXP)

		sessionHandler := handlers.NewSessionHandler(db)
		r.Post("/skills/{id}/sessions", sessionHandler.HandlePostSession)
		r.Get("/skills/{id}/sessions", sessionHandler.HandleGetSessions)

		xpChartHandler := handlers.NewXPChartHandler(db)
		r.Get("/skills/{id}/xp-chart", xpChartHandler.HandleGetXPChart)

		gateHandler := handlers.NewGateHandler(db, []byte(cfg.MasterKey))
		r.Post("/blocker-gates/{id}/submit", gateHandler.HandlePostGateSubmit)

		activityHandler := handlers.NewActivityHandler(db)
		r.Get("/activity", activityHandler.HandleGetActivity)

		calibrateHandler := handlers.NewCalibrateHandler(db, []byte(cfg.MasterKey))
		r.Post("/calibrate", calibrateHandler.HandlePostCalibrate)

		var userHandler *handlers.UserHandler
		if len(storageClient) > 0 && storageClient[0] != nil {
			userHandler = handlers.NewUserHandlerFull(db, storageClient[0], cfg.SupabaseProjectURL)
		} else {
			userHandler = handlers.NewUserHandler(db)
		}
		r.Get("/account", userHandler.HandleGetAccount)
		r.Put("/account", userHandler.HandlePostAccount)
		r.Patch("/account", userHandler.HandlePatchAccount)
		r.Patch("/account/primary-skill", userHandler.HandlePatchPrimarySkill)
		r.Post("/account/avatar", userHandler.HandlePostAvatar)
		r.Delete("/account/avatar", userHandler.HandleDeleteAvatar)
		r.Get("/account/stats", userHandler.HandleGetAccountStats)

		keyHandler := handlers.NewKeyHandler(db, []byte(cfg.MasterKey))
		r.Get("/account/api-key", keyHandler.HandleGetAPIKey)
		r.Put("/account/api-key", keyHandler.HandlePostAPIKey)
		r.Delete("/account/api-key", keyHandler.HandleDeleteAPIKey)

		r.Post("/auth/signout", authHandler.HandlePostSignout)

		r.Post("/account/password", authHandler.HandlePostPasswordChange)

		goalHandler := handlers.NewGoalHandler(db)
		r.Post("/goals", goalHandler.HandlePostGoal)
		r.Get("/goals", goalHandler.HandleGetGoals)
		r.Get("/goals/{id}", goalHandler.HandleGetGoal)
		r.Put("/goals/{id}", goalHandler.HandlePutGoal)
		r.Delete("/goals/{id}", goalHandler.HandleDeleteGoal)
		r.Post("/goals/{id}/milestones", goalHandler.HandlePostMilestone)
		r.Get("/goals/{id}/milestones", goalHandler.HandleGetMilestones)
		r.Put("/goals/{id}/milestones/{mid}", goalHandler.HandlePutMilestone)
		r.Delete("/goals/{id}/milestones/{mid}", goalHandler.HandleDeleteMilestone)
		r.Post("/goals/{id}/checkins", goalHandler.HandlePostCheckin)
		r.Get("/goals/{id}/checkins", goalHandler.HandleGetCheckins)

		// Premium AI endpoints — gated by entitlement checker (requires Pro tier).
		entitlementChecker := entitlements.NewChecker(db)
		goalPlanHandler := handlers.NewGoalPlanHandler(db, []byte(cfg.MasterKey))
		r.With(entitlementChecker.RequireFeature(entitlements.FeatureAIGoalPlanner)).
			Post("/goals/plan", goalPlanHandler.HandlePostGoalPlan)
		r.Get("/goals/{id}/forecast", goalHandler.HandleGetGoalForecast)
	})

	httpServer := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: r,
	}

	return &Server{
		httpServer: httpServer,
		cfg:        cfg,
	}
}

// Start begins listening and serving HTTP requests. It blocks until the server
// encounters an error or is shut down.
func (s *Server) Start() error {
	if err := s.httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		return err
	}
	return nil
}

// ServeHTTP allows Server to be used as an http.Handler in tests.
func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.httpServer.Handler.ServeHTTP(w, r)
}

// ensureUserMiddleware guarantees a public.users row exists for the authenticated
// user before any handler runs. This prevents FK violations on tables that
// reference users(id) when a user is created or re-created in Supabase auth
// but the application-side row has not been written yet (e.g. trigger timing,
// or delete-and-re-add flows). GetOrCreateUser is idempotent (ON CONFLICT DO NOTHING).
func ensureUserMiddleware(db *pgxpool.Pool) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userID, ok := auth.UserIDFromContext(r.Context())
			if !ok {
				next.ServeHTTP(w, r)
				return
			}
			email := auth.EmailFromContext(r.Context())
			if _, err := users.GetOrCreateUser(r.Context(), db, userID, email); err != nil {
				log.Printf("ERROR: ensureUser for %s: %v", userID, err)
				api.RespondError(w, http.StatusInternalServerError, "failed to initialize user session")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// panicRecoveryMiddleware recovers from panics, logs them, and returns a
// plain JSON 500 error response.
func panicRecoveryMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rec := recover(); rec != nil {
				log.Printf("panic recovered: %v", rec)
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusInternalServerError)
				_ = json.NewEncoder(w).Encode(map[string]string{"error": "internal server error"})
			}
		}()
		next.ServeHTTP(w, r)
	})
}
