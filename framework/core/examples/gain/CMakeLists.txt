add_executable(gain_console_test
    GainPlugin.cpp
    main.cpp
)

target_link_libraries(gain_console_test
    PRIVATE
        aether_core
)