package billing

import (
	"time"

	"visaflow/backend/core/internal/shared"
)

type OrderStatus string

const (
	OrderPendingTestConfirmation OrderStatus = "pending_test_confirmation"
	OrderPaidTest                OrderStatus = "paid_test"
)

type Order struct {
	ID              shared.ID
	UserID          shared.ID
	Plan            string
	Provider        string
	ProviderEventID *string
	Status          OrderStatus
	CreatedAt       time.Time
	UpdatedAt       time.Time
}
