package http

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"visaflow/backend/core/internal/config"
	"visaflow/backend/core/internal/platform/observability"
	openapi "visaflow/backend/core/internal/transport/http/generated"
)

func TestHealth(t *testing.T) {
	var logs bytes.Buffer
	logger := observability.NewLogger(config.LogConfig{Level: config.LogLevelInfo}, &logs)
	handler := NewRouter(logger, openapi.Unimplemented{})

	request := httptest.NewRequest(http.MethodGet, "/health", nil)
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusOK)
	}
	if response.Header().Get(requestIDHeader) == "" {
		t.Fatal("response has no request ID")
	}
	if got := response.Body.String(); got != `{"status":"ok"}` {
		t.Fatalf("body = %q, want health response", got)
	}

	var record map[string]any
	if err := json.Unmarshal(logs.Bytes(), &record); err != nil {
		t.Fatalf("decode access log: %v", err)
	}
	if record["route"] != "/health" {
		t.Fatalf("logged route = %v, want /health", record["route"])
	}
	if record["status"] != float64(http.StatusOK) {
		t.Fatalf("logged status = %v, want %d", record["status"], http.StatusOK)
	}
}

func TestHealthReplacesInvalidRequestID(t *testing.T) {
	logger := observability.NewLogger(config.LogConfig{Level: config.LogLevelError}, &bytes.Buffer{})
	handler := NewRouter(logger, openapi.Unimplemented{})

	request := httptest.NewRequest(http.MethodGet, "/health", nil)
	request.Header.Set(requestIDHeader, "contains a space")
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)

	requestID := response.Header().Get(requestIDHeader)
	if requestID == "" || requestID == "contains a space" {
		t.Fatalf("request ID = %q, want a generated value", requestID)
	}
}

func TestRecoveryDoesNotLogPanicValue(t *testing.T) {
	var logs bytes.Buffer
	logger := observability.NewLogger(config.LogConfig{Level: config.LogLevelInfo}, &logs)

	panicHandler := http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
		panic("sensitive panic value")
	})
	handler := requestIDMiddleware(
		accessLogMiddleware(logger)(
			recoveryMiddleware(logger)(panicHandler),
		),
	)

	request := httptest.NewRequest(http.MethodGet, "/panic", nil)
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)

	if response.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusInternalServerError)
	}
	if strings.Contains(logs.String(), "sensitive panic value") {
		t.Fatal("recovery log contains the panic value")
	}
}
