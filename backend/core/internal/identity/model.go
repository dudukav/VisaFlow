package identity

import (
	"time"

	"visaflow/backend/core/internal/shared"
)

type Role string

const (
	RoleApplicant     Role = "applicant"
	RoleAdministrator Role = "administrator"
)

type User struct {
	ID                  shared.ID
	TelegramUserID      int64
	TelegramDisplayName string
	Role                Role
	CreatedAt           time.Time
	UpdatedAt           time.Time
}

type Session struct {
	ID        shared.ID
	UserID    shared.ID
	TokenHash []byte
	ExpiresAt time.Time
	RevokedAt *time.Time
	CreatedAt time.Time
}

type Consent struct {
	Version     string
	Title       string
	Body        string
	EffectiveAt time.Time
}

type ConsentAcceptance struct {
	UserID     shared.ID
	Version    string
	AcceptedAt time.Time
}
