add_library(aether_core
    src/AudioProcessorParameter.cpp
)

target_include_directories(aether_core
    PUBLIC
        ${CMAKE_CURRENT_SOURCE_DIR}/include
)

# Test helpers: Check.h and a global operator new replacement that counts allocations.
add_library(aether_test_support OBJECT
    tests/support/AllocationCounter.cpp
)
target_include_directories(aether_test_support PUBLIC ${CMAKE_CURRENT_SOURCE_DIR}/tests)

add_executable(audio_buffer_test
    tests/audio_buffer_test.cpp
)
target_link_libraries(audio_buffer_test PRIVATE aether_core aether_test_support)
add_test(NAME audio_buffer_test COMMAND audio_buffer_test)

add_executable(parameter_test
    tests/parameter_test.cpp
)
target_link_libraries(parameter_test PRIVATE aether_core aether_test_support)
add_test(NAME parameter_test COMMAND parameter_test)

add_executable(widget_host_test
    tests/widget_host_test.cpp
)
target_link_libraries(widget_host_test PRIVATE aether_core)
add_test(NAME widget_host_test COMMAND widget_host_test)
