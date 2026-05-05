package auth

import (
	"context"
	"crypto"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rsa"
	"encoding/base64"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"log"
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

// jwksFetchTimeout is the per-request deadline for JWKS HTTP calls.
// Supabase JWKS endpoints are typically fast; 10 s is generous.
const jwksFetchTimeout = 10 * time.Second

// jwksCache caches the fetched JWKS keys with a TTL.
// The singleflight group ensures that concurrent re-fetch triggers (TTL expiry
// or R-001 unknown-kid) collapse into a single in-flight HTTP request rather
// than stampeding the Supabase JWKS endpoint.
// keys holds crypto.PublicKey values — either *rsa.PublicKey (RS256) or
// *ecdsa.PublicKey (ES256/ES384/ES512) depending on the Supabase project config.
type jwksCache struct {
	mu         sync.RWMutex
	keys       map[string]crypto.PublicKey // kid → public key (RSA or ECDSA)
	fetchedAt  time.Time
	ttl        time.Duration
	jwksURL    string
	issuer     string
	sf         singleflight.Group
	httpClient *http.Client // non-nil; defaults set by New* constructors
}

// NewJWTMiddleware creates a chi-compatible middleware that validates Supabase JWTs.
// It fetches the JWKS at creation time and caches them with a 1-hour TTL.
func NewJWTMiddleware(supabaseProjectURL string) (func(http.Handler) http.Handler, error) {
	cache := &jwksCache{
		keys:       make(map[string]crypto.PublicKey),
		ttl:        time.Hour,
		jwksURL:    supabaseProjectURL + "/auth/v1/.well-known/jwks.json",
		issuer:     supabaseProjectURL + "/auth/v1",
		httpClient: &http.Client{Timeout: jwksFetchTimeout},
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
// Supports both RSA (RS256/RS384/RS512) and ECDSA (ES256/ES384/ES512) signing methods.
func (c *jwksCache) validateToken(tokenStr string) (string, string, error) {
	keyFunc := func(token *jwt.Token) (interface{}, error) {
		switch token.Method.(type) {
		case *jwt.SigningMethodRSA, *jwt.SigningMethodECDSA:
			// supported
		default:
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

// getKey returns the cached public key for the given kid, or nil if not found or stale.
func (c *jwksCache) getKey(kid string) crypto.PublicKey {
	c.mu.RLock()
	defer c.mu.RUnlock()
	if time.Since(c.fetchedAt) > c.ttl {
		return nil // treat stale cache as miss — will trigger re-fetch
	}
	return c.keys[kid]
}

// fetch retrieves the JWKS from Supabase and updates the cache.
// Supports both RSA (kty=RSA) and EC (kty=EC) keys.
func (c *jwksCache) fetch() error {
	client := c.httpClient
	if client == nil {
		client = &http.Client{Timeout: jwksFetchTimeout}
	}
	resp, err := client.Get(c.jwksURL)
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
			// RSA fields
			N string `json:"n"`
			E string `json:"e"`
			// EC fields
			Crv string `json:"crv"`
			X   string `json:"x"`
			Y   string `json:"y"`
		} `json:"keys"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&jwks); err != nil {
		return fmt.Errorf("decode JWKS: %w", err)
	}

	keys := make(map[string]crypto.PublicKey, len(jwks.Keys))
	for _, k := range jwks.Keys {
		switch k.Kty {
		case "RSA":
			pub, err := jwkToRSA(k.N, k.E)
			if err != nil {
				return fmt.Errorf("parse JWK RSA key %s: %w", k.Kid, err)
			}
			keys[k.Kid] = pub
		case "EC":
			pub, err := jwkToEC(k.Crv, k.X, k.Y)
			if err != nil {
				return fmt.Errorf("parse JWK EC key %s: %w", k.Kid, err)
			}
			keys[k.Kid] = pub
		}
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

// jwkToEC converts JWK crv/x/y base64url components to an *ecdsa.PublicKey.
func jwkToEC(crv, xB64, yB64 string) (*ecdsa.PublicKey, error) {
	xBytes, err := base64.RawURLEncoding.DecodeString(xB64)
	if err != nil {
		return nil, fmt.Errorf("decode x: %w", err)
	}
	yBytes, err := base64.RawURLEncoding.DecodeString(yB64)
	if err != nil {
		return nil, fmt.Errorf("decode y: %w", err)
	}
	var curve elliptic.Curve
	switch crv {
	case "P-256":
		curve = elliptic.P256()
	case "P-384":
		curve = elliptic.P384()
	case "P-521":
		curve = elliptic.P521()
	default:
		return nil, fmt.Errorf("unsupported EC curve: %s", crv)
	}
	return &ecdsa.PublicKey{
		Curve: curve,
		X:     new(big.Int).SetBytes(xBytes),
		Y:     new(big.Int).SetBytes(yBytes),
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
		keys:       make(map[string]crypto.PublicKey),
		ttl:        time.Hour,
		jwksURL:    supabaseProjectURL + "/auth/v1/.well-known/jwks.json",
		issuer:     supabaseProjectURL + "/auth/v1",
		httpClient: &http.Client{Timeout: jwksFetchTimeout},
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
			redirectToLogin(w, r)
			return
		}

		userID, email, err := c.validateToken(cookie.Value)
		if err != nil {
			log.Printf("auth: JWT validation failed: %v", err)
			redirectToLogin(w, r)
			return
		}

		ctx := context.WithValue(r.Context(), userIDKey, userID)
		ctx = context.WithValue(ctx, emailKey, email)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// redirectToLogin clears auth cookies and redirects to /login.
// Clearing cookies breaks the redirect loop that occurs when a stale or
// invalid token causes sessionMiddleware to reject the request while
// HandleGetLogin still sees the cookie and redirects back to /dashboard.
// For HTMX requests it returns HX-Redirect so the client does a full-page
// navigation rather than injecting the login page into the current swap target.
func redirectToLogin(w http.ResponseWriter, r *http.Request) {
	http.SetCookie(w, &http.Cookie{Name: "access_token", Value: "", MaxAge: -1, Path: "/"})
	http.SetCookie(w, &http.Cookie{Name: "refresh_token", Value: "", MaxAge: -1, Path: "/"})
	if r.Header.Get("HX-Request") == "true" {
		w.Header().Set("HX-Redirect", "/login")
		w.WriteHeader(http.StatusOK)
		return
	}
	http.Redirect(w, r, "/login", http.StatusFound)
}
