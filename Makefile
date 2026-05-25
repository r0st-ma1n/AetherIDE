.PHONY: help ide-install ide-dev ide-build ide-start ide-lint ide-typecheck ide-format ide-format-check cmake-configure cmake-build test run-all

BUILD_DIR ?= build
IDE_DIR := ide

help:
	@echo Available targets:
	@echo   ide-install       Install frontend dependencies
	@echo   ide-dev           Run Electron + Vite dev mode
	@echo   ide-build         Build the IDE frontend
	@echo   ide-start         Start the Electron app
	@echo   ide-lint          Run ESLint for the IDE
	@echo   ide-typecheck     Run Vue/TypeScript type checking
	@echo   ide-format        Format IDE files with Prettier
	@echo   ide-format-check  Check IDE formatting with Prettier
	@echo   cmake-configure   Configure the CMake project
	@echo   cmake-build       Build the CMake project
	@echo   test              Run all available project checks
	@echo   run-all           Build backend and frontend, then start the IDE

ide-install:
	npm --prefix $(IDE_DIR) install

ide-dev:
	npm --prefix $(IDE_DIR) run dev

ide-build:
	npm --prefix $(IDE_DIR) run build

ide-start:
	npm --prefix $(IDE_DIR) start

ide-lint:
	npm --prefix $(IDE_DIR) run lint

ide-typecheck:
	npm --prefix $(IDE_DIR) run typecheck

ide-format:
	npm --prefix $(IDE_DIR) run format

ide-format-check:
	npm --prefix $(IDE_DIR) run format:check

cmake-configure:
	cmake -S . -B $(BUILD_DIR)

cmake-build:
	cmake --build $(BUILD_DIR)

test: cmake-configure cmake-build ide-format-check ide-lint ide-typecheck ide-build

run-all: cmake-configure cmake-build ide-build ide-start
