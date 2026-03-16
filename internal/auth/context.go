package auth

import (
	"context"

	"github.com/google/uuid"
)

// UserIDFromContext extracts the authenticated user's UUID from the request context.
// Returns (uuid, true) if set by the JWT middleware, or (uuid.Nil, false) otherwise.
// All handlers that require authentication should call this and check the bool.
func UserIDFromContext(ctx context.Context) (uuid.UUID, bool) {
	sub, ok := ctx.Value(userIDKey).(string)
	if !ok || sub == "" {
		return uuid.Nil, false
	}
	id, err := uuid.Parse(sub)
	if err != nil {
		return uuid.Nil, false
	}
	return id, true
}

// EmailFromContext extracts the authenticated user's email from the request context.
// Returns the email string stored by the JWT middleware, or an empty string if absent.
func EmailFromContext(ctx context.Context) string {
	email, _ := ctx.Value(emailKey).(string)
	return email
}

// WithUserID returns a copy of ctx with the user ID set.
// Used in tests to inject authentication state without a real JWT.
// Must store the ID as a string to match the type assertion in UserIDFromContext.
func WithUserID(ctx context.Context, id uuid.UUID) context.Context {
	return context.WithValue(ctx, userIDKey, id.String())
}
