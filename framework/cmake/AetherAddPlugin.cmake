# aether_add_plugin(<target> FORMATS <format>... [VERSION <x.y.z>])
#
# Builds the plugin code in <target> as plugin binaries, one per format:
#   VST3  <target>_VST3: bundle <build>/VST3/<target>.vst3 with moduleinfo.json
#   HOST  <target>_Host: module for aether_host (headless rendering and tests)
#
# <target> must be an OBJECT library with the processor (and AETHER_PLUGIN), so its code is
# linked into every format binary. VERSION is the module version written to moduleinfo.json;
# it defaults to PROJECT_VERSION.
#
#   add_library(MyPlugin OBJECT MyPluginProcessor.cpp)
#   aether_add_plugin(MyPlugin FORMATS VST3 HOST)

function(aether_add_plugin target)
  cmake_parse_arguments(PARSE_ARGV 1 ARG "" "VERSION" "FORMATS")
  if (ARG_UNPARSED_ARGUMENTS)
    message(FATAL_ERROR "aether_add_plugin(${target}): unknown arguments ${ARG_UNPARSED_ARGUMENTS}")
  endif()
  if (NOT ARG_FORMATS)
    message(FATAL_ERROR "aether_add_plugin(${target}): FORMATS is required, e.g. FORMATS VST3")
  endif()
  if (NOT TARGET ${target})
    message(FATAL_ERROR "aether_add_plugin(${target}): no such target")
  endif()
  get_target_property(type ${target} TYPE)
  if (NOT type STREQUAL "OBJECT_LIBRARY")
    message(FATAL_ERROR
      "aether_add_plugin(${target}): ${target} must be an OBJECT library, e.g. "
      "add_library(${target} OBJECT ...), so its code goes into every plugin binary.")
  endif()

  set(version "${ARG_VERSION}")
  if (NOT version)
    set(version "${PROJECT_VERSION}")
  endif()
  if (NOT version)
    set(version "1.0.0")
  endif()

  set_target_properties(${target} PROPERTIES POSITION_INDEPENDENT_CODE ON)
  target_link_libraries(${target} PUBLIC aether_core)

  foreach(format IN LISTS ARG_FORMATS)
    if (format STREQUAL "VST3")
      _aether_add_vst3(${target} ${version})
    elseif (format STREQUAL "HOST")
      _aether_add_host_module(${target})
    else()
      message(FATAL_ERROR "aether_add_plugin(${target}): unknown format ${format} (VST3, HOST)")
    endif()
  endforeach()
endfunction()

function(_aether_add_host_module target)
  add_library(${target}_Host MODULE)
  target_link_libraries(${target}_Host PRIVATE ${target})
  set_target_properties(${target}_Host PROPERTIES PREFIX "")
endfunction()

function(_aether_add_vst3 target version)
  if (NOT TARGET aether_vst3)
    message(FATAL_ERROR
      "aether_add_plugin(${target}): VST3 support is off (AETHER_BUILD_VST3=OFF).")
  endif()

  # Bundle layout from the VST3 SDK: <name>.vst3/Contents/<arch>-<os>/<name>.<ext>
  if (CMAKE_SIZEOF_VOID_P EQUAL 8)
    set(arch "x86_64")
  else()
    set(arch "x86")
  endif()
  if (WIN32)
    set(contents "${arch}-win")
    set(suffix ".vst3")
    set(entry "${AETHER_VST3_SDK_DIR}/public.sdk/source/main/dllmain.cpp")
  else()
    set(contents "${arch}-linux")
    set(suffix ".so")
    set(entry "${AETHER_VST3_SDK_DIR}/public.sdk/source/main/linuxmain.cpp")
  endif()
  set(bundle "${CMAKE_BINARY_DIR}/VST3/${target}.vst3")

  add_library(${target}_VST3 MODULE "${AETHER_VST3_MODULE_SOURCE}" "${entry}")
  target_link_libraries(${target}_VST3 PRIVATE ${target} aether_vst3)
  set_target_properties(${target}_VST3 PROPERTIES
    OUTPUT_NAME "${target}"
    PREFIX ""
    SUFFIX "${suffix}"
    # $<0:> keeps multi-config generators from appending the configuration.
    LIBRARY_OUTPUT_DIRECTORY "${bundle}/Contents/${contents}$<0:>"
    CXX_VISIBILITY_PRESET hidden
    VISIBILITY_INLINES_HIDDEN ON
  )
  if (MINGW)
    # A DAW does not have the MinGW runtime DLLs: link them in.
    target_link_options(${target}_VST3 PRIVATE -static)
  endif()

  # moduleinfo.json lets hosts scan the plugin without loading it.
  add_custom_command(TARGET ${target}_VST3 POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E make_directory "${bundle}/Contents/Resources"
    COMMAND aether_vst3_moduleinfotool -create -version ${version} -path "${bundle}"
            -output "${bundle}/Contents/Resources/moduleinfo.json"
    VERBATIM
  )
endfunction()
