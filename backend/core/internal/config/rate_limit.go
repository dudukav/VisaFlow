package config

import (
	"errors"
	"math"
)

const (
	defaultRateLimitRPS   = 10.0
	defaultRateLimitBurst = 20
)

type RateLimitConfig struct {
	RequestsPerSecond float64
	Burst             int
}

func LoadRateLimitConfig() (RateLimitConfig, error) {
	config := RateLimitConfig{}
	var err error
	config.RequestsPerSecond, err = getEnvFloat("RATE_LIMIT_RPS", defaultRateLimitRPS)
	if err != nil {
		return RateLimitConfig{}, err
	}

	config.Burst, err = getEnvInt("RATE_LIMIT_BURST", defaultRateLimitBurst)
	if err != nil {
		return RateLimitConfig{}, err
	}

	if err := config.validate(); err != nil {
		return RateLimitConfig{}, err
	}

	return config, nil
}

func (c RateLimitConfig) validate() error {
	if c.RequestsPerSecond <= 0 || math.IsNaN(c.RequestsPerSecond) || math.IsInf(c.RequestsPerSecond, 0) {
		return errors.New("validate RATE_LIMIT_RPS: value must be a finite number greater than zero")
	}

	if c.Burst <= 0 {
		return errors.New("validate RATE_LIMIT_BURST: value must be greater than zero")
	}

	return nil
}
