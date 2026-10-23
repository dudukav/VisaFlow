package shared

import (
	"testing"
	"time"
)

func TestNewDateRejectsInvalidCalendarDate(t *testing.T) {
	t.Parallel()

	if _, err := NewDate(2027, time.February, 29); err == nil {
		t.Fatal("expected invalid non-leap-year date to be rejected")
	}
}

func TestNewDateUsesUTCAtStartOfDay(t *testing.T) {
	t.Parallel()

	date, err := NewDate(2028, time.February, 29)
	if err != nil {
		t.Fatalf("create date: %v", err)
	}

	want := time.Date(2028, time.February, 29, 0, 0, 0, 0, time.UTC)
	if !date.Time.Equal(want) {
		t.Fatalf("date = %v, want %v", date.Time, want)
	}
}
