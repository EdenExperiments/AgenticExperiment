package auth

import (
	"context"
	"crypto/rsa"
	"encoding/base64"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/sync/singleflight"
)

// contextKey is an unexported type for context keys in this package.
type contextKey int

const (
	userIDKey contextKey = iota
	emailKey
)

// jwksCache caches the fetched JWKS keys with a TTL.
// The singleflight group ensures that concurrent re-fetch triggers (TTL expiry
// or R-001 unknown-kid) collapse into a single in-flight HTTP request rather
// than stampeding the Supabase JWKS endpoint.
type jwksCache struct {
	mu        sync.RWMutex
	keys      map[string]*rsa.PublicKey // kid → public key
	fetchedAt time.Time
	ttl       time.Duration
	jwksURL   string
	issuer    string
	sf        singleflight.Group
}

// NewJWTMiddleware creates a chi-compatible middleware that validates Supabase JWTs.
// It fetches the JWKS at creation time and caches them with a 1-hour TTL.
func NewJWTMiddleware(supabaseProjectURL string) (func(http.Handler) http.Handler, error) {
	cache := &jwksCache{
		keys:    make(map[string]*rsa.PublicKey),
		ttl:     time.Hour,
		jwksURL: supabaseProjectURL + "/auth/v1/.well-known/jwks.json",
		issuer:  supabaseProjectURL + "/auth/v1",
	}
	if err := cache.fetch(); err != nil {
		return nil, fmt.Errorf("auth: initial JWKS fetch failed: %w", err)
	}
	return cache.middleware, nil
}

// middleware is the actual http.Handler middleware function.
func (c *jwksCache) middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		tokenStr := extractBearerToken(r)
		if tokenStr == "" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		userID, email, err := c.validateToken(tokenStr)
		if err != nil {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		ctx := context.WithValue(r.Context(), userIDKey, userID)
		ctx = context.WithValue(ctx, emailKey, email)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// validateToken parses and validates the JWT, returning the sub claim as a string UUID
// and the email claim (which may be empty if absent from the token).
// On unknown key ID, re-fetches JWKS once before rejecting (R-001 mitigation).
func (c *jwksCache) validateToken(tokenStr string) (string, string, error) {
	keyFunc := func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		kid, _ := token.Header["kid"].(string)
		key := c.getKey(kid)
		if key == nil {
			// R-001: unknown kid — re-fetch once, deduplicated via singleflight
			if _, err, _ := c.sf.Do("fetch", func() (interface{}, error) {
				return nil, c.fetch()
			}); err != nil {
				return nil, err
			}
			key = c.getKey(kid)
		}
		if key == nil {
			return nil, fmt.Errorf("unknown key id: %s", kid)
		}
		return key, nil
	}

	token, err := jwt.Parse(tokenStr, keyFunc,
		jwt.WithExpirationRequired(),
		jwt.WithIssuedAt(),
		jwt.WithIssuer(c.issuer),
	)
	if err != nil {
		return "", "", err
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || !token.Valid {
		return "", "", fmt.Errorf("invalid claims")
	}

	sub, ok := claims["sub"].(string)
	if !ok || sub == "" {
		return "", "", fmt.Errorf("missing sub claim")
	}

	email, _ := claims["email"].(string)

	return sub, email, nil
}

// getKey returns the cached RSA public key for the given kid, or nil if not found.
func (c *jwksCache) getKey(kid string) *rsa.PublicKey {
	c.mu.RLock()
	defer c.mu.RUnlock()
	if time.Since(c.fetchedAt) > c.ttl {
		return nil // treat stale cache as miss — will trigger re-fetch
	}
	return c.keys[kid]
}

// fetch retrieves the JWKS from Supabase and updates the cache.
func (c *jwksCache) fetch() error {
	resp, err := http.Get(c.jwksURL) //nolint:noctx
	if err != nil {
		return fmt.Errorf("fetch JWKS: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("fetch JWKS: unexpected status %d", resp.StatusCode)
	}

	var jwks struct {
		Keys []struct {
			Kid string `json:"kid"`
			Kty string `json:"kty"`
			N   string `json:"n"`
			E   string `json:"e"`
		} `json:"keys"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&jwks); err != nil {
		return fmt.Errorf("decode JWKS: %w", err)
	}

	keys := make(map[string]*rsa.PublicKey, len(jwks.Keys))
	for _, k := range jwks.Keys {
		if k.Kty != "RSA" {
			continue
		}
		pub, err := jwkToRSA(k.N, k.E)
		if err != nil {
			return fmt.Errorf("parse JWK key %s: %w", k.Kid, err)
		}
		keys[k.Kid] = pub
	}

	c.mu.Lock()
	c.keys = keys
	c.fetchedAt = time.Now()
	c.mu.Unlock()
	return nil
}

// jwkToRSA converts JWK n and e base64url components to an *rsa.PublicKey.
func jwkToRSA(nB64, eB64 string) (*rsa.PublicKey, error) {
	nBytes, err := base64.RawURLEncoding.DecodeString(nB64)
	if err != nil {
		return nil, fmt.Errorf("decode n: %w", err)
	}
	eBytes, err := base64.RawURLEncoding.DecodeString(eB64)
	if err != nil {
		return nil, fmt.Errorf("decode e: %w", err)
	}
	// Pad eBytes to 4 bytes for binary.BigEndian.Uint32
	for len(eBytes) < 4 {
		eBytes = append([]byte{0}, eBytes...)
	}
	return &rsa.PublicKey{
		N: new(big.Int).SetBytes(nBytes),
		E: int(binary.BigEndian.Uint32(eBytes[len(eBytes)-4:])),
	}, nil
}

// extractBearerToken extracts the token string from "Authorization: Bearer <token>".
func extractBearerToken(r *http.Request) string {
	h := r.Header.Get("Authorization")
	if len(h) > 7 && h[:7] == "Bearer " {
		return h[7:]
	}
	return ""
}

// NewSessionMiddleware creates a chi-compatible middleware that validates Supabase JWTs
// from the access_token cookie (not the Authorization header).
// On missing or invalid token it redirects to /login with 302 instead of returning 401.
func NewSessionMiddleware(supabaseProjectURL string) (func(http.Handler) http.Handler, error) {
	cache := &jwksCache{
		keys:    make(map[string]*rsa.PublicKey),
		ttl:     time.Hour,
		jwksURL: supabaseProjectURL + "/auth/v1/.well-known/jwks.json",
		issuer:  supabaseProjectURL + "/auth/v1",
	}
	if err := cache.fetch(); err != nil {
		return nil, fmt.Errorf("auth: initial JWKS fetch failed: %w", err)
	}
	return cache.sessionMiddleware, nil
}

// sessionMiddleware is the cookie-based session middleware function.
func (c *jwksCache) sessionMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie("access_token")
		if err != nil || cookie.Value == "" {
			http.Redirect(w, r, "/login", http.StatusFound)
			return
		}

		userID, email, err := c.validateToken(cookie.Value)
		if err != nil {
			http.Redirect(w, r, "/login", http.StatusFound)
			return
		}

		ctx := context.WithValue(r.Context(), userIDKey, userID)
		ctx = context.WithValue(ctx, emailKey, email)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
