package rules

import (
	"time"

	"visaflow/backend/core/internal/shared"
)

type RulesetStatus string

const (
	RulesetDraft     RulesetStatus = "draft"
	RulesetReview    RulesetStatus = "review"
	RulesetPublished RulesetStatus = "published"
)

type Ruleset struct {
	ID          shared.ID
	CountryCode string
	Version     string
	Status      RulesetStatus
	Rules       []Rule
	CreatedAt   time.Time
	PublishedAt *time.Time
}

type ActionType string

const (
	ActionRequireDocument   ActionType = "require_document"
	ActionRequireAction     ActionType = "require_action"
	ActionCalculateDeadline ActionType = "calculate_deadline"
	ActionValidateField     ActionType = "validate_field"
)

type Rule struct {
	ID               shared.ID
	SourceID         shared.ID
	SourceVerifiedAt time.Time
	Condition        Condition
	Action           Action
}

type Condition struct {
	CountryCodes []string
	VisaTypes    []string
	Purposes     []string
	MinimumAge   *int
	MaximumAge   *int
}

type Action struct {
	Type               ActionType
	Title              string
	Description        string
	DeadlineOffsetDays *int
}

type Source struct {
	ID          shared.ID
	Name        string
	OfficialURL string
	Enabled     bool
}

type SourceSnapshot struct {
	ID         shared.ID
	SourceID   shared.ID
	Checksum   string
	CapturedAt time.Time
	ContentRef string
}

type SourceDiff struct {
	SourceID         shared.ID
	PreviousChecksum *string
	CurrentChecksum  string
	Summary          string
}
