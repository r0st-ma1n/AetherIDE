add_library(aether_core
    src/AudioProcessorParameter.cpp
    src/PluginInfo.cpp
    src/PluginState.cpp
)

target_include_directories(aether_core
    PUBLIC
        ${CMAKE_CURRENT_SOURCE_DIR}/include
)
target_compile_features(aether_core PUBLIC cxx_std_20)
# Linked into plugin modules (shared libraries).
set_target_properties(aether_core PROPERTIES POSITION_INDEPENDENT_CODE ON)

if (AETHER_BUILD_TESTS)
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

  add_executable(plugin_contract_test
      tests/plugin_contract_test.cpp
      tests/contract/ContractTestPlugin.cpp
  )
  target_link_libraries(plugin_contract_test PRIVATE aether_core aether_test_support)
  add_test(NAME plugin_contract_test COMMAND plugin_contract_test)

  add_executable(plugin_state_test
      tests/plugin_state_test.cpp
  )
  target_link_libraries(plugin_state_test PRIVATE aether_core aether_test_support)
  add_test(NAME plugin_state_test COMMAND plugin_state_test)

  add_executable(smoothed_value_test
      tests/smoothed_value_test.cpp
  )
  target_link_libraries(smoothed_value_test PRIVATE aether_core aether_test_support)
  add_test(NAME smoothed_value_test COMMAND smoothed_value_test)

  add_executable(widget_host_test
      tests/widget_host_test.cpp
  )
  target_link_libraries(widget_host_test PRIVATE aether_core)
  add_test(NAME widget_host_test COMMAND widget_host_test)
endif()
