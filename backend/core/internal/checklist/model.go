package checklist

import (
	"time"

	"visaflow/backend/core/internal/shared"
)

type ItemStatus string

const (
	ItemTodo          ItemStatus = "todo"
	ItemInProgress    ItemStatus = "in_progress"
	ItemDone          ItemStatus = "done"
	ItemNotApplicable ItemStatus = "not_applicable"
)

type ItemScope string

const (
	ScopeApplication  ItemScope = "application"
	ScopeApplicant    ItemScope = "applicant"
	ScopeFamilyMember ItemScope = "family_member"
)

type Checklist struct {
	ApplicationID shared.ID
	RulesetID     shared.ID
	GeneratedAt   time.Time
	Items         []Item
}

type Item struct {
	ID            shared.ID
	ApplicationID shared.ID
	Title         string
	Description   string
	Scope         ItemScope
	MemberID      *shared.ID
	Status        ItemStatus
	RuleID        shared.ID
	SourceID      shared.ID
}

type Progress struct {
	Completed int
	Total     int
}

func (p Progress) Percent() float64 {
	if p.Total == 0 {
		return 0
	}

	return float64(p.Completed) / float64(p.Total) * 100
}
