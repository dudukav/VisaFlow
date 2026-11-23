package config

type Config struct {
	Server    ServerConfig
	DB        DBConfig
	RateLimit RateLimitConfig
	Log       LogConfig
}

func Load() (Config, error) {
	config := Config{}
	var err error

	config.DB, err = LoadDBConfig()
	if err != nil {
		return config, err
	}

	config.Server, err = LoadServerConfig()
	if err != nil {
		return config, err
	}

	config.RateLimit, err = LoadRateLimitConfig()
	if err != nil {
		return config, err
	}

	config.Log, err = LoadLogConfig()
	if err != nil {
		return config, err
	}

	return config, nil
}
