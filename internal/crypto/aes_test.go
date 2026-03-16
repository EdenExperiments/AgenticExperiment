package crypto

import (
	"bytes"
	"testing"
)

// makeKey returns a deterministic 32-byte key for tests.
func makeKey(fill byte) []byte {
	key := make([]byte, 32)
	for i := range key {
		key[i] = fill
	}
	return key
}

// TestEncryptDecryptRoundTrip verifies that encrypting then decrypting
// returns the original plaintext unchanged.
func TestEncryptDecryptRoundTrip(t *testing.T) {
	key := makeKey(0x01)
	plaintext := []byte("hello, RpgTracker!")

	ciphertext, err := Encrypt(key, plaintext)
	if err != nil {
		t.Fatalf("Encrypt failed: %v", err)
	}

	got, err := Decrypt(key, ciphertext)
	if err != nil {
		t.Fatalf("Decrypt failed: %v", err)
	}

	if !bytes.Equal(got, plaintext) {
		t.Errorf("round-trip mismatch: got %q, want %q", got, plaintext)
	}
}

// TestEncryptProducesUniqueNonces verifies that two Encrypt calls on the
// same plaintext/key produce different ciphertexts (i.e. random nonces).
func TestEncryptProducesUniqueNonces(t *testing.T) {
	key := makeKey(0x02)
	plaintext := []byte("same plaintext every time")

	ct1, err := Encrypt(key, plaintext)
	if err != nil {
		t.Fatalf("first Encrypt failed: %v", err)
	}

	ct2, err := Encrypt(key, plaintext)
	if err != nil {
		t.Fatalf("second Encrypt failed: %v", err)
	}

	if bytes.Equal(ct1, ct2) {
		t.Error("Encrypt produced identical ciphertexts for two calls — nonces are not random")
	}
}

// TestDecryptWrongKeyFails verifies that decryption with a different key
// returns an error (authentication tag mismatch).
func TestDecryptWrongKeyFails(t *testing.T) {
	keyA := makeKey(0xAA)
	keyB := makeKey(0xBB)
	plaintext := []byte("secret data")

	ciphertext, err := Encrypt(keyA, plaintext)
	if err != nil {
		t.Fatalf("Encrypt failed: %v", err)
	}

	_, err = Decrypt(keyB, ciphertext)
	if err == nil {
		t.Error("Decrypt with wrong key should have returned an error, but did not")
	}
}

// TestDecryptTruncatedFails verifies that a ciphertext shorter than
// nonceSize + gcm.Overhead() (28 bytes) returns an error without panicking.
// Two cases are tested: below the nonce threshold (8 bytes) and in the
// nonce-present-but-body-too-short range (20 bytes, which the old guard would
// have passed but the current guard correctly rejects).
func TestDecryptTruncatedFails(t *testing.T) {
	key := makeKey(0x03)

	cases := []struct {
		name  string
		input []byte
	}{
		{"below_nonce_size", []byte("tooshort")},          // 8 bytes < 12
		{"between_nonce_and_min", make([]byte, 20)},       // 20 bytes: nonce ok, body too short for GCM tag
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			_, err := Decrypt(key, tc.input)
			if err == nil {
				t.Errorf("Decrypt(%d-byte input) should have returned an error, but did not", len(tc.input))
			}
		})
	}
}

// TestGenerateDEK verifies that GenerateDEK returns a 32-byte key and that
// two consecutive calls produce distinct keys.
func TestGenerateDEK(t *testing.T) {
	key1, err := GenerateDEK()
	if err != nil {
		t.Fatalf("GenerateDEK() error: %v", err)
	}
	if len(key1) != 32 {
		t.Errorf("GenerateDEK() length = %d, want 32", len(key1))
	}

	key2, err := GenerateDEK()
	if err != nil {
		t.Fatalf("GenerateDEK() second call error: %v", err)
	}
	if string(key1) == string(key2) {
		t.Error("GenerateDEK() produced identical keys on two calls")
	}
}

// TestDecryptTamperedFails verifies that flipping a byte in the ciphertext body
// causes the GCM authentication tag to fail.
func TestDecryptTamperedFails(t *testing.T) {
	key := makeKey(0x04)
	plaintext := []byte("tamper me if you can")

	ciphertext, err := Encrypt(key, plaintext)
	if err != nil {
		t.Fatalf("Encrypt failed: %v", err)
	}

	// Flip the first byte of the actual ciphertext body (after the 12-byte nonce).
	tampered := make([]byte, len(ciphertext))
	copy(tampered, ciphertext)
	tampered[nonceSize] ^= 0xFF

	_, err = Decrypt(key, tampered)
	if err == nil {
		t.Error("Decrypt on tampered ciphertext should have returned an error, but did not")
	}
}
