#pragma once

#include "aether/AudioProcessorParameter.h"

#include <cstdint>
#include <span>
#include <vector>

namespace aether {

/**
 * @brief Serialised plugin state, as stored by the DAW in projects and presets.
 *
 * Binary, little-endian on every platform:
 *
 *     "AETS"                magic, 4 bytes
 *     u32 formatVersion     kPluginStateFormatVersion
 *     u32 parameterCount
 *     parameterCount x { u32 idLength, idLength bytes of id, f32 plain value }
 *     u32 customLength
 *     customLength bytes    opaque data from PluginProcessor::saveCustomState()
 *
 * Parameters are stored by string id and plain value, so a state survives a plugin update
 * that adds, removes or reorders parameters, or changes a range (the value is clamped).
 */
using PluginState = std::vector<std::uint8_t>;

/** @brief Current version of the format above; bumped on incompatible changes. */
inline constexpr std::uint32_t kPluginStateFormatVersion = 1;

/** @brief Serialises all parameter values and @p customData. */
PluginState savePluginState(const ParameterLayout& parameters,
                            std::span<const std::uint8_t> customData = {});

/**
 * @brief Restores parameter values from @p state.
 *
 * Every parameter missing from the state gets its default value; ids the layout does not
 * know are ignored. The state is fully validated before anything changes: if it is
 * truncated, corrupt or from a newer format version, nothing is changed and the function
 * returns false.
 *
 * @param customData  Receives the opaque custom block; may be null.
 * @return true if the state was applied.
 */
bool loadPluginState(ParameterLayout& parameters, std::span<const std::uint8_t> state,
                     std::vector<std::uint8_t>* customData = nullptr);

} // namespace aether
