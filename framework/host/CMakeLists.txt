# Headless host: loads Aether plugins and renders audio offline. The first format adapter.

add_library(aether_hosting
    src/AudioClip.cpp
    src/HostCli.cpp
    src/OfflineRenderer.cpp
    src/PluginLibrary.cpp
    src/WavFile.cpp
    src/platform/DynamicLibrary.cpp
)
target_include_directories(aether_hosting PUBLIC ${CMAKE_CURRENT_SOURCE_DIR}/include)
target_link_libraries(aether_hosting PUBLIC aether_core PRIVATE ${CMAKE_DL_LIBS})

add_executable(aether_host tools/aether_host.cpp)
target_link_libraries(aether_host PRIVATE aether_hosting)

add_executable(wav_file_test tests/wav_file_test.cpp)
target_link_libraries(wav_file_test PRIVATE aether_hosting aether_test_support)
add_test(NAME wav_file_test COMMAND wav_file_test)

add_executable(offline_renderer_test tests/offline_renderer_test.cpp)
target_link_libraries(offline_renderer_test PRIVATE aether_hosting aether_test_support)
add_test(NAME offline_renderer_test COMMAND offline_renderer_test)
