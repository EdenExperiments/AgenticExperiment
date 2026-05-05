package auth

import (
	"crypto"
	"crypto/rand"
	"crypto/rsa"
	"encoding/base64"
	"encoding/binary"
	"encoding/json"
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
func makeTestCache(t *testing.T, kid string, key *rsa.PrivateKey, issuer string) *jwksCache {
	t.Helper()
	c := &jwksCache{
		keys:      map[string]crypto.PublicKey{kid: &key.PublicKey},
		fetchedAt: time.Now(),
		ttl:       time.Hour,
		issuer:    issuer,
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

// serveJWKS starts an httptest server that returns a JWKS containing the given key.
func serveJWKS(t *testing.T, kid string, key *rsa.PublicKey) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		nBytes := key.N.Bytes()
		eBytes := make([]byte, 4)
		binary.BigEndian.PutUint32(eBytes, uint32(key.E))
		// Trim leading zeros from e
		for len(eBytes) > 1 && eBytes[0] == 0 {
			eBytes = eBytes[1:]
		}
		resp := map[string]interface{}{
			"keys": []map[string]interface{}{
				{
					"kid": kid,
					"kty": "RSA",
					"n":   base64.RawURLEncoding.EncodeToString(nBytes),
					"e":   base64.RawURLEncoding.EncodeToString(eBytes),
				},
			},
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(resp) //nolint:errcheck
	}))
}

// serveEmptyJWKS starts an httptest server that returns an empty JWKS.
func serveEmptyJWKS(t *testing.T) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"keys":[]}`)) //nolint:errcheck
	}))
}

const testIssuer = "https://test.supabase.co/auth/v1"

func TestJWTMiddleware_ValidToken(t *testing.T) {
	key := generateTestKey(t)
	kid := "test-key-1"
	cache := makeTestCache(t, kid, key, testIssuer)

	userID := "550e8400-e29b-41d4-a716-446655440000"
	tokenStr := signTestJWT(t, key, kid, jwt.MapClaims{
		"sub": userID,
		"exp": time.Now().Add(time.Hour).Unix(),
		"iat": time.Now().Unix(),
		"iss": testIssuer,
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
	cache := makeTestCache(t, "kid1", key, testIssuer)

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
	cache := makeTestCache(t, kid, key, testIssuer)

	tokenStr := signTestJWT(t, key, kid, jwt.MapClaims{
		"sub": "550e8400-e29b-41d4-a716-446655440001",
		"exp": time.Now().Add(-time.Hour).Unix(), // expired
		"iat": time.Now().Add(-2 * time.Hour).Unix(),
		"iss": testIssuer,
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
	cache := makeTestCache(t, kid, key, testIssuer)

	tokenStr := signTestJWT(t, key, kid, jwt.MapClaims{
		"sub": "550e8400-e29b-41d4-a716-446655440002",
		"exp": time.Now().Add(time.Hour).Unix(),
		"iat": time.Now().Unix(),
		"iss": testIssuer,
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

func TestJWTMiddleware_UnknownKidRefetchSuccess(t *testing.T) {
	key := generateTestKey(t)
	kid := "refetch-key"

	// Start a mock JWKS server that serves the correct key
	srv := serveJWKS(t, kid, &key.PublicKey)
	defer srv.Close()

	// Cache starts empty (simulates stale/cold cache)
	cache := &jwksCache{
		keys:      make(map[string]crypto.PublicKey),
		fetchedAt: time.Now().Add(-2 * time.Hour), // expired TTL
		ttl:       time.Hour,
		jwksURL:   srv.URL,
		issuer:    testIssuer,
	}

	tokenStr := signTestJWT(t, key, kid, jwt.MapClaims{
		"sub": "550e8400-e29b-41d4-a716-446655440003",
		"exp": time.Now().Add(time.Hour).Unix(),
		"iat": time.Now().Unix(),
		"iss": testIssuer,
	})

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Authorization", "Bearer "+tokenStr)
	w := httptest.NewRecorder()

	called := false
	cache.middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		w.WriteHeader(http.StatusOK)
	})).ServeHTTP(w, req)

	if !called {
		t.Error("next handler should be called after successful JWKS re-fetch")
	}
	if w.Code != http.StatusOK {
		t.Errorf("status = %d, want 200", w.Code)
	}
}

func TestJWTMiddleware_UnknownKidRefetchStillMissing(t *testing.T) {
	key := generateTestKey(t)
	kid := "missing-key"

	// Mock server returns empty JWKS (key never found)
	srv := serveEmptyJWKS(t)
	defer srv.Close()

	cache := &jwksCache{
		keys:      make(map[string]crypto.PublicKey),
		fetchedAt: time.Now().Add(-2 * time.Hour),
		ttl:       time.Hour,
		jwksURL:   srv.URL,
		issuer:    testIssuer,
	}

	tokenStr := signTestJWT(t, key, kid, jwt.MapClaims{
		"sub": "550e8400-e29b-41d4-a716-446655440004",
		"exp": time.Now().Add(time.Hour).Unix(),
		"iat": time.Now().Unix(),
		"iss": testIssuer,
	})

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Authorization", "Bearer "+tokenStr)
	w := httptest.NewRecorder()

	cache.middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Error("next handler should not be called when kid not found after re-fetch")
	})).ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want 401", w.Code)
	}
}

func TestJWTMiddleware_WrongIssuer(t *testing.T) {
	key := generateTestKey(t)
	kid := "test-key-issuer"
	testIssuer := "https://test.supabase.co/auth/v1"
	cache := makeTestCache(t, kid, key, testIssuer)

	// Token signed with correct key but wrong issuer
	tokenStr := signTestJWT(t, key, kid, jwt.MapClaims{
		"sub": "550e8400-e29b-41d4-a716-446655440005",
		"exp": time.Now().Add(time.Hour).Unix(),
		"iat": time.Now().Unix(),
		"iss": "https://attacker.supabase.co/auth/v1", // wrong issuer
	})

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Authorization", "Bearer "+tokenStr)
	w := httptest.NewRecorder()

	cache.middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Error("next handler should not be called with wrong issuer")
	})).ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want 401", w.Code)
	}
}

// serveSlowJWKS starts an httptest server that delays its response by the given duration.
func serveSlowJWKS(t *testing.T, delay time.Duration) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(delay)
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"keys":[]}`)) //nolint:errcheck
	}))
}

