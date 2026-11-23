package config

import "testing"

func TestLoadLogConfig(t *testing.T) {
	tests := []struct {
		name    string
		value   string
		want    LogLevel
		wantErr bool
	}{
		{name: "default", want: LogLevelInfo},
		{name: "normalized", value: " DEBUG ", want: LogLevelDebug},
		{name: "invalid", value: "verbose", wantErr: true},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			t.Setenv("LOG_LEVEL", test.value)

			got, err := LoadLogConfig()
			if test.wantErr {
				if err == nil {
					t.Fatal("expected an error")
				}
				return
			}

			if err != nil {
				t.Fatalf("LoadLogConfig() error = %v", err)
			}
			if got.Level != test.want {
				t.Fatalf("Level = %q, want %q", got.Level, test.want)
			}
		})
	}
}
