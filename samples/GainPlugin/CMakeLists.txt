cmake_minimum_required(VERSION 3.22)
project(GainPlugin LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

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

# Plugin module: the generated processor plus the designer UI class (compiled, unused
# until the plugin window lands).
add_library(GainPlugin MODULE
  GainPluginProcessor.cpp
  GainPlugin.cpp
)

target_link_libraries(GainPlugin PRIVATE aether_core)
target_include_directories(GainPlugin PRIVATE .)
set_target_properties(GainPlugin PROPERTIES PREFIX "")

# Smoke tests of the IDE-generated code: the module loads in the headless host, exposes
# the parameters from GainPlugin.aether and processes audio.
if (TARGET aether_host AND BUILD_TESTING)
  add_test(NAME gain_sample_list_params
    COMMAND aether_host --plugin $<TARGET_FILE:GainPlugin> --list-params)
  set_tests_properties(gain_sample_list_params PROPERTIES PASS_REGULAR_EXPRESSION
    [=[GainPlugin 1\.0\.0 by Aether \(dev\.aether\.samples\.gain\).*gain  "Gain"  0\.00 \.\. 2\.00  default 1\.00]=])

  add_test(NAME gain_sample_render
    COMMAND aether_host --plugin $<TARGET_FILE:GainPlugin> --sine 440 --duration 0.1
            --param gain=0 --out ${CMAKE_CURRENT_BINARY_DIR}/gain_sample_render.wav)
  set_tests_properties(gain_sample_render PROPERTIES PASS_REGULAR_EXPRESSION "peak out 0 ")
endif()
