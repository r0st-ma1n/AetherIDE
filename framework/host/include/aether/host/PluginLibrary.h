#pragma once

#include "aether/PluginFactory.h"

#include <filesystem>

namespace aether::host {

/**
 * @brief A plugin shared library (.dll / .so / .dylib) built with AETHER_PLUGIN.
 *
 * Loads the module, checks kPluginAbiVersion and exposes its PluginFactory. The module
 * stays loaded for the lifetime of this object, so destroy every processor created by
 * factory() before it:
 *
 *     PluginLibrary library("gain_plugin.dll");
 *     auto plugin = library.factory().create();   // destroyed before `library`
 *
 * The module must be built with the same compiler, standard library and Aether version
 * as the host (see kPluginAbiVersion).
 */
class PluginLibrary {
public:
    /** @throws std::runtime_error if the module cannot be loaded or is not an Aether plugin. */
    explicit PluginLibrary(const std::filesystem::path& path);
    ~PluginLibrary();

    PluginLibrary(const PluginLibrary&) = delete;
    PluginLibrary& operator=(const PluginLibrary&) = delete;

    const PluginFactory& factory() const noexcept {
        return *factory_;
    }

    const std::filesystem::path& path() const noexcept {
        return path_;
    }

private:
    std::filesystem::path path_;
    void* handle_ = nullptr;
    const PluginFactory* factory_ = nullptr;
};

} // namespace aether::host
