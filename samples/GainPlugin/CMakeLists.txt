cmake_minimum_required(VERSION 3.22)
project(GainPlugin LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Prefer the monorepo framework when this sample is opened as a project root.
set(AETHER_CORE_DIR "${CMAKE_CURRENT_SOURCE_DIR}/../../framework/core")
if (NOT TARGET aether_core AND EXISTS "${AETHER_CORE_DIR}/CMakeLists.txt")
  add_subdirectory("${AETHER_CORE_DIR}" "${CMAKE_BINARY_DIR}/aether_core")
endif()

if (NOT TARGET aether_core)
  message(FATAL_ERROR
    "aether_core not found. Open this sample from the AetherIDE monorepo "
    "(samples/GainPlugin) or set up the framework path.")
endif()

add_library(GainPlugin SHARED
  GainPlugin.cpp
  GainPlugin.h
)

target_link_libraries(GainPlugin PRIVATE aether_core)
target_include_directories(GainPlugin PRIVATE .)
