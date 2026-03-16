package auth

import (
	"crypto/rand"
	"crypto/rsa"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// generateTestKey creates a small RSA key for testing (2048 bits).
func generateTestKey(t *testing.T) *rsa.PrivateKey {
	t.Helper()
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatalf("generate RSA key: %v", err)
	}
	return key
}

// makeTestCache creates a jwksCache pre-loaded with the given key.
func makeTestCache(t *testing.T, kid string, key *rsa.PrivateKey) *jwksCache {
	t.Helper()
	c := &jwksCache{
		keys:      map[string]*rsa.PublicKey{kid: &key.PublicKey},
		fetchedAt: time.Now(),
		ttl:       time.Hour,
	}
	return c
}

// signTestJWT creates a signed JWT with the given claims and key.
func signTestJWT(t *testing.T, key *rsa.PrivateKey, kid string, claims jwt.MapClaims) string {
	t.Helper()
	token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	token.Header["kid"] = kid
	str, err := token.SignedString(key)
	if err != nil {
		t.Fatalf("sign JWT: %v", err)
	}
	return str
}

func TestJWTMiddleware_ValidToken(t *testing.T) {
	key := generateTestKey(t)
	kid := "test-key-1"
	cache := makeTestCache(t, kid, key)

	userID := "550e8400-e29b-41d4-a716-446655440000"
	tokenStr := signTestJWT(t, key, kid, jwt.MapClaims{
		"sub": userID,
		"exp": time.Now().Add(time.Hour).Unix(),
		"iat": time.Now().Unix(),
	})

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Authorization", "Bearer "+tokenStr)
	w := httptest.NewRecorder()

	called := false
	cache.middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		id, ok := UserIDFromContext(r.Context())
		if !ok {
			t.Error("UserIDFromContext returned false for valid token")
		}
		if id.String() != userID {
			t.Errorf("UserIDFromContext = %s, want %s", id.String(), userID)
		}
		w.WriteHeader(http.StatusOK)
	})).ServeHTTP(w, req)

	if !called {
		t.Error("next handler was not called for valid token")
	}
	if w.Code != http.StatusOK {
		t.Errorf("status = %d, want 200", w.Code)
	}
}

func TestJWTMiddleware_NoToken(t *testing.T) {
	key := generateTestKey(t)
	cache := makeTestCache(t, "kid1", key)

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	w := httptest.NewRecorder()

	cache.middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Error("next handler should not be called when no token present")
	})).ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want 401", w.Code)
	}
}

func TestJWTMiddleware_ExpiredToken(t *testing.T) {
	key := generateTestKey(t)
	kid := "test-key-exp"
	cache := makeTestCache(t, kid, key)

	tokenStr := signTestJWT(t, key, kid, jwt.MapClaims{
		"sub": "550e8400-e29b-41d4-a716-446655440001",
		"exp": time.Now().Add(-time.Hour).Unix(), // expired
		"iat": time.Now().Add(-2 * time.Hour).Unix(),
	})

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Authorization", "Bearer "+tokenStr)
	w := httptest.NewRecorder()

	cache.middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Error("next handler should not be called for expired token")
	})).ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want 401", w.Code)
	}
}

func TestJWTMiddleware_TamperedToken(t *testing.T) {
	key := generateTestKey(t)
	kid := "test-key-tamper"
	cache := makeTestCache(t, kid, key)

	tokenStr := signTestJWT(t, key, kid, jwt.MapClaims{
		"sub": "550e8400-e29b-41d4-a716-446655440002",
		"exp": time.Now().Add(time.Hour).Unix(),
		"iat": time.Now().Unix(),
	})
	// Tamper: modify a character in the middle of the payload segment so the
	// signature covers different bytes and cannot match.
	parts := strings.SplitN(tokenStr, ".", 3)
	payload := []byte(parts[1])
	// Flip a byte in the middle of the payload to ensure the decoded content changes.
	mid := len(payload) / 2
	if payload[mid] == 'A' {
		payload[mid] = 'B'
	} else {
		payload[mid] = 'A'
	}
	tampered := parts[0] + "." + string(payload) + "." + parts[2]

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Authorization", "Bearer "+tampered)
	w := httptest.NewRecorder()

	cache.middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Error("next handler should not be called for tampered token")
	})).ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want 401", w.Code)
	}
}
