#pragma once

#include <cassert>

namespace aether {

/**
 * @brief Non-owning view over per-channel sample arrays.
 *
 * Wraps the channel pointers a host hands to the plugin for one block. The buffer never
 * allocates or copies samples, so it is safe to construct on the audio thread. The caller
 * keeps the channel arrays alive for as long as the view is used.
 */
class AudioBuffer {
public:
    /** @brief Creates an empty buffer with no channels and no samples. */
    AudioBuffer() = default;

    /**
     * @param channels     Array of @p numChannels channel pointers; may be null if
     *                     @p numChannels is 0.
     * @param numChannels  Number of channels, >= 0.
     * @param numSamples   Number of samples in each channel, >= 0.
     */
    AudioBuffer(float* const* channels, int numChannels, int numSamples) noexcept
        : channels_(channels), numChannels_(numChannels), numSamples_(numSamples) {
        assert(numChannels >= 0 && numSamples >= 0);
        assert(channels != nullptr || numChannels == 0);
    }

    int numChannels() const noexcept {
        return numChannels_;
    }

    int numSamples() const noexcept {
        return numSamples_;
    }

    float* channel(int index) noexcept {
        assert(index >= 0 && index < numChannels_);
        return channels_[index];
    }

    const float* channel(int index) const noexcept {
        assert(index >= 0 && index < numChannels_);
        return channels_[index];
    }

    /** @brief Sets every sample in every channel to zero. */
    void clear() noexcept {
        for (int ch = 0; ch < numChannels_; ++ch) {
            float* samples = channels_[ch];
            for (int i = 0; i < numSamples_; ++i) {
                samples[i] = 0.0f;
            }
        }
    }

private:
    float* const* channels_ = nullptr;
    int numChannels_ = 0;
    int numSamples_ = 0;
};

} // namespace aether
