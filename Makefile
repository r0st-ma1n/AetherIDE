.PHONY: help ide-install ide-dev ide-build ide-start ide-lint ide-test ide-typecheck ide-format ide-format-check cmake-configure cmake-build cmake-test cpp-format cpp-format-check test run-all

BUILD_DIR ?= build
IDE_DIR := ide
BUILD_CONFIG ?= Release
CLANG_FORMAT ?= clang-format
# The vendored VST3 SDK keeps its upstream formatting.
CPP_SOURCES = $(shell git ls-files "*.cpp" "*.h" ":!:framework/formats/vst3/sdk/")

help:
	@echo Available targets:
	@echo
	@echo [IDE]
	@echo   ide-install       Install frontend dependencies
	@echo   ide-dev           Run Electron + Vite dev mode
	@echo   ide-build         Build the IDE frontend
	@echo   ide-start         Start the Electron app
	@echo
	@echo [IDE Checks]
	@echo   ide-lint          Run ESLint for the IDE
	@echo   ide-test          Run IDE unit tests
	@echo   ide-typecheck     Run Vue/TypeScript type checking
	@echo   ide-format        Format IDE files with Prettier
	@echo   ide-format-check  Check IDE formatting with Prettier
	@echo
	@echo [CMake]
	@echo   cmake-configure   Configure the CMake project
	@echo   cmake-build       Build the CMake project
	@echo   cmake-test        Run C++ tests with CTest
	@echo
	@echo [C++ Checks]
	@echo   cpp-format        Format C++ sources with clang-format
	@echo   cpp-format-check  Check C++ formatting (pip install -r requirements-dev.txt)
	@echo
	@echo [Project]
	@echo   test              Run all available project checks
	@echo   run-all           Build backend and frontend, then start the IDE

# IDE
ide-install:
	npm --prefix $(IDE_DIR) install

ide-dev:
	npm --prefix $(IDE_DIR) run dev

ide-build:
	npm --prefix $(IDE_DIR) run build

ide-start:
	npm --prefix $(IDE_DIR) start

# IDE Checks
ide-lint:
	npm --prefix $(IDE_DIR) run lint

ide-test: ide-install
	npm --prefix $(IDE_DIR) test

ide-typecheck:
	npm --prefix $(IDE_DIR) run typecheck

ide-format:
	npm --prefix $(IDE_DIR) run format

ide-format-check:
	npm --prefix $(IDE_DIR) run format:check

# CMake
cmake-configure:
	cmake -S . -B $(BUILD_DIR)

cmake-build:
	cmake --build $(BUILD_DIR) --config $(BUILD_CONFIG)

cmake-test: cmake-build
	ctest --test-dir $(BUILD_DIR) -C $(BUILD_CONFIG) --output-on-failure

# C++ Checks
cpp-format:
	$(CLANG_FORMAT) -i $(CPP_SOURCES)

cpp-format-check:
	$(CLANG_FORMAT) --dry-run --Werror $(CPP_SOURCES)

# Project
test: cmake-configure cmake-build cmake-test cpp-format-check ide-format-check ide-lint ide-test ide-typecheck ide-build

run-all: cmake-configure cmake-build ide-build ide-start
