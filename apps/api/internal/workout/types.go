package workout

import (
	"errors"
	"time"

	"github.com/google/uuid"
)

const (
	StatusInProgress = "in_progress"
	StatusCompleted  = "completed"
	StatusAbandoned  = "abandoned"
)

var (
	ErrNotFound = errors.New("not found")
	ErrConflict = errors.New("conflict")
)

type Set struct {
	ID         uuid.UUID `json:"id"`
	ExerciseID uuid.UUID `json:"exercise_id"`
	Reps       int       `json:"reps"`
	LoadKg     *float64  `json:"load_kg"`
	RPE        *int      `json:"rpe"`
	Position   int       `json:"position"`
}

type Exercise struct {
	ID        uuid.UUID `json:"id"`
	SessionID uuid.UUID `json:"session_id"`
	Name      string    `json:"name"`
	Position  int       `json:"position"`
	Sets      []Set     `json:"sets"`
}

type Session struct {
	ID        uuid.UUID  `json:"id"`
	StartedAt time.Time  `json:"started_at"`
	EndedAt   *time.Time `json:"ended_at"`
	Status    string     `json:"status"`
	VolumeKg  float64    `json:"volume_kg"`
	Exercises []Exercise `json:"exercises,omitempty"`
	CreatedAt time.Time  `json:"created_at"`
}

type VolumePoint struct {
	Date     string   `json:"date"`
	VolumeKg *float64 `json:"volume_kg"`
}

func VolumeKg(sets []Set) float64 {
	var total float64
	for _, s := range sets {
		if s.LoadKg != nil {
			total += float64(s.Reps) * *s.LoadKg
		}
	}
	return total
}

func sessionVolume(sess Session) float64 {
	var sets []Set
	for _, ex := range sess.Exercises {
		sets = append(sets, ex.Sets...)
	}
	return VolumeKg(sets)
}
