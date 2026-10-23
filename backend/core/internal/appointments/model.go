package appointments

import (
	"time"

	"visaflow/backend/core/internal/shared"
)

type Capability string

const (
	CapabilityOfficialLink   Capability = "official_link"
	CapabilitySlotMonitoring Capability = "slot_monitoring"
	CapabilityUnsupported    Capability = "unsupported"
)

type AdapterStatus string

const (
	AdapterHealthy     AdapterStatus = "healthy"
	AdapterDegraded    AdapterStatus = "degraded"
	AdapterCircuitOpen AdapterStatus = "circuit_open"
	AdapterDisabled    AdapterStatus = "disabled"
	AdapterUnknown     AdapterStatus = "unknown"
)

type Adapter struct {
	ID              string
	CountryCode     string
	Capabilities    []Capability
	Enabled         bool
	Status          AdapterStatus
	ErrorClass      *string
	CheckedAt       time.Time
	LastSucceededAt *time.Time
}

type OfficialLink struct {
	CountryCode string
	URL         string
	SourceID    shared.ID
	VerifiedAt  time.Time
}

type Monitoring struct {
	ApplicationID     shared.ID
	Available         bool
	Enabled           bool
	UnavailableReason *string
}
