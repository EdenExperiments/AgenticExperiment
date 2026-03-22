package skills

import (
	"time"

	"github.com/google/uuid"
)

// TrainingSession is one recorded training session row.
type TrainingSession struct {
	ID               uuid.UUID  `json:"id"`
	SkillID          uuid.UUID  `json:"skill_id"`
	UserID           uuid.UUID  `json:"user_id"`
	SessionType      string     `json:"session_type"`
	PlannedDuration  int        `json:"planned_duration_sec"`
	ActualDuration   int        `json:"actual_duration_sec"`
	Status           string     `json:"status"` // completed | partial | abandoned
	CompletionRatio  float64    `json:"completion_ratio"`
	BonusPercentage  int        `json:"bonus_percentage"`
	BonusXP                    int       `json:"bonus_xp"`
	PomodoroWorkSec            int       `json:"pomodoro_work_sec"`
	PomodoroBreakSec           int       `json:"pomodoro_break_sec"`
	PomodoroIntervalsCompleted int       `json:"pomodoro_intervals_completed"`
	PomodoroIntervalsPlanned   int       `json:"pomodoro_intervals_planned"`
	CreatedAt                  time.Time `json:"created_at"`
}

// CreateSessionRequest is the input to SessionStore.CreateSession.
type CreateSessionRequest struct {
	SessionType     string
	PlannedDuration int
	ActualDuration  int
	Status          string
	BaseXP                     int
	LogNote                    string
	PomodoroWorkSec            int
	PomodoroBreakSec           int
	PomodoroIntervalsCompleted int
	PomodoroIntervalsPlanned   int
}

// CreateSessionResult is the output from SessionStore.CreateSession.
type CreateSessionResult struct {
	Session  *TrainingSession
	XPResult *LogXPResult
	Streak   *StreakResult
}

// DailyXP is one data point for the XP chart endpoint.
type DailyXP struct {
	Date    time.Time `json:"date"`
	XPTotal int       `json:"xp_total"`
}

// GateSubmission is one gate_submissions row.
type GateSubmission struct {
	ID            uuid.UUID  `json:"id"`
	GateID        uuid.UUID  `json:"gate_id"`
	UserID        uuid.UUID  `json:"user_id"`
	Path          string     `json:"path"` // ai | self_report
	EvidenceWhat  string     `json:"evidence_what"`
	EvidenceHow   string     `json:"evidence_how"`
	EvidenceFeeling string   `json:"evidence_feeling"`
	Verdict       string     `json:"verdict"` // approved | rejected | self_reported
	AttemptNumber int        `json:"attempt_number"`
	AIFeedback    string     `json:"ai_feedback,omitempty"`
	NextRetryAt   *time.Time `json:"next_retry_at,omitempty"`
	SubmittedAt   time.Time  `json:"submitted_at"`
}

// CreateGateSubmissionRequest is the input to GateStore.InsertSubmission.
type CreateGateSubmissionRequest struct {
	GateID          uuid.UUID
	UserID          uuid.UUID
	Path            string
	EvidenceWhat    string
	EvidenceHow     string
	EvidenceFeeling string
	Verdict         string
	AttemptNumber   int
	AIFeedback      string
	NextRetryAt     *time.Time
}
