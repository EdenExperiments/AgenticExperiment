// Package partials provides stub partial components.
// These will be replaced when handlers are migrated to JSON in Task 5.
package partials

import (
	"context"
	"io"

	"github.com/a-h/templ"
	"github.com/meden/rpgtracker/internal/skills"
)

// nopComponent is a templ.Component that renders nothing.
type nopComponent struct{}

func (nopComponent) Render(_ context.Context, _ io.Writer) error { return nil }

func PresetResults(cats []skills.CategoryWithPresets, filter skills.PresetFilter) templ.Component {
	return nopComponent{}
}
