package keys

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/meden/rpgtracker/internal/crypto"
	"github.com/meden/rpgtracker/internal/database"
)

// ErrInvalidKeyFormat is returned by SaveKey when the provided key fails format validation.
var ErrInvalidKeyFormat = errors.New("invalid key format")

// zeroBytes overwrites a byte slice with zeroes to clear sensitive data from memory.
func zeroBytes(b []byte) {
	for i := range b {
		b[i] = 0
	}
}

// KeyStatus holds the status of a user's stored Claude API key.
type KeyStatus struct {
	Exists      bool
	Hint        string
	ValidatedAt *time.Time
}

// SaveKey validates, encrypts, and upserts a Claude API key for the given user.
// Returns an error with message "invalid key format" if the key fails format validation.
func SaveKey(ctx context.Context, db database.Querier, masterKey []byte, userID uuid.UUID, plaintextKey string) error {
	if !crypto.ValidateClaudeKeyFormat(plaintextKey) {
		return ErrInvalidKeyFormat
	}

	dek, err := crypto.GenerateDEK()
	if err != nil {
		return err
	}
	defer zeroBytes(dek)

	encryptedDEK, err := crypto.Encrypt(masterKey, dek)
	if err != nil {
		return err
	}

	encryptedKey, err := crypto.Encrypt(dek, []byte(plaintextKey))
	if err != nil {
		return err
	}

	hint := plaintextKey[len(plaintextKey)-4:]

	const q = `
INSERT INTO public.user_ai_keys (user_id, encrypted_dek, encrypted_key, key_hint, validated_at)
VALUES ($1, $2, $3, $4, now())
ON CONFLICT ON CONSTRAINT uq_user_ai_keys_user
DO UPDATE SET encrypted_dek=$2, encrypted_key=$3, key_hint=$4, validated_at=now(), updated_at=now()`

	_, err = db.Exec(ctx, q, userID, encryptedDEK, encryptedKey, hint)
	return err
}

// DeleteKey removes the stored API key for the given user.
func DeleteKey(ctx context.Context, db database.Querier, userID uuid.UUID) error {
	_, err := db.Exec(ctx, `DELETE FROM public.user_ai_keys WHERE user_id = $1`, userID)
	return err
}

// GetDecryptedKey retrieves and decrypts the Claude API key for the given user.
// The plaintext key is never logged.
func GetDecryptedKey(ctx context.Context, db database.Querier, masterKey []byte, userID uuid.UUID) (string, error) {
	var encDEK, encKey []byte
	err := db.QueryRow(ctx,
		`SELECT encrypted_dek, encrypted_key FROM public.user_ai_keys WHERE user_id = $1`,
		userID,
	).Scan(&encDEK, &encKey)
	if err != nil {
		return "", err
	}

	dek, err := crypto.Decrypt(masterKey, encDEK)
	if err != nil {
		return "", err
	}
	defer zeroBytes(dek)

	plaintext, err := crypto.Decrypt(dek, encKey)
	if err != nil {
		return "", err
	}
	defer zeroBytes(plaintext)

	return string(plaintext), nil
}

// GetKeyStatus returns the current key status for a user.
// Returns &KeyStatus{Exists: false} when no row is found.
func GetKeyStatus(ctx context.Context, db database.Querier, userID uuid.UUID) (*KeyStatus, error) {
	var hint pgtype.Text
	var validatedAt pgtype.Timestamptz

	err := db.QueryRow(ctx,
		`SELECT key_hint, validated_at FROM public.user_ai_keys WHERE user_id = $1`,
		userID,
	).Scan(&hint, &validatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return &KeyStatus{Exists: false}, nil
		}
		return nil, err
	}

	status := &KeyStatus{Exists: true}
	if hint.Valid {
		status.Hint = hint.String
	}
	if validatedAt.Valid {
		t := validatedAt.Time
		status.ValidatedAt = &t
	}
	return status, nil
}
