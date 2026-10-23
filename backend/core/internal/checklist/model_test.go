package checklist

import "testing"

func TestProgressPercent(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name     string
		progress Progress
		want     float64
	}{
		{name: "empty", progress: Progress{}, want: 0},
		{name: "partial", progress: Progress{Completed: 1, Total: 4}, want: 25},
		{name: "complete", progress: Progress{Completed: 3, Total: 3}, want: 100},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			t.Parallel()
			if got := test.progress.Percent(); got != test.want {
				t.Fatalf("Percent() = %v, want %v", got, test.want)
			}
		})
	}
}
