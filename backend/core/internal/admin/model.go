package admin

import "time"

type ComponentKind string

const (
	ComponentWorker  ComponentKind = "worker"
	ComponentAdapter ComponentKind = "adapter"
)

type ComponentStatus string

const (
	ComponentHealthy     ComponentStatus = "healthy"
	ComponentDegraded    ComponentStatus = "degraded"
	ComponentCircuitOpen ComponentStatus = "circuit_open"
	ComponentDisabled    ComponentStatus = "disabled"
	ComponentUnknown     ComponentStatus = "unknown"
)

type ComponentHealth struct {
	ID              string
	Kind            ComponentKind
	Enabled         bool
	Status          ComponentStatus
	ErrorClass      *string
	CheckedAt       time.Time
	LastSucceededAt *time.Time
}
