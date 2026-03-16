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

// TestDecryptTruncatedFails verifies that a ciphertext shorter than nonceSize
// returns an error without panicking.
func TestDecryptTruncatedFails(t *testing.T) {
	key := makeKey(0x03)
	short := []byte("tooshort") // 8 bytes < nonceSize (12)

	_, err := Decrypt(key, short)
	if err == nil {
		t.Error("Decrypt on truncated ciphertext should have returned an error, but did not")
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
