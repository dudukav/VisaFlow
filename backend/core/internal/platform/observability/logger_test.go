package observability

import (
	"bytes"
	"encoding/json"
	"testing"

	"visaflow/backend/core/internal/config"
)

func TestNewLoggerWritesStructuredJSONAtConfiguredLevel(t *testing.T) {
	var output bytes.Buffer
	logger := NewLogger(config.LogConfig{Level: config.LogLevelWarn}, &output)

	logger.Info("ignored")
	logger.Warn("ready", "component", "http")

	var record map[string]any
	if err := json.Unmarshal(output.Bytes(), &record); err != nil {
		t.Fatalf("decode log record: %v", err)
	}

	if record["level"] != "WARN" {
		t.Fatalf("level = %v, want WARN", record["level"])
	}
	if record["service"] != serviceName {
		t.Fatalf("service = %v, want %s", record["service"], serviceName)
	}
	if record["component"] != "http" {
		t.Fatalf("component = %v, want http", record["component"])
	}
}
