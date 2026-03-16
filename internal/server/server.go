package server

import (
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/meden/rpgtracker/internal/auth"
	"github.com/meden/rpgtracker/internal/config"
	"github.com/meden/rpgtracker/internal/handlers"
	"github.com/meden/rpgtracker/internal/templates"
	"github.com/meden/rpgtracker/internal/templates/pages"
)

// Server wraps the standard http.Server and holds application dependencies.
type Server struct {
	httpServer *http.Server
	cfg        *config.Config
}

// NewServer creates a new Server wired with a chi router and basic routes.
func NewServer(cfg *config.Config, sessionMiddleware func(http.Handler) http.Handler, db *pgxpool.Pool) *Server {
	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	authHandler := auth.NewAuthHandler(cfg.SupabaseProjectURL, cfg.SupabaseAnonKey)

	// Public routes
	r.Get("/", func(w http.ResponseWriter, r *http.Request) {
		if err := templates.Render(w, r, http.StatusOK, pages.Home()); err != nil {
			http.Error(w, "render error", http.StatusInternalServerError)
		}
	})
	r.Get("/login", authHandler.HandleGetLogin)
	r.Post("/login", authHandler.HandlePostLogin)
	r.Get("/register", authHandler.HandleGetRegister)
	r.Post("/register", authHandler.HandlePostRegister)

	// Protected routes
	r.Group(func(r chi.Router) {
		r.Use(sessionMiddleware)

		r.Get("/dashboard", func(w http.ResponseWriter, r *http.Request) {
			if err := templates.Render(w, r, http.StatusOK, pages.Dashboard()); err != nil {
				http.Error(w, "render error", http.StatusInternalServerError)
			}
		})

		r.Get("/skills", func(w http.ResponseWriter, r *http.Request) {
			http.Redirect(w, r, "/dashboard", http.StatusFound)
		})

		r.Get("/nutri", func(w http.ResponseWriter, r *http.Request) {
			if err := templates.Render(w, r, http.StatusOK, pages.NutriComing()); err != nil {
				http.Error(w, "render error", http.StatusInternalServerError)
			}
		})

		userHandler := handlers.NewUserHandler(db)
		r.Get("/account", userHandler.HandleGetAccount)
		r.Post("/account", userHandler.HandlePostAccount)

		r.Post("/auth/signout", authHandler.HandlePostSignout)
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
