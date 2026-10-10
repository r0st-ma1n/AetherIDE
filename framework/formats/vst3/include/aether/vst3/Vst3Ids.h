#pragma once

#include <array>
#include <cstdint>
#include <string_view>

namespace aether::vst3 {

/** @brief 128-bit FNV-1a hash of @p data, big-endian. */
std::array<std::uint8_t, 16> fnv1a128(std::string_view data) noexcept;

/**
 * @brief VST3 class ID of the plugin's component: FNV-1a 128 of "aether.vst3/" + PluginInfo::id.
 *
 * The module builds the FUID from these bytes as four big-endian words, so the class ID
 * string (e.g. in moduleinfo.json) is their hex on every platform. The same plugin id always
 * gives the same class ID, in every build. DAWs find the plugin in saved projects by
 * it, which is why PluginInfo::id must never change after release.
 */
std::array<std::uint8_t, 16> componentClassId(std::string_view pluginId) noexcept;

} // namespace aether::vst3
