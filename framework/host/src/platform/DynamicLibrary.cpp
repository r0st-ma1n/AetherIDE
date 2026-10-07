#include "DynamicLibrary.h"

#if defined(_WIN32)
#ifndef NOMINMAX
#define NOMINMAX
#endif
#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN
#endif
#include <windows.h>
#else
#include <dlfcn.h>
#endif

namespace aether::host::platform {

#if defined(_WIN32)

void* openLibrary(const std::filesystem::path& path, std::string& error) {
    HMODULE module = LoadLibraryW(path.c_str());
    if (module == nullptr) {
        error = "LoadLibrary failed with error " + std::to_string(GetLastError());
    }
    return reinterpret_cast<void*>(module);
}

void* findSymbol(void* library, const char* name) {
    return reinterpret_cast<void*>(GetProcAddress(static_cast<HMODULE>(library), name));
}

void closeLibrary(void* library) {
    FreeLibrary(static_cast<HMODULE>(library));
}

#else

void* openLibrary(const std::filesystem::path& path, std::string& error) {
    void* handle = dlopen(path.c_str(), RTLD_NOW | RTLD_LOCAL);
    if (handle == nullptr) {
        const char* message = dlerror();
        error = message != nullptr ? message : "dlopen failed";
    }
    return handle;
}

void* findSymbol(void* library, const char* name) {
    return dlsym(library, name);
}

void closeLibrary(void* library) {
    dlclose(library);
}

#endif

} // namespace aether::host::platform
