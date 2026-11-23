package config

import (
	"fmt"
	"strings"
)

type LogLevel string

const (
	LogLevelDebug LogLevel = "debug"
	LogLevelInfo  LogLevel = "info"
	LogLevelWarn  LogLevel = "warn"
	LogLevelError LogLevel = "error"
)

type LogConfig struct {
	Level LogLevel
}

func LoadLogConfig() (LogConfig, error) {
	level := LogLevel(strings.ToLower(strings.TrimSpace(getEnv("LOG_LEVEL", string(LogLevelInfo)))))

	switch level {
	case LogLevelDebug, LogLevelInfo, LogLevelWarn, LogLevelError:
		return LogConfig{Level: level}, nil
	default:
		return LogConfig{}, fmt.Errorf(
			"validate LOG_LEVEL=%q: must be debug, info, warn, or error",
			level,
		)
	}
}
