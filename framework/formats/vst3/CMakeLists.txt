# VST3 format. The Steinberg VST3 SDK is vendored in sdk/ (version in sdk/VERSION, refreshed
# with update-sdk.sh). The targets below mirror base, pluginterfaces, sdk_common and sdk from
# the SDK's cmake/modules/SMTG_VST3_SDK.cmake, without its examples, hosting and VSTGUI.

set(VST3_SDK_DIR ${CMAKE_CURRENT_SOURCE_DIR}/sdk)
# For aether_add_plugin (framework/cmake/AetherAddPlugin.cmake), which runs in the plugin
# project's scope.
set(AETHER_VST3_SDK_DIR ${VST3_SDK_DIR} CACHE INTERNAL "Vendored VST3 SDK")
set(AETHER_VST3_MODULE_SOURCE ${CMAKE_CURRENT_SOURCE_DIR}/module/Vst3Module.cpp
    CACHE INTERNAL "VST3 entry point compiled into each plugin")

# Settings every SDK target and every consumer of the SDK headers needs.
add_library(aether_vst3_sdk_config INTERFACE)
target_include_directories(aether_vst3_sdk_config INTERFACE ${VST3_SDK_DIR})
target_compile_features(aether_vst3_sdk_config INTERFACE cxx_std_17)
# The SDK requires exactly one of DEVELOPMENT / RELEASE.
target_compile_definitions(aether_vst3_sdk_config INTERFACE
    $<IF:$<CONFIG:Debug>,DEVELOPMENT=1,RELEASE=1>
)
if (MSVC)
  target_compile_options(aether_vst3_sdk_config INTERFACE /utf-8)
endif()

function(aether_vst3_sdk_library name)
  add_library(${name} STATIC ${ARGN})
  target_link_libraries(${name} PUBLIC aether_vst3_sdk_config)
  # Linked into plugin modules (shared libraries).
  set_target_properties(${name} PROPERTIES POSITION_INDEPENDENT_CODE ON)
endfunction()

find_package(Threads REQUIRED)

aether_vst3_sdk_library(aether_vst3_base
    ${VST3_SDK_DIR}/base/source/baseiids.cpp
    ${VST3_SDK_DIR}/base/source/fbuffer.cpp
    ${VST3_SDK_DIR}/base/source/fdebug.cpp
    ${VST3_SDK_DIR}/base/source/fdynlib.cpp
    ${VST3_SDK_DIR}/base/source/fobject.cpp
    ${VST3_SDK_DIR}/base/source/fstreamer.cpp
    ${VST3_SDK_DIR}/base/source/fstring.cpp
    ${VST3_SDK_DIR}/base/source/timer.cpp
    ${VST3_SDK_DIR}/base/source/updatehandler.cpp
    ${VST3_SDK_DIR}/base/thread/source/fcondition.cpp
    ${VST3_SDK_DIR}/base/thread/source/flock.cpp
)
# fdynlib uses dlopen on Linux, flock / fcondition use pthreads.
target_link_libraries(aether_vst3_base PUBLIC Threads::Threads ${CMAKE_DL_LIBS})

aether_vst3_sdk_library(aether_vst3_pluginterfaces
    ${VST3_SDK_DIR}/pluginterfaces/base/conststringtable.cpp
    ${VST3_SDK_DIR}/pluginterfaces/base/coreiids.cpp
    ${VST3_SDK_DIR}/pluginterfaces/base/funknown.cpp
    ${VST3_SDK_DIR}/pluginterfaces/base/ustring.cpp
)

aether_vst3_sdk_library(aether_vst3_sdk_common
    ${VST3_SDK_DIR}/public.sdk/source/common/commoniids.cpp
    ${VST3_SDK_DIR}/public.sdk/source/common/commonstringconvert.cpp
    ${VST3_SDK_DIR}/public.sdk/source/common/openurl.cpp
    ${VST3_SDK_DIR}/public.sdk/source/common/readfile.cpp
    ${VST3_SDK_DIR}/public.sdk/source/common/systemclipboard_linux.cpp
    ${VST3_SDK_DIR}/public.sdk/source/common/systemclipboard_win32.cpp
    ${VST3_SDK_DIR}/public.sdk/source/common/threadchecker_linux.cpp
    ${VST3_SDK_DIR}/public.sdk/source/common/threadchecker_win32.cpp
    ${VST3_SDK_DIR}/public.sdk/source/vst/vstpresetfile.cpp
)
target_link_libraries(aether_vst3_sdk_common PUBLIC aether_vst3_base aether_vst3_pluginterfaces)

# Plugin-side SDK, plus SingleComponentEffect, which the SDK leaves to each plugin.
# Left out of the SDK's own list: utility/dataexchange.cpp (optional IDataExchange; uses
# std::aligned_alloc, missing in MinGW) and utility/vst2persistence.cpp (VST2 presets).
# vsteditcontroller.cpp is not listed either: vstsinglecomponenteffect.cpp includes it with
# setState/getState renamed (the IComponent / IEditController name clash), so compiling it
# separately would define EditController twice.
aether_vst3_sdk_library(aether_vst3_sdk
    ${VST3_SDK_DIR}/public.sdk/source/common/pluginview.cpp
    ${VST3_SDK_DIR}/public.sdk/source/main/pluginfactory.cpp
    ${VST3_SDK_DIR}/public.sdk/source/main/moduleinit.cpp
    ${VST3_SDK_DIR}/public.sdk/source/vst/utility/stringconvert.cpp
    ${VST3_SDK_DIR}/public.sdk/source/vst/utility/systemtime.cpp
    ${VST3_SDK_DIR}/public.sdk/source/vst/utility/testing.cpp
    ${VST3_SDK_DIR}/public.sdk/source/vst/vstaudioeffect.cpp
    ${VST3_SDK_DIR}/public.sdk/source/vst/vstbus.cpp
    ${VST3_SDK_DIR}/public.sdk/source/vst/vstcomponent.cpp
    ${VST3_SDK_DIR}/public.sdk/source/vst/vstcomponentbase.cpp
    ${VST3_SDK_DIR}/public.sdk/source/vst/vstinitiids.cpp
    ${VST3_SDK_DIR}/public.sdk/source/vst/vstnoteexpressiontypes.cpp
    ${VST3_SDK_DIR}/public.sdk/source/vst/vstparameters.cpp
    ${VST3_SDK_DIR}/public.sdk/source/vst/vstrepresentation.cpp
    ${VST3_SDK_DIR}/public.sdk/source/vst/vstsinglecomponenteffect.cpp
)
target_link_libraries(aether_vst3_sdk PUBLIC aether_vst3_sdk_common)

# Host side of the SDK, for the build tools below (and the validator).
aether_vst3_sdk_library(aether_vst3_hosting
    ${VST3_SDK_DIR}/public.sdk/source/vst/hosting/connectionproxy.cpp
    ${VST3_SDK_DIR}/public.sdk/source/vst/hosting/eventlist.cpp
    ${VST3_SDK_DIR}/public.sdk/source/vst/hosting/hostclasses.cpp
    ${VST3_SDK_DIR}/public.sdk/source/vst/hosting/module.cpp
    ${VST3_SDK_DIR}/public.sdk/source/vst/hosting/parameterchanges.cpp
    ${VST3_SDK_DIR}/public.sdk/source/vst/hosting/pluginterfacesupport.cpp
    ${VST3_SDK_DIR}/public.sdk/source/vst/hosting/processdata.cpp
    ${VST3_SDK_DIR}/public.sdk/source/vst/utility/stringconvert.cpp
    ${VST3_SDK_DIR}/public.sdk/source/vst/vstinitiids.cpp
)
if (WIN32)
  target_sources(aether_vst3_hosting PRIVATE
      ${VST3_SDK_DIR}/public.sdk/source/vst/hosting/module_win32.cpp)
elseif (APPLE)
  message(FATAL_ERROR "VST3 on macOS is not supported yet (roadmap block H).")
else()
  target_sources(aether_vst3_hosting PRIVATE
      ${VST3_SDK_DIR}/public.sdk/source/vst/hosting/module_linux.cpp)
endif()
target_link_libraries(aether_vst3_hosting PUBLIC aether_vst3_sdk_common)
# The SDK's host code is C++17: in C++20 path::u8string() returns std::u8string, which
# module_win32.cpp does not expect (MSVC fails to compile it).
set_target_properties(aether_vst3_hosting PROPERTIES CXX_STANDARD 17)

# Writes Contents/Resources/moduleinfo.json into a built .vst3 bundle.
add_executable(aether_vst3_moduleinfotool
    ${VST3_SDK_DIR}/public.sdk/samples/vst-utilities/moduleinfotool/source/main.cpp
    ${VST3_SDK_DIR}/public.sdk/source/vst/moduleinfo/moduleinfocreator.cpp
    ${VST3_SDK_DIR}/public.sdk/source/vst/moduleinfo/moduleinfoparser.cpp
)
target_link_libraries(aether_vst3_moduleinfotool PRIVATE aether_vst3_hosting)
set_target_properties(aether_vst3_moduleinfotool PROPERTIES CXX_STANDARD 17)
if (MINGW)
  # The tool's Windows entry point is wmain().
  target_link_options(aether_vst3_moduleinfotool PRIVATE -municode)
endif()

# The adapter: one aether::PluginProcessor as a VST3 SingleComponentEffect.
add_library(aether_vst3
    src/Vst3Effect.cpp
    src/Vst3Ids.cpp
)
target_include_directories(aether_vst3 PUBLIC ${CMAKE_CURRENT_SOURCE_DIR}/include)
target_link_libraries(aether_vst3 PUBLIC aether_core aether_vst3_sdk)
set_target_properties(aether_vst3 PROPERTIES POSITION_INDEPENDENT_CODE ON)

if (AETHER_BUILD_TESTS)
  # Builds and links a minimal SingleComponentEffect against the vendored SDK.
  add_executable(vst3_sdk_test tests/vst3_sdk_test.cpp)
  target_link_libraries(vst3_sdk_test PRIVATE aether_vst3_sdk aether_test_support)
  add_test(NAME vst3_sdk_test COMMAND vst3_sdk_test)

  # Drives the adapter like a host; ParameterChanges is the SDK's host-side implementation.
  add_executable(vst3_effect_test
      tests/vst3_effect_test.cpp
      ${VST3_SDK_DIR}/public.sdk/source/vst/hosting/parameterchanges.cpp
  )
  target_link_libraries(vst3_effect_test PRIVATE aether_vst3 aether_test_support)
  add_test(NAME vst3_effect_test COMMAND vst3_effect_test)

  # State and bus arrangements; MemoryStream stands in for the host's stream.
  add_executable(vst3_state_test
      tests/vst3_state_test.cpp
      ${VST3_SDK_DIR}/public.sdk/source/common/memorystream.cpp
  )
  target_link_libraries(vst3_state_test PRIVATE aether_vst3 aether_test_support)
  add_test(NAME vst3_state_test COMMAND vst3_state_test)

  add_executable(vst3_ids_test tests/vst3_ids_test.cpp)
  target_link_libraries(vst3_ids_test PRIVATE aether_vst3 aether_test_support)
  add_test(NAME vst3_ids_test COMMAND vst3_ids_test)
endif()
