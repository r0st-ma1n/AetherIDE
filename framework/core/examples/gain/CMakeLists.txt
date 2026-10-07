add_executable(gain_console_test
    GainPlugin.cpp
    main.cpp
)

target_link_libraries(gain_console_test
    PRIVATE
        aether_core
)

add_executable(gain_processor_test
    GainPlugin.cpp
    gain_processor_test.cpp
)
target_link_libraries(gain_processor_test PRIVATE aether_core aether_test_support)
add_test(NAME gain_processor_test COMMAND gain_processor_test)
