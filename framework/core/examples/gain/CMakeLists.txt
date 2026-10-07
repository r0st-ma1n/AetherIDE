# GainPlugin as a loadable plugin module, the way aether_host and format adapters use it.
add_library(gain_plugin MODULE GainPlugin.cpp)
target_link_libraries(gain_plugin PRIVATE aether_core)
set_target_properties(gain_plugin PROPERTIES PREFIX "")

# Unit test: GainPlugin linked statically, checks processing and allocations.
add_executable(gain_processor_test
    GainPlugin.cpp
    gain_processor_test.cpp
)
target_link_libraries(gain_processor_test PRIVATE aether_core aether_test_support)
add_test(NAME gain_processor_test COMMAND gain_processor_test)

# Integration test: loads the gain_plugin module through the headless host.
add_executable(gain_host_test gain_host_test.cpp)
target_link_libraries(gain_host_test PRIVATE aether_hosting aether_test_support)
add_dependencies(gain_host_test gain_plugin)
add_test(NAME gain_host_test COMMAND gain_host_test $<TARGET_FILE:gain_plugin>)
