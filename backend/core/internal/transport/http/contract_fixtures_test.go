package http

import (
	"encoding/json"
	"io"
	"os"
	"path/filepath"
	"runtime"
	"testing"

	openapi "visaflow/backend/core/internal/transport/http/generated"
)

const syntheticDocumentID = "11111111-1111-4111-8111-111111111111"

type fixtureEnvelope[T any] struct {
	Summary string `json:"summary"`
	Value   T      `json:"value"`
}

func TestMVP1PassportFixturesMatchGeneratedContract(t *testing.T) {
	extracted := loadFixture[openapi.ExtractedFieldsDraft](t, "extracted-fields.example.json")
	checks := loadFixture[openapi.CheckResult](t, "checks.example.json")
	problem := loadFixture[openapi.Problem](t, "consent-required.example.json")
	expected := loadJSON[map[string]string](t, "expected-fields.json")

	if extracted.Value.DocumentId.String() != syntheticDocumentID {
		t.Fatalf("extracted document ID = %q, want %q", extracted.Value.DocumentId, syntheticDocumentID)
	}
	if extracted.Value.Revision < 1 {
		t.Fatalf("extracted revision = %d, want a positive revision", extracted.Value.Revision)
	}
	if !extracted.Value.OcrOutcome.Valid() {
		t.Fatalf("invalid OCR outcome %q", extracted.Value.OcrOutcome)
	}
	if extracted.Value.SavedAt.IsZero() {
		t.Fatal("extracted fixture has no savedAt timestamp")
	}
	if extracted.Value.ConfirmedAt != nil {
		t.Fatal("pre-confirmation fixture unexpectedly has confirmedAt")
	}
	if len(extracted.Value.Fields) != len(expected) {
		t.Fatalf("extracted field count = %d, want %d", len(extracted.Value.Fields), len(expected))
	}

	seen := make(map[string]bool, len(extracted.Value.Fields))
	for _, field := range extracted.Value.Fields {
		if seen[field.Key] {
			t.Fatalf("duplicate extracted field %q", field.Key)
		}
		seen[field.Key] = true

		want, ok := expected[field.Key]
		if !ok {
			t.Fatalf("unexpected extracted field %q", field.Key)
		}
		if field.Value == nil || *field.Value != want {
			t.Fatalf("field %q value = %v, want %q", field.Key, field.Value, want)
		}
		if field.Label == "" {
			t.Fatalf("field %q has an empty label", field.Key)
		}
		if !field.Source.Valid() {
			t.Fatalf("field %q has invalid source %q", field.Key, field.Source)
		}
		if field.Confidence == nil || *field.Confidence < 0 || *field.Confidence > 1 {
			t.Fatalf("field %q confidence = %v, want a value in [0,1]", field.Key, field.Confidence)
		}
	}

	if !checks.Value.Status.Valid() {
		t.Fatalf("invalid check status %q", checks.Value.Status)
	}
	if checks.Value.Stale {
		t.Fatal("fresh synthetic check fixture is marked stale")
	}
	if checks.Value.Disclaimer == "" {
		t.Fatal("check fixture has no disclaimer")
	}
	if len(checks.Value.Items) != 1 {
		t.Fatalf("check count = %d, want 1", len(checks.Value.Items))
	}
	if checks.Value.Summary.Critical != 0 || checks.Value.Summary.Warning != 0 ||
		checks.Value.Summary.Passed != 1 || checks.Value.Summary.NotChecked != 0 {
		t.Fatalf("unexpected check summary: %+v", checks.Value.Summary)
	}

	check := checks.Value.Items[0]
	if !check.Level.Valid() || !check.Scope.Valid() {
		t.Fatalf("invalid check enum values: level=%q scope=%q", check.Level, check.Scope)
	}
	if len(check.DocumentIds) != 1 || check.DocumentIds[0].String() != syntheticDocumentID {
		t.Fatalf("check document IDs = %v, want [%s]", check.DocumentIds, syntheticDocumentID)
	}
	if len(check.FieldKeys) != 1 || check.FieldKeys[0] != "documentNumber" {
		t.Fatalf("check field keys = %v, want [documentNumber]", check.FieldKeys)
	}

	if problem.Value.Status != 409 || problem.Value.Code != "CONSENT_REQUIRED" {
		t.Fatalf("unexpected consent problem: status=%d code=%q", problem.Value.Status, problem.Value.Code)
	}
	if problem.Value.Type == "" || problem.Value.Title == "" || problem.Value.RequestId == "" {
		t.Fatalf("consent problem is incomplete: %+v", problem.Value)
	}

	passport, err := os.Stat(fixturePath(t, "passport.pdf"))
	if err != nil {
		t.Fatalf("stat synthetic passport: %v", err)
	}
	if passport.Size() == 0 {
		t.Fatal("synthetic passport is empty")
	}
}

func loadFixture[T any](t *testing.T, name string) fixtureEnvelope[T] {
	t.Helper()
	envelope := loadJSON[fixtureEnvelope[T]](t, name)
	if envelope.Summary == "" {
		t.Fatalf("fixture %s has an empty summary", name)
	}
	return envelope
}

func loadJSON[T any](t *testing.T, name string) T {
	t.Helper()

	file, err := os.Open(fixturePath(t, name))
	if err != nil {
		t.Fatalf("open fixture %s: %v", name, err)
	}
	defer file.Close()

	decoder := json.NewDecoder(file)
	decoder.DisallowUnknownFields()

	var value T
	if err := decoder.Decode(&value); err != nil {
		t.Fatalf("decode fixture %s: %v", name, err)
	}
	if err := decoder.Decode(&struct{}{}); err != io.EOF {
		t.Fatalf("fixture %s has trailing JSON data", name)
	}
	return value
}

func fixturePath(t *testing.T, name string) string {
	t.Helper()

	_, currentFile, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("resolve contract test path")
	}
	repositoryRoot := filepath.Clean(filepath.Join(filepath.Dir(currentFile), "..", "..", "..", "..", ".."))
	return filepath.Join(repositoryRoot, "api", "fixtures", "mvp1", "passport", name)
}
