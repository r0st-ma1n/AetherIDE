cmake_minimum_required(VERSION 3.22)

project(AudioPluginPlatform LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

include(CTest)

add_subdirectory(framework/core)
add_subdirectory(framework/core/examples/gain)
add_subdirectory(samples/GainPlugin)
add_subdirectory(ide/native)