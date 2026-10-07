#pragma once

#include "aether/AudioBuffer.h"

#include <stdexcept>
#include <vector>

namespace aether {

/**
 * @brief Audio storage that owns its samples, for tests and offline rendering.
 *
 * Allocates on construction, so never create one on the audio thread. Use view() to pass
 * the samples to code that takes an AudioBuffer.
 */
class OwningAudioBuffer {
public:
    /**
     * @param numChannels  Number of channels, >= 0.
     * @param numSamples   Number of samples per channel, >= 0.
     * @throws std::invalid_argument if a size is negative.
     */
    OwningAudioBuffer(int numChannels, int numSamples)
        : numChannels_(numChannels), numSamples_(numSamples) {
        if (numChannels < 0 || numSamples < 0) {
            throw std::invalid_argument("Invalid audio buffer size");
        }

        samples_.assign(static_cast<std::size_t>(numChannels) * numSamples, 0.0f);
        channels_.resize(numChannels);
        for (int ch = 0; ch < numChannels; ++ch) {
            channels_[ch] = samples_.data() + static_cast<std::size_t>(ch) * numSamples;
        }
    }

    // The view points into this object's storage, so it must not be copied or moved.
    OwningAudioBuffer(const OwningAudioBuffer&) = delete;
    OwningAudioBuffer& operator=(const OwningAudioBuffer&) = delete;

    int numChannels() const noexcept {
        return numChannels_;
    }

    int numSamples() const noexcept {
        return numSamples_;
    }

    float* channel(int index) noexcept {
        return channels_[index];
    }

    const float* channel(int index) const noexcept {
        return channels_[index];
    }

    /** @brief Non-owning view over all channels; valid while this object is alive. */
    AudioBuffer view() noexcept {
        return AudioBuffer(channels_.data(), numChannels_, numSamples_);
    }

private:
    int numChannels_;
    int numSamples_;
    std::vector<float> samples_;
    std::vector<float*> channels_;
};

} // namespace aether
