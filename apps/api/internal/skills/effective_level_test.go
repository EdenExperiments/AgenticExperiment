package skills

import "testing"

func TestEffectiveLevel(t *testing.T) {
	tests := []struct {
		name         string
		currentLevel int
		gates        []BlockerGate
		want         int
	}{
		{
			name:         "no gates returns current level",
			currentLevel: 12,
			gates:        nil,
			want:         12,
		},
		{
			name:         "empty gates slice returns current level",
			currentLevel: 12,
			gates:        []BlockerGate{},
			want:         12,
		},
		{
			name:         "all gates cleared returns current level",
			currentLevel: 15,
			gates: []BlockerGate{
				{GateLevel: 9, IsCleared: true},
				{GateLevel: 19, IsCleared: true},
			},
			want: 15,
		},
		{
			name:         "uncleared gate below current level caps at gate level",
			currentLevel: 10,
			gates: []BlockerGate{
				{GateLevel: 9, IsCleared: false},
			},
			want: 9,
		},
		{
			name:         "current level below first uncleared gate returns current level",
			currentLevel: 5,
			gates: []BlockerGate{
				{GateLevel: 9, IsCleared: false},
			},
			want: 5,
		},
		{
			name:         "multiple uncleared gates returns lowest matching gate level",
			currentLevel: 25,
			gates: []BlockerGate{
				{GateLevel: 9, IsCleared: false},
				{GateLevel: 19, IsCleared: false},
				{GateLevel: 29, IsCleared: false},
			},
			want: 9,
		},
		{
			name:         "skips cleared gates and caps at next uncleared gate",
			currentLevel: 25,
			gates: []BlockerGate{
				{GateLevel: 9, IsCleared: true},
				{GateLevel: 19, IsCleared: false},
			},
			want: 19,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := EffectiveLevel(tt.currentLevel, tt.gates)
			if got != tt.want {
				t.Errorf("EffectiveLevel(%d, gates) = %d, want %d", tt.currentLevel, got, tt.want)
			}
		})
	}
}
