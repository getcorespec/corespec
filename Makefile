default: help

.PHONY: help
help: # Show help for each of the Makefile recipes.
	@grep -E '^[a-zA-Z0-9 -]+:.*#'  Makefile | sort | while read -r l; do printf "\033[1;32m$$(echo $$l | cut -f 1 -d':')\033[00m:$$(echo $$l | cut -f 2- -d'#')\n"; done

.PHONY: install
install: # Build and install both CLIs globally.
	pnpm install
	pnpm -r build
	npm install -g ./packages/specguard
	npm install -g ./packages/respec

.PHONY: build
build: # Build all packages.
	pnpm -r build

.PHONY: test
test: # Run all tests.
	pnpm -r test

.PHONY: dev
dev: # Watch mode for all packages.
	pnpm -r dev
