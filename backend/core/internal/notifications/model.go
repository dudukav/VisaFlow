package notifications

import (
	"time"

	"visaflow/backend/core/internal/shared"
)

type Preferences struct {
	UserID                     shared.ID
	NonCriticalTelegramEnabled bool
	UpdatedAt                  time.Time
}

type DeliveryStatus string

const (
	DeliveryPending   DeliveryStatus = "pending"
	DeliverySucceeded DeliveryStatus = "succeeded"
	DeliveryFailed    DeliveryStatus = "failed"
)

type Delivery struct {
	ID             shared.ID
	UserID         shared.ID
	IdempotencyKey string
	Template       string
	Status         DeliveryStatus
	AttemptCount   int
	NextAttemptAt  *time.Time
	DeliveredAt    *time.Time
}
