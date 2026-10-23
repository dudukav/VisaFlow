package deadlines

import "visaflow/backend/core/internal/shared"

type Deadline struct {
	ID            shared.ID
	ApplicationID shared.ID
	Title         string
	DueOn         shared.Date
	Critical      bool
	RuleID        shared.ID
}
