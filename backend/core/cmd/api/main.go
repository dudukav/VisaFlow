package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"visaflow/backend/core/internal/config"
	"visaflow/backend/core/internal/platform/httpserver"
	"visaflow/backend/core/internal/platform/observability"
	transporthttp "visaflow/backend/core/internal/transport/http"
	openapi "visaflow/backend/core/internal/transport/http/generated"
)

func main() {
	bootstrapLogger := observability.NewLogger(
		config.LogConfig{Level: config.LogLevelInfo},
		os.Stderr,
	)

	cfg, err := config.Load()
	if err != nil {
		bootstrapLogger.Error("load configuration", slog.Any("error", err))
		os.Exit(1)
	}

	logger := observability.NewLogger(cfg.Log, os.Stdout)
	if err := run(cfg, logger); err != nil {
		logger.Error("API stopped with an error", slog.Any("error", err))
		os.Exit(1)
	}
}

func run(cfg config.Config, logger *slog.Logger) error {
	handler := transporthttp.NewRouter(logger, openapi.Unimplemented{})
	server := httpserver.New(cfg.Server, handler)

	signalContext, stop := signal.NotifyContext(
		context.Background(),
		os.Interrupt,
		syscall.SIGTERM,
	)
	defer stop()

	serverErrors := make(chan error, 1)
	go func() {
		serverErrors <- server.Run()
	}()

	logger.Info("API starting", slog.String("address", cfg.Server.Address))

	select {
	case err := <-serverErrors:
		return err
	case <-signalContext.Done():
		logger.Info("shutdown signal received")
	}

	shutdownContext, cancel := context.WithTimeout(
		context.Background(),
		cfg.Server.ShutdownTimeout,
	)
	defer cancel()

	startedAt := time.Now()
	if err := server.Shutdown(shutdownContext); err != nil {
		return err
	}
	if err := <-serverErrors; err != nil {
		return err
	}

	logger.Info(
		"API stopped",
		slog.Int64("duration_ms", time.Since(startedAt).Milliseconds()),
	)
	return nil
}
