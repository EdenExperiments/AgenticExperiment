package templates

import (
	"net/http"

	"github.com/a-h/templ"
)

// Render writes a templ.Component to the ResponseWriter with the correct
// Content-Type and status code. All handlers should use this instead of
// calling component.Render directly.
func Render(w http.ResponseWriter, r *http.Request, status int, component templ.Component) error {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(status)
	return component.Render(r.Context(), w)
}