// TestFetch_Timeout verifies that fetch() returns an error when the JWKS endpoint
// takes longer than the configured HTTP client timeout.
func TestFetch_Timeout(t *testing.T) {
	srv := serveSlowJWKS(t, 2*time.Second)
	defer srv.Close()

	cache := &jwksCache{
		keys:    make(map[string]crypto.PublicKey),
		jwksURL: srv.URL,
		issuer:  testIssuer,
		// Deliberately short timeout to trigger deadline exceeded quickly.
		httpClient: &http.Client{Timeout: 50 * time.Millisecond},
	}

	err := cache.fetch()
	if err == nil {
		t.Fatal("expected fetch() to return an error on timeout, got nil")
	}
}

// TestFetch_NonOKStatus verifies that fetch() returns an error on non-200 responses.
func TestFetch_NonOKStatus(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "service unavailable", http.StatusServiceUnavailable)
	}))
	defer srv.Close()

	cache := &jwksCache{
		keys:       make(map[string]crypto.PublicKey),
		jwksURL:    srv.URL,
		issuer:     testIssuer,
		httpClient: &http.Client{Timeout: 5 * time.Second},
	}

	err := cache.fetch()
	if err == nil {
		t.Fatal("expected fetch() to return an error on non-200 status, got nil")
	}
}

// TestFetch_MalformedJSON verifies that fetch() returns an error when the JWKS body
// cannot be decoded.
func TestFetch_MalformedJSON(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`not valid json`)) //nolint:errcheck
	}))
	defer srv.Close()

	cache := &jwksCache{
		keys:       make(map[string]crypto.PublicKey),
		jwksURL:    srv.URL,
		issuer:     testIssuer,
		httpClient: &http.Client{Timeout: 5 * time.Second},
	}

	err := cache.fetch()
	if err == nil {
		t.Fatal("expected fetch() to return an error on malformed JSON, got nil")
	}
}
