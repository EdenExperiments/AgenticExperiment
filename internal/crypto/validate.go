package crypto

import "regexp"

var claudeKeyRegex = regexp.MustCompile(`^sk-ant-[A-Za-z0-9\-_]+$`)

// ValidateClaudeKeyFormat returns true if key matches the Claude API key format:
// starts with "sk-ant-" followed by one or more alphanumeric, hyphen, or underscore chars.
func ValidateClaudeKeyFormat(key string) bool {
	return claudeKeyRegex.MatchString(key)
}
