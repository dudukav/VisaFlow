package observability

import (
	"io"
	"log/slog"

	"visaflow/backend/core/internal/config"
)

const serviceName = "visaflow-api"

func NewLogger(cfg config.LogConfig, output io.Writer) *slog.Logger {
	handler := slog.NewJSONHandler(output, &slog.HandlerOptions{
		Level:       slogLevel(cfg.Level),
		ReplaceAttr: utcTimestamps,
	})

	return slog.New(handler).With(slog.String("service", serviceName))
}

func utcTimestamps(_ []string, attribute slog.Attr) slog.Attr {
	if attribute.Key == slog.TimeKey {
		attribute.Value = slog.TimeValue(attribute.Value.Time().UTC())
	}
	return attribute
}

func slogLevel(level config.LogLevel) slog.Level {
	switch level {
	case config.LogLevelDebug:
		return slog.LevelDebug
	case config.LogLevelWarn:
		return slog.LevelWarn
	case config.LogLevelError:
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}
