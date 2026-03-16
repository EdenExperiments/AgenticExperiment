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

// RenderPage renders the full page for direct requests, or content-only for HTMX requests.
// fullPage is the component with the Shell wrapper; content is the inner fragment.
func RenderPage(w http.ResponseWriter, r *http.Request, status int, fullPage templ.Component, content templ.Component) error {
	if r.Header.Get("HX-Request") == "true" {
		return Render(w, r, status, content)
	}
	return Render(w, r, status, fullPage)
}
