// Package templates provides stub render helpers.
// These will be replaced when handlers are migrated to JSON in Task 5.
package templates

import (
	"net/http"

	"github.com/a-h/templ"
)

// Render writes a single templ component to the response writer.
func Render(w http.ResponseWriter, r *http.Request, status int, component templ.Component) error {
	w.WriteHeader(status)
	return component.Render(r.Context(), w)
}

// RenderPage writes a full-page or content-only component depending on the
// HX-Request header. This stub always renders the full component.
func RenderPage(w http.ResponseWriter, r *http.Request, status int, full, content templ.Component) error {
	w.WriteHeader(status)
	if r.Header.Get("HX-Request") != "" {
		return content.Render(r.Context(), w)
	}
	return full.Render(r.Context(), w)
}
