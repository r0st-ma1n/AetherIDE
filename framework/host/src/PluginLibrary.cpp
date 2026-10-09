#include "aether/host/PluginLibrary.h"

#include "platform/DynamicLibrary.h"

#include <cstdint>
#include <stdexcept>
#include <string>

namespace aether::host {

namespace {

using AbiVersionFn = std::uint32_t (*)();
using FactoryFn = const PluginFactory* (*)();

std::runtime_error loadError(const std::filesystem::path& path, const std::string& message) {
    return std::runtime_error("Plugin " + path.string() + ": " + message);
}

} // namespace

PluginLibrary::PluginLibrary(const std::filesystem::path& path) : path_(path) {
    std::string error;
    handle_ = platform::openLibrary(path, error);
    if (handle_ == nullptr) {
        throw loadError(path, error);
    }

    try {
        auto abiVersion = reinterpret_cast<AbiVersionFn>(
            platform::findSymbol(handle_, "aether_plugin_abi_version"));
        auto factory =
            reinterpret_cast<FactoryFn>(platform::findSymbol(handle_, "aether_plugin_factory"));
        if (abiVersion == nullptr || factory == nullptr) {
            throw loadError(path, "not an Aether plugin (no AETHER_PLUGIN entry point)");
        }
        if (abiVersion() != kPluginAbiVersion) {
            throw loadError(path, "plugin ABI version " + std::to_string(abiVersion()) +
                                      ", host expects " + std::to_string(kPluginAbiVersion));
        }
        factory_ = factory();
        if (factory_ == nullptr) {
            throw loadError(path, "plugin returned no factory");
        }
    } catch (...) {
        platform::closeLibrary(handle_);
        throw;
    }
}

PluginLibrary::~PluginLibrary() {
    platform::closeLibrary(handle_);
}

} // namespace aether::host
