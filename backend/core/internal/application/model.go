package application

import (
	"time"

	"visaflow/backend/core/internal/shared"
)

type Country string

const (
	CountryItaly Country = "IT"
	CountrySpain Country = "ES"
	CountryJapan Country = "JP"
)

type VisaType string

const VisaTypeTourist VisaType = "tourist"

type Status string

const (
	StatusDraft  Status = "draft"
	StatusActive Status = "active"
	StatusClosed Status = "closed"
)

type Application struct {
	ID                    shared.ID
	OwnerID               shared.ID
	Country               Country
	VisaType              VisaType
	Purpose               string
	TripStartsOn          shared.Date
	TripEndsOn            shared.Date
	SubmissionCity        string
	Status                Status
	RulesetID             *shared.ID
	RetentionScheduledFor *time.Time
	CreatedAt             time.Time
	UpdatedAt             time.Time
}

type Relationship string

const (
	RelationshipSpouse Relationship = "spouse"
	RelationshipChild  Relationship = "child"
	RelationshipParent Relationship = "parent"
	RelationshipOther  Relationship = "other"
)

type FamilyMember struct {
	ID            shared.ID
	ApplicationID shared.ID
	DisplayName   string
	DateOfBirth   shared.Date
	Relationship  Relationship
	CreatedAt     time.Time
	UpdatedAt     time.Time
}
