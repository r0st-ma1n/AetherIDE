#pragma once

#include <vector>

namespace aether::host {

/** @brief Whole piece of audio in memory: one sample vector per channel, all equally long. */
struct AudioClip {
    double sampleRate = 48000.0;
    std::vector<std::vector<float>> channels;

    int numChannels() const noexcept {
        return static_cast<int>(channels.size());
    }

    int numFrames() const noexcept {
        return channels.empty() ? 0 : static_cast<int>(channels.front().size());
    }

    /** @brief Largest absolute sample value over all channels. */
    float peak() const noexcept;

    /** @brief Clip of @p numFrames zero samples per channel. */
    static AudioClip silence(int numChannels, int numFrames, double sampleRate);

    /** @brief Sine of @p frequency Hz and @p amplitude, identical on every channel. */
    static AudioClip sine(double frequency, float amplitude, double seconds, double sampleRate,
                          int numChannels);

    /** @brief Constant value @p value on every sample. */
    static AudioClip constant(float value, int numChannels, int numFrames, double sampleRate);
};

} // namespace aether::host
