GO_MODULE_DIR := backend/core
OPENAPI_CONFIG := ../../api/codegen/oapi-codegen.yaml
OPENAPI_SPEC := ../../api/openapi.yaml

.PHONY: run generate generate-openapi

run:
	go -C $(GO_MODULE_DIR) run ./cmd/api

generate: generate-openapi

generate-openapi:
	go -C $(GO_MODULE_DIR) tool oapi-codegen \
		-config $(OPENAPI_CONFIG) \
		$(OPENAPI_SPEC)
