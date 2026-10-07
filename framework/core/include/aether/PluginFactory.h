#pragma once

#include "aether/PluginInfo.h"
#include "aether/PluginProcessor.h"

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
 * @brief The factory registered with AETHER_PLUGIN in this binary.
 *
 * Defined by AETHER_PLUGIN; a binary without it fails to link, a binary with two fails to
 * link too. One plugin per binary.
 */
const PluginFactory& pluginFactory();

} // namespace aether

/**
 * @brief Registers @p ClassName as the plugin of this binary.
 *
 * Use once, at global scope, in one .cpp file. @p ClassName must derive from
 * aether::PluginProcessor, be default-constructible and have
 * `static aether::PluginInfo pluginInfo()`.
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
    }
