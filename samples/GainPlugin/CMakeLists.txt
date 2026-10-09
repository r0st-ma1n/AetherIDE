cmake_minimum_required(VERSION 3.22)
project(GainPlugin VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

include(CTest)

# Aether framework, pinned to the version this project was created with. It is always
# built from source as part of the project. To build against a local checkout without
# network access (AetherIDE does this), pass
#   -DFETCHCONTENT_SOURCE_DIR_AETHER=<AetherIDE repository root>
set(AETHER_MIN_VERSION 0.1.0)

if (NOT TARGET aether_core)
  include(FetchContent)
  FetchContent_Declare(aether
    GIT_REPOSITORY https://github.com/r0st-ma1n/AetherIDE.git
    GIT_TAG v0.1.0
    GIT_SHALLOW TRUE
    SOURCE_SUBDIR framework
  )
  FetchContent_MakeAvailable(aether)
endif()

if (NOT TARGET aether_core)
  message(FATAL_ERROR
    "Aether framework not found. FETCHCONTENT_SOURCE_DIR_AETHER must point to the "
    "AetherIDE repository root, not to its framework/ directory.")
endif()
if (AETHER_VERSION VERSION_LESS AETHER_MIN_VERSION)
  message(FATAL_ERROR
    "GainPlugin needs Aether ${AETHER_MIN_VERSION} or newer, found ${AETHER_VERSION}.")
endif()

# Plugin module: the processor plus the designer UI class (compiled, unused until the
# plugin window lands).
add_library(GainPlugin MODULE
    GainPluginProcessor.cpp
    GainPlugin.cpp
)

target_link_libraries(GainPlugin PRIVATE aether_core)
target_include_directories(GainPlugin PRIVATE .)
set_target_properties(GainPlugin PROPERTIES PREFIX "")

# Smoke tests in the headless host: the plugin loads and processes audio.
if (BUILD_TESTING AND TARGET aether_host)
  add_test(NAME GainPlugin_loads
    COMMAND aether_host --plugin $<TARGET_FILE:GainPlugin> --list-params)
  add_test(NAME GainPlugin_renders
    COMMAND aether_host --plugin $<TARGET_FILE:GainPlugin> --sine 440 --duration 0.1
            --out ${CMAKE_CURRENT_BINARY_DIR}/GainPlugin_renders.wav)
  set_tests_properties(GainPlugin_renders PROPERTIES PASS_REGULAR_EXPRESSION "Rendered")
endif()
