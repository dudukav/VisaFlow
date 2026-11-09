package config

import (
	"fmt"
	"net"
	"strconv"
	"strings"
	"time"
)

const (
	defaultServerAddress     = ":8080"
	defaultReadHeaderTimeout = 5 * time.Second
	defaultReadTimeout       = 10 * time.Second
	defaultWriteTimeout      = 10 * time.Second
	defaultIdleTimeout       = 60 * time.Second
	defaultShutdownTimeout   = 10 * time.Second
)

type ServerConfig struct {
	Address           string
	ReadHeaderTimeout time.Duration
	ReadTimeout       time.Duration
	WriteTimeout      time.Duration
	IdleTimeout       time.Duration
	ShutdownTimeout   time.Duration
}

func LoadServerConfig() (ServerConfig, error) {
	config := ServerConfig{
		Address: strings.TrimSpace(getEnv("SERVER_ADDRESS", defaultServerAddress)),
	}

	var err error
	config.ReadHeaderTimeout, err = getEnvDuration("SERVER_READ_HEADER_TIMEOUT", defaultReadHeaderTimeout)
	if err != nil {
		return ServerConfig{}, err
	}

	config.ReadTimeout, err = getEnvDuration("SERVER_READ_TIMEOUT", defaultReadTimeout)
	if err != nil {
		return ServerConfig{}, err
	}

	config.WriteTimeout, err = getEnvDuration("SERVER_WRITE_TIMEOUT", defaultWriteTimeout)
	if err != nil {
		return ServerConfig{}, err
	}

	config.IdleTimeout, err = getEnvDuration("SERVER_IDLE_TIMEOUT", defaultIdleTimeout)
	if err != nil {
		return ServerConfig{}, err
	}

	config.ShutdownTimeout, err = getEnvDuration(
		"SERVER_SHUTDOWN_TIMEOUT",
		defaultShutdownTimeout,
	)
	if err != nil {
		return ServerConfig{}, err
	}

	if err := config.validate(); err != nil {
		return ServerConfig{}, err
	}

	return config, nil
}

func (c ServerConfig) validate() error {
	_, portText, err := net.SplitHostPort(c.Address)
	if err != nil {
		return fmt.Errorf("validate SERVER_ADDRESS=%q: %w", c.Address, err)
	}

	port, err := strconv.Atoi(portText)
	if err != nil || port < 1 || port > 65535 {
		return fmt.Errorf("validate SERVER_ADDRESS=%q: port must be between 1 and 65535", c.Address)
	}

	timeouts := []struct {
		name  string
		value time.Duration
	}{
		{name: "SERVER_READ_HEADER_TIMEOUT", value: c.ReadHeaderTimeout},
		{name: "SERVER_READ_TIMEOUT", value: c.ReadTimeout},
		{name: "SERVER_WRITE_TIMEOUT", value: c.WriteTimeout},
		{name: "SERVER_IDLE_TIMEOUT", value: c.IdleTimeout},
		{name: "SERVER_SHUTDOWN_TIMEOUT", value: c.ShutdownTimeout},
	}

	for _, timeout := range timeouts {
		if timeout.value <= 0 {
			return fmt.Errorf("validate %s: duration must be positive", timeout.name)
		}
	}

	return nil
}
