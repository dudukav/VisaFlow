package audit

import (
	"time"

	"visaflow/backend/core/internal/shared"
)

type Event struct {
	ID         shared.ID
	ActorID    shared.ID
	Action     string
	TargetType string
	TargetID   string
	OccurredAt time.Time
	RequestID  string
}
