#pragma once

#include "aether/host/AudioClip.h"

#include <filesystem>

namespace aether::host {

/**
 * @brief Reads a RIFF/WAVE file.
 *
 * Supports PCM 16/24/32-bit integer and 32-bit float, any channel count; unknown chunks are
 * skipped. Samples are converted to float in [-1, 1].
 *
 * @throws std::runtime_error if the file cannot be read or the format is not supported.
 */
AudioClip readWav(const std::filesystem::path& path);

/**
 * @brief Writes @p clip as a 32-bit float WAVE file, so plugin output is stored losslessly.
 * @throws std::runtime_error if the file cannot be written.
 */
void writeWav(const std::filesystem::path& path, const AudioClip& clip);

} // namespace aether::host
