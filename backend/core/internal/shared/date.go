package shared

import (
	"fmt"
	"time"
)

// Date represents a calendar date without a time of day or location.
type Date struct {
	time.Time
}

func NewDate(year int, month time.Month, day int) (Date, error) {
	value := time.Date(year, month, day, 0, 0, 0, 0, time.UTC)
	if value.Year() != year || value.Month() != month || value.Day() != day {
		return Date{}, fmt.Errorf("invalid calendar date: %04d-%02d-%02d", year, month, day)
	}

	return Date{Time: value}, nil
}

func (d Date) IsZero() bool {
	return d.Time.IsZero()
}
