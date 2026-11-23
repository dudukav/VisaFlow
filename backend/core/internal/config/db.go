package config

import (
	"errors"
	"net/url"
	"strings"
)

type DBConfig struct {
	URL string
}

func LoadDBConfig() (DBConfig, error) {
	rawURL := getEnv(
		"DATABASE_URL",
		"postgres://postgres:postgres@localhost:5432/threat?sslmode=disable",
	)

	parsedURL, err := url.Parse(rawURL)
	if err != nil {
		// url.Error may contain the complete URL, including credentials.
		return DBConfig{}, errors.New("parse DATABASE_URL: invalid URL")
	}

	if parsedURL.Scheme != "postgres" &&
		parsedURL.Scheme != "postgresql" {
		return DBConfig{}, errors.New(
			"DATABASE_URL must use postgres or postgresql scheme",
		)
	}

	if parsedURL.Hostname() == "" {
		return DBConfig{}, errors.New(
			"DATABASE_URL must contain a host",
		)
	}

	if strings.TrimPrefix(parsedURL.Path, "/") == "" {
		return DBConfig{}, errors.New(
			"DATABASE_URL must contain a database name",
		)
	}

	return DBConfig{
		URL: rawURL,
	}, nil
}
