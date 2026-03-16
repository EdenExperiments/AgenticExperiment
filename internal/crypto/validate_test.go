package crypto

import "testing"

// TestValidateClaudeKeyFormat is a table-driven test covering the spec cases.
func TestValidateClaudeKeyFormat(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  bool
	}{
		{"valid basic key", "sk-ant-abc123", true},
		{"valid key with dashes and underscores", "sk-ant-A1B2-C3_D4", true},
		{"missing ant- prefix", "sk-abc123", false},
		{"empty string", "", false},
		{"no chars after prefix", "sk-ant-", false},
		{"wrong case ANT", "sk-ANT-abc", false},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := ValidateClaudeKeyFormat(tc.input)
			if got != tc.want {
				t.Errorf("ValidateClaudeKeyFormat(%q) = %v, want %v", tc.input, got, tc.want)
			}
		})
	}
}
