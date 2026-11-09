package httpserver

import (
	"context"
	"errors"
	"fmt"
	"net/http"

	"visaflow/backend/core/internal/config"
)

type Server struct {
	httpServer *http.Server
}

func New(cfg config.ServerConfig, handler http.Handler) *Server {
	return &Server{
		httpServer: &http.Server{
			Addr:              cfg.Address,
			Handler:           handler,
			ReadHeaderTimeout: cfg.ReadHeaderTimeout,
			ReadTimeout:       cfg.ReadTimeout,
			WriteTimeout:      cfg.WriteTimeout,
			IdleTimeout:       cfg.IdleTimeout,
		},
	}
}

func (s *Server) Run() error {
	err := s.httpServer.ListenAndServe()
	if err == nil {
		return nil
	}

	if errors.Is(err, http.ErrServerClosed) {
		return nil
	}

	return fmt.Errorf("run HTTP server: %w", err)
}

func (s *Server) Shutdown(ctx context.Context) error {
	if err := s.httpServer.Shutdown(ctx); err != nil {
		return fmt.Errorf("shutdown HTTP server: %w", err)
	}

	return nil
}
