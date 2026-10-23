package shared

// ID is an internal identifier. Transport and persistence adapters are
// responsible for parsing and validating its UUID representation.
type ID string

func (id ID) IsZero() bool {
	return id == ""
}
