package documents

import (
	"time"

	"visaflow/backend/core/internal/shared"
)

type Status string

const (
	StatusAwaitingUpload       Status = "awaiting_upload"
	StatusQueued               Status = "queued"
	StatusValidating           Status = "validating"
	StatusRejected             Status = "rejected"
	StatusOCRProcessing        Status = "ocr_processing"
	StatusAwaitingConfirmation Status = "awaiting_confirmation"
	StatusChecking             Status = "checking"
	StatusReady                Status = "ready"
	StatusFailed               Status = "failed"
	StatusDeletionPending      Status = "deletion_pending"
	StatusDeleted              Status = "deleted"
)

type RejectionCode string

const (
	RejectionUnsupportedType RejectionCode = "unsupported_type"
	RejectionSizeExceeded    RejectionCode = "size_exceeded"
	RejectionMalwareDetected RejectionCode = "malware_detected"
	RejectionUnreadable      RejectionCode = "unreadable"
)

type Document struct {
	ID               shared.ID
	ApplicationID    shared.ID
	ChecklistItemID  shared.ID
	MemberID         *shared.ID
	ObjectKey        string
	ContentType      string
	SizeBytes        int64
	Status           Status
	RejectionCode    *RejectionCode
	FailureCode      *string
	OCREngineVersion *string
	CreatedAt        time.Time
	UpdatedAt        time.Time
}

type ExtractedField struct {
	Key        string
	Value      string
	Confidence float64
	Confirmed  bool
}

type CheckLevel string

const (
	CheckCritical   CheckLevel = "critical"
	CheckWarning    CheckLevel = "warning"
	CheckPassed     CheckLevel = "passed"
	CheckNotChecked CheckLevel = "not_checked"
)

type Check struct {
	ID          shared.ID
	DocumentID  shared.ID
	Level       CheckLevel
	Explanation string
	RuleID      shared.ID
	SourceID    shared.ID
}
