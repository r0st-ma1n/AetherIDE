# Aether framework. Plugin projects pull it with
#   FetchContent_Declare(aether GIT_REPOSITORY ... GIT_TAG v<version> SOURCE_SUBDIR framework)
# The monorepo root adds it with add_subdirectory().
cmake_minimum_required(VERSION 3.22)

project(Aether VERSION 0.2.0 LANGUAGES CXX)

# Read by plugin projects after FetchContent_MakeAvailable to check the minimum version.
# Keep in sync with AETHER_FRAMEWORK_VERSION in ide/src/shared/lib/frameworkVersion.ts.
set(AETHER_VERSION ${PROJECT_VERSION} CACHE INTERNAL "Aether framework version")

# Tests and examples are for framework development, not for plugin projects.
option(AETHER_BUILD_TESTS "Build the Aether framework tests and examples" ${PROJECT_IS_TOP_LEVEL})

# Format adapters. VST3 is the only format of v1.
option(AETHER_BUILD_VST3 "Build the VST3 format support" ON)

if (PROJECT_IS_TOP_LEVEL)
  set(CMAKE_CXX_STANDARD 20)
  set(CMAKE_CXX_STANDARD_REQUIRED ON)
  set(CMAKE_CXX_EXTENSIONS OFF)
  include(CTest)
endif()

add_subdirectory(core)
add_subdirectory(host)

if (AETHER_BUILD_VST3)
  # Short binary directory: the VST3 SDK's object paths are long (see the path check there).
  add_subdirectory(formats/vst3 vst3)
endif()

# aether_add_plugin(): plugin binaries per format. Functions are global, so plugin
# projects can call it after FetchContent_MakeAvailable(aether).
include(${CMAKE_CURRENT_SOURCE_DIR}/cmake/AetherAddPlugin.cmake)

if (AETHER_BUILD_TESTS)
  add_subdirectory(core/examples/gain)
endif()
