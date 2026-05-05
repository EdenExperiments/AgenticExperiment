package database

import (
	"log"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/meden/rpgtracker/internal/api"
	"github.com/meden/rpgtracker/internal/auth"
)

// TxMiddleware begins one transaction per request, sets SET LOCAL app.user_id from the
// JWT-verified user id, injects the tx as Querier into context, then commits or rolls back.
// It must run after JWT middleware on routes that require auth.
func TxMiddleware(pool *pgxpool.Pool) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userID, ok := auth.UserIDFromContext(r.Context())
			if !ok {
				api.RespondError(w, http.StatusUnauthorized, "unauthorized")
				return
			}

			tx, err := pool.Begin(r.Context())
			if err != nil {
				log.Printf("database: begin tx: %v", err)
				api.RespondError(w, http.StatusInternalServerError, "database error")
				return
			}

			defer func() {
				if p := recover(); p != nil {
					_ = tx.Rollback(r.Context())
					panic(p)
				}
			}()

			if _, err := tx.Exec(r.Context(), `SET LOCAL app.user_id = $1`, userID.String()); err != nil {
				_ = tx.Rollback(r.Context())
				log.Printf("database: SET LOCAL app.user_id: %v", err)
				api.RespondError(w, http.StatusInternalServerError, "database error")
				return
			}

			ctx := WithQuerier(r.Context(), tx)
			rec := newStatusRecorder(w)

			next.ServeHTTP(rec, r.WithContext(ctx))

			if rec.status >= 500 {
				if rbErr := tx.Rollback(r.Context()); rbErr != nil {
					log.Printf("database: rollback after %d: %v", rec.status, rbErr)
				}
				return
			}
			if err := tx.Commit(r.Context()); err != nil {
				log.Printf("database: commit: %v", err)
				if rbErr := tx.Rollback(r.Context()); rbErr != nil {
					log.Printf("database: rollback after commit failure: %v", rbErr)
				}
				if !rec.wroteHeader {
					api.RespondError(w, http.StatusInternalServerError, "database error")
				}
			}
		})
	}
}

type statusRecorder struct {
	http.ResponseWriter
	status       int
	wroteHeader  bool
}

func newStatusRecorder(w http.ResponseWriter) *statusRecorder {
	return &statusRecorder{ResponseWriter: w, status: http.StatusOK}
}

func (s *statusRecorder) WriteHeader(code int) {
	if s.wroteHeader {
		return
	}
	s.wroteHeader = true
	s.status = code
	s.ResponseWriter.WriteHeader(code)
}

func (s *statusRecorder) Write(b []byte) (int, error) {
	if !s.wroteHeader {
		s.wroteHeader = true
	}
	return s.ResponseWriter.Write(b)
}
