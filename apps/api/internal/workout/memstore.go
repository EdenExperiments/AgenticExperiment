package workout

import (
	"context"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
)

type Store interface {
	CreateSession(ctx context.Context, userID uuid.UUID) (*Session, error)
	ListSessions(ctx context.Context, userID uuid.UUID, limit int) ([]Session, error)
	GetSession(ctx context.Context, userID, sessionID uuid.UUID) (*Session, error)
	AbandonSession(ctx context.Context, userID, sessionID uuid.UUID) (*Session, error)
	FinishSession(ctx context.Context, userID, sessionID uuid.UUID) (*Session, error)
	AddExercise(ctx context.Context, userID, sessionID uuid.UUID, name string) (*Exercise, error)
	AddSet(ctx context.Context, userID, exerciseID uuid.UUID, reps int, loadKg *float64, rpe *int) (*Set, error)
	SessionsInRange(ctx context.Context, userID uuid.UUID, since time.Time) ([]Session, error)
}

type MemStore struct {
	mu            sync.Mutex
	sessions      map[uuid.UUID]*Session
	exerciseOwner map[uuid.UUID]uuid.UUID
	exerciseSess  map[uuid.UUID]uuid.UUID
	sessionOwner  map[uuid.UUID]uuid.UUID
}

func NewMemStore() *MemStore {
	return &MemStore{
		sessions:      map[uuid.UUID]*Session{},
		exerciseOwner: map[uuid.UUID]uuid.UUID{},
		exerciseSess:  map[uuid.UUID]uuid.UUID{},
		sessionOwner:  map[uuid.UUID]uuid.UUID{},
	}
}

func (m *MemStore) CreateSession(_ context.Context, userID uuid.UUID) (*Session, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	now := time.Now().UTC()
	s := &Session{
		ID:        uuid.New(),
		StartedAt: now,
		Status:    StatusInProgress,
		CreatedAt: now,
		Exercises: []Exercise{},
	}
	m.sessions[s.ID] = s
	m.sessionOwner[s.ID] = userID
	return cloneSession(s), nil
}

func (m *MemStore) ListSessions(_ context.Context, userID uuid.UUID, limit int) ([]Session, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.listLocked(userID, limit, time.Time{}), nil
}

func (m *MemStore) listLocked(userID uuid.UUID, limit int, since time.Time) []Session {
	var out []Session
	for id, s := range m.sessions {
		if m.sessionOwner[id] != userID {
			continue
		}
		if !since.IsZero() && s.StartedAt.Before(since) {
			continue
		}
		cp := cloneSession(s)
		cp.VolumeKg = sessionVolume(*cp)
		cp.Exercises = nil
		out = append(out, *cp)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].StartedAt.After(out[j].StartedAt) })
	if limit > 0 && len(out) > limit {
		out = out[:limit]
	}
	if out == nil {
		out = []Session{}
	}
	return out
}

func (m *MemStore) GetSession(_ context.Context, userID, sessionID uuid.UUID) (*Session, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	s, err := m.ownedSession(userID, sessionID)
	if err != nil {
		return nil, err
	}
	cp := cloneSession(s)
	cp.VolumeKg = sessionVolume(*cp)
	return cp, nil
}

func (m *MemStore) AbandonSession(_ context.Context, userID, sessionID uuid.UUID) (*Session, error) {
	return m.endSession(userID, sessionID, StatusAbandoned)
}

func (m *MemStore) FinishSession(_ context.Context, userID, sessionID uuid.UUID) (*Session, error) {
	return m.endSession(userID, sessionID, StatusCompleted)
}

func (m *MemStore) endSession(userID, sessionID uuid.UUID, status string) (*Session, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	s, err := m.ownedSession(userID, sessionID)
	if err != nil {
		return nil, err
	}
	if s.Status != StatusInProgress {
		return nil, ErrConflict
	}
	now := time.Now().UTC()
	s.Status = status
	s.EndedAt = &now
	cp := cloneSession(s)
	cp.VolumeKg = sessionVolume(*cp)
	return cp, nil
}

func (m *MemStore) AddExercise(_ context.Context, userID, sessionID uuid.UUID, name string) (*Exercise, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	s, err := m.ownedSession(userID, sessionID)
	if err != nil {
		return nil, err
	}
	if s.Status != StatusInProgress {
		return nil, ErrConflict
	}
	ex := Exercise{
		ID:        uuid.New(),
		SessionID: sessionID,
		Name:      name,
		Position:  len(s.Exercises),
		Sets:      []Set{},
	}
	s.Exercises = append(s.Exercises, ex)
	m.exerciseOwner[ex.ID] = userID
	m.exerciseSess[ex.ID] = sessionID
	cp := ex
	cp.Sets = []Set{}
	return &cp, nil
}

func (m *MemStore) AddSet(_ context.Context, userID, exerciseID uuid.UUID, reps int, loadKg *float64, rpe *int) (*Set, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.exerciseOwner[exerciseID] != userID {
		return nil, ErrNotFound
	}
	sessionID, ok := m.exerciseSess[exerciseID]
	if !ok {
		return nil, ErrNotFound
	}
	s, err := m.ownedSession(userID, sessionID)
	if err != nil {
		return nil, err
	}
	if s.Status != StatusInProgress {
		return nil, ErrConflict
	}
	idx := -1
	for i := range s.Exercises {
		if s.Exercises[i].ID == exerciseID {
			idx = i
			break
		}
	}
	if idx < 0 {
		return nil, ErrNotFound
	}
	st := Set{
		ID:         uuid.New(),
		ExerciseID: exerciseID,
		Reps:       reps,
		LoadKg:     loadKg,
		RPE:        rpe,
		Position:   len(s.Exercises[idx].Sets),
	}
	s.Exercises[idx].Sets = append(s.Exercises[idx].Sets, st)
	cp := st
	return &cp, nil
}

func (m *MemStore) SessionsInRange(_ context.Context, userID uuid.UUID, since time.Time) ([]Session, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	summaries := m.listLocked(userID, 0, since)
	out := make([]Session, 0, len(summaries))
	for _, sum := range summaries {
		s := m.sessions[sum.ID]
		cp := cloneSession(s)
		cp.VolumeKg = sessionVolume(*cp)
		out = append(out, *cp)
	}
	return out, nil
}

func (m *MemStore) ownedSession(userID, sessionID uuid.UUID) (*Session, error) {
	if m.sessionOwner[sessionID] != userID {
		return nil, ErrNotFound
	}
	s, ok := m.sessions[sessionID]
	if !ok {
		return nil, ErrNotFound
	}
	return s, nil
}

func cloneSession(s *Session) *Session {
	cp := *s
	cp.Exercises = make([]Exercise, len(s.Exercises))
	for i, ex := range s.Exercises {
		exCp := ex
		exCp.Sets = append([]Set{}, ex.Sets...)
		cp.Exercises[i] = exCp
	}
	return &cp
}

func trimName(name string) string {
	return strings.TrimSpace(name)
}
