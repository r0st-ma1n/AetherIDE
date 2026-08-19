include(FetchContent)

FetchContent_Declare(
    clap
    GIT_REPOSITORY https://github.com/free-audio/clap.git
    GIT_TAG main
)
FetchContent_MakeAvailable(clap)

add_library(aether_core
    src/AudioProcessorParameter.cpp
)

target_include_directories(aether_core
    PUBLIC
        ${CMAKE_CURRENT_SOURCE_DIR}/include
)

target_link_libraries(aether_core PUBLIC clap)

add_executable(widget_host_test
    tests/widget_host_test.cpp
)
target_link_libraries(widget_host_test PRIVATE aether_core)
add_test(NAME widget_host_test COMMAND widget_host_test)
