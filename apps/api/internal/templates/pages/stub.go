// Package pages provides stub page components.
// These will be replaced when handlers are migrated to JSON in Task 5.
package pages

import (
	"context"
	"io"

	"github.com/a-h/templ"
	"github.com/meden/rpgtracker/internal/keys"
	"github.com/meden/rpgtracker/internal/skills"
	"github.com/meden/rpgtracker/internal/users"
)

// nopComponent is a templ.Component that renders nothing.
type nopComponent struct{}

func (nopComponent) Render(_ context.Context, _ io.Writer) error { return nil }

func Login(errMsg, successMsg string) templ.Component           { return nopComponent{} }
func Register(errMsg string) templ.Component                    { return nopComponent{} }
func PasswordChange(errMsg, successMsg string) templ.Component  { return nopComponent{} }
func PasswordChangeContent(errMsg, successMsg string) templ.Component { return nopComponent{} }
func Account(u *users.User, msg string) templ.Component         { return nopComponent{} }
func AccountContent(u *users.User, msg string) templ.Component  { return nopComponent{} }
func APIKey(status *keys.KeyStatus, msg string) templ.Component { return nopComponent{} }
func APIKeyContent(status *keys.KeyStatus, msg string) templ.Component { return nopComponent{} }
func PresetBrowse(allCats []skills.Category, cats []skills.CategoryWithPresets, filter skills.PresetFilter) templ.Component {
	return nopComponent{}
}
func PresetBrowseContent(allCats []skills.Category, cats []skills.CategoryWithPresets, filter skills.PresetFilter) templ.Component {
	return nopComponent{}
}
