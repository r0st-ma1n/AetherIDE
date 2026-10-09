#pragma once

#include "aether/PluginInfo.h"
#include "aether/PluginProcessor.h"

#include <cstdint>
#include <memory>
#include <type_traits>

namespace aether {

/**
 * @brief Entry point of a plugin binary: what the plugin is and how to create it.
 *
 * Format adapters use only this, so they never depend on the plugin's class.
 */
struct PluginFactory {
    /** Returns the plugin's description; callable before any instance exists. */
    PluginInfo (*info)();
    /** Creates a new, unprepared processor instance. */
    std::unique_ptr<PluginProcessor> (*create)();
};

/**
 * @brief Version of the in-process plugin ABI used by dynamically loaded plugins.
 *
 * A plugin module and a host that loads it (aether_host) exchange C++ objects, so both must
 * be built with the same compiler, standard library and Aether version. The host refuses
 * modules with a different ABI version. Format adapters (VST3, CLAP, AU) do not use this:
 * they are linked into the plugin binary.
 */
inline constexpr std::uint32_t kPluginAbiVersion = 1;

/**
 * @brief The factory registered with AETHER_PLUGIN in this binary.
 *
 * Defined by AETHER_PLUGIN; a binary without it fails to link, a binary with two fails to
 * link too. One plugin per binary.
 */
const PluginFactory& pluginFactory();

} // namespace aether

#if defined(_WIN32)
#define AETHER_PLUGIN_EXPORT __declspec(dllexport)
#else
#define AETHER_PLUGIN_EXPORT __attribute__((visibility("default")))
#endif

/**
 * @brief Registers @p ClassName as the plugin of this binary.
 *
 * Use once, at global scope, in one .cpp file. @p ClassName must derive from
 * aether::PluginProcessor, be default-constructible and have
 * `static aether::PluginInfo pluginInfo()`.
 *
 * Also exports two C functions so a host can load the plugin from a shared library:
 * `aether_plugin_abi_version()` and `aether_plugin_factory()`.
 */
#define AETHER_PLUGIN(ClassName)                                                                   \
    static_assert(std::is_base_of_v<::aether::PluginProcessor, ClassName>,                         \
                  #ClassName " must derive from aether::PluginProcessor");                         \
    const ::aether::PluginFactory& aether::pluginFactory() {                                       \
        static const ::aether::PluginFactory factory{                                              \
            &ClassName::pluginInfo, []() -> std::unique_ptr<::aether::PluginProcessor> {           \
                return std::make_unique<ClassName>();                                              \
            }};                                                                                    \
        return factory;                                                                            \
    }                                                                                              \
    extern "C" AETHER_PLUGIN_EXPORT std::uint32_t aether_plugin_abi_version() {                    \
        return ::aether::kPluginAbiVersion;                                                        \
    }                                                                                              \
    extern "C" AETHER_PLUGIN_EXPORT const ::aether::PluginFactory* aether_plugin_factory() {       \
        return &::aether::pluginFactory();                                                         \
    }
