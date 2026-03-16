package crypto

import "testing"

// TestValidateClaudeKeyFormat is a table-driven test covering the spec cases.
func TestValidateClaudeKeyFormat(t *testing.T) {
	tests := []struct {
		input string
		want  bool
	}{
		{"sk-ant-abc123", true},
		{"sk-ant-A1B2-C3_D4", true},
		{"sk-abc123", false},    // missing "ant-"
		{"", false},             // empty string
		{"sk-ant-", false},      // no chars after prefix
		{"sk-ANT-abc", false},   // wrong case "ANT"
	}

	for _, tc := range tests {
		t.Run(tc.input, func(t *testing.T) {
			got := ValidateClaudeKeyFormat(tc.input)
			if got != tc.want {
				t.Errorf("ValidateClaudeKeyFormat(%q) = %v, want %v", tc.input, got, tc.want)
			}
		})
	}
}
