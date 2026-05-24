include(FetchContent)

FetchContent_Declare(
    clap
    GIT_REPOSITORY https://github.com/free-audio/clap.git
    GIT_TAG main
)
FetchContent_MakeAvailable(clap)

add_library(apf_core
    src/Parameter.cpp
)

target_include_directories(apf_core
    PUBLIC
        ${CMAKE_CURRENT_SOURCE_DIR}/include
)

target_link_libraries(apf_core PUBLIC clap)