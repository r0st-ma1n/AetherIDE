#pragma once

#include <string>

namespace aether {

/** @brief Kind of plugin, as shown in the DAW's plugin browser. */
enum class PluginCategory {
    /** Audio effect: audio in, audio out. Instruments come with MIDI, after v1. */
    Effect,
};

/** @brief Plugin version, major.minor.patch. */
struct PluginVersion {
    int major = 1;
    int minor = 0;
    int patch = 0;

    /** @brief "major.minor.patch", e.g. "1.2.0". */
    std::string toString() const;
};

/**
 * @brief Static description of a plugin, independent of the plugin format.
 *
 * Format adapters derive what their format needs from it: VST3 class IDs, the CLAP plugin
 * id, AU component codes. Provide it from a static `pluginInfo()` function of the processor
 * class and register the class with AETHER_PLUGIN.
 */
struct PluginInfo {
    /** Display name, e.g. "Gain". */
    std::string name;
    /** Company or author, e.g. "Aether Audio". */
    std::string vendor;
    /**
     * Globally unique id in reverse-DNS form, e.g. "com.aetheraudio.gain". Adapters derive
     * format IDs from it, so never change it after release: DAWs would treat the plugin as
     * a different one and lose it from saved projects.
     */
    std::string id;
    PluginVersion version;
    /** Vendor website; optional. */
    std::string url;
    /** Support e-mail; optional. */
    std::string email;
    PluginCategory category = PluginCategory::Effect;
};

/**
 * @brief Checks the fields adapters rely on.
 * @throws std::invalid_argument naming the first invalid field.
 */
void validatePluginInfo(const PluginInfo& info);

} // namespace aether
