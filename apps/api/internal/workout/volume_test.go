package workout

import "testing"

func TestVolumeKg_IgnoresSetsWithoutLoad(t *testing.T) {
	load := 100.0
	sets := []Set{
		{Reps: 5, LoadKg: &load},
		{Reps: 8},
		{Reps: 3, LoadKg: &load},
	}
	got := VolumeKg(sets)
	want := 5*100.0 + 3*100.0
	if got != want {
		t.Fatalf("VolumeKg = %v, want %v", got, want)
	}
}

func TestVolumeKg_Empty(t *testing.T) {
	if VolumeKg(nil) != 0 {
		t.Fatalf("empty volume should be 0")
	}
}
