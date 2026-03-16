package server

import (
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/meden/rpgtracker/internal/config"
	"github.com/meden/rpgtracker/internal/templates"
	"github.com/meden/rpgtracker/internal/templates/pages"
)

// Server wraps the standard http.Server and holds application dependencies.
type Server struct {
	httpServer *http.Server
	cfg        *config.Config
}

// NewServer creates a new Server wired with a chi router and basic routes.
func NewServer(cfg *config.Config, authMiddleware func(http.Handler) http.Handler) *Server {
	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	// Public routes
	r.Get("/", func(w http.ResponseWriter, r *http.Request) {
		if err := templates.Render(w, r, http.StatusOK, pages.Home()); err != nil {
			http.Error(w, "render error", http.StatusInternalServerError)
		}
	})

	// Protected routes
	r.Group(func(r chi.Router) {
		r.Use(authMiddleware)
		r.Get("/dashboard", func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte("dashboard"))
		})
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
