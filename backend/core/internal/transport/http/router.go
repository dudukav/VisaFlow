package http

import (
	"log/slog"
	"net/http"

	openapi "visaflow/backend/core/internal/transport/http/generated"

	"github.com/go-chi/chi/v5"
)

func NewRouter(logger *slog.Logger, handler openapi.ServerInterface) http.Handler {
	router := chi.NewRouter()
	router.Use(requestIDMiddleware)
	router.Use(accessLogMiddleware(logger))
	router.Use(recoveryMiddleware(logger))

	router.Get("/health", healthHandler)

	return openapi.HandlerFromMuxWithBaseURL(handler, router, "/api/v1")
}

func healthHandler(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"status":"ok"}`))
}
