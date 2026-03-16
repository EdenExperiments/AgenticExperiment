package server

import (
	"errors"
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/meden/rpgtracker/internal/auth"
	"github.com/meden/rpgtracker/internal/config"
	"github.com/meden/rpgtracker/internal/handlers"
	"github.com/meden/rpgtracker/internal/templates"
	"github.com/meden/rpgtracker/internal/templates/pages"
	"github.com/meden/rpgtracker/internal/templates/partials"
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
	r.Use(panicRecoveryMiddleware)

	r.NotFound(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.WriteHeader(http.StatusNotFound)
		if r.Header.Get("HX-Request") == "true" {
			_ = partials.ErrorPartial("Page not found", "The page you're looking for doesn't exist.", "").Render(r.Context(), w)
		} else {
			_ = pages.Error404().Render(r.Context(), w)
		}
	})

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
			if err := templates.RenderPage(w, r, http.StatusOK, pages.Dashboard(), pages.DashboardContent()); err != nil {
				http.Error(w, "render error", http.StatusInternalServerError)
			}
		})

		r.Get("/skills", func(w http.ResponseWriter, r *http.Request) {
			if err := templates.RenderPage(w, r, http.StatusOK, pages.Dashboard(), pages.DashboardContent()); err != nil {
				http.Error(w, "render error", http.StatusInternalServerError)
			}
		})

		r.Get("/nutri", func(w http.ResponseWriter, r *http.Request) {
			if err := templates.RenderPage(w, r, http.StatusOK, pages.NutriComing(), pages.NutriContent()); err != nil {
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

// panicRecoveryMiddleware recovers from panics, logs them, and returns an
// appropriate error response. HTMX requests receive an error partial fragment;
// full-page requests receive the Error500 page.
func panicRecoveryMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rec := recover(); rec != nil {
				log.Printf("panic recovered: %v", rec)
				w.Header().Set("Content-Type", "text/html; charset=utf-8")
				w.WriteHeader(http.StatusInternalServerError)
				if r.Header.Get("HX-Request") == "true" {
					_ = partials.ErrorPartial("Something went wrong", "An unexpected error occurred.", "").Render(r.Context(), w)
				} else {
					_ = pages.Error500().Render(r.Context(), w)
				}
			}
		}()
		next.ServeHTTP(w, r)
	})
}
