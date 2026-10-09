#pragma once

#include <filesystem>
#include <string>

// The only platform-specific code of the host: loading shared libraries.
namespace aether::host::platform {

/** @return Library handle, or nullptr with @p error set. */
void* openLibrary(const std::filesystem::path& path, std::string& error);

/** @return Symbol address, or nullptr if the library has no such symbol. */
void* findSymbol(void* library, const char* name);

void closeLibrary(void* library);

} // namespace aether::host::platform
