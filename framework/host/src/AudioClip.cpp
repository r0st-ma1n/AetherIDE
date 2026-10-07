#include "aether/host/AudioClip.h"

#include <cmath>
#include <numbers>
#include <stdexcept>

namespace aether::host {

namespace {

void checkShape(int numChannels, int numFrames, double sampleRate) {
    if (numChannels < 0 || numFrames < 0 || !(sampleRate > 0.0)) {
        throw std::invalid_argument("Invalid audio clip shape");
    }
}

} // namespace

float AudioClip::peak() const noexcept {
    float result = 0.0f;
    for (const auto& channel : channels) {
        for (const float sample : channel) {
            result = std::fmax(result, std::fabs(sample));
        }
    }
    return result;
}

AudioClip AudioClip::silence(int numChannels, int numFrames, double sampleRate) {
    return constant(0.0f, numChannels, numFrames, sampleRate);
}

AudioClip AudioClip::constant(float value, int numChannels, int numFrames, double sampleRate) {
    checkShape(numChannels, numFrames, sampleRate);
    AudioClip clip;
    clip.sampleRate = sampleRate;
    clip.channels.assign(numChannels, std::vector<float>(numFrames, value));
    return clip;
}

AudioClip AudioClip::sine(double frequency, float amplitude, double seconds, double sampleRate,
                          int numChannels) {
    const int numFrames = static_cast<int>(std::lround(seconds * sampleRate));
    AudioClip clip = silence(numChannels, numFrames, sampleRate);
    for (int i = 0; i < numFrames; ++i) {
        const double phase = 2.0 * std::numbers::pi * frequency * i / sampleRate;
        const float sample = amplitude * static_cast<float>(std::sin(phase));
        for (auto& channel : clip.channels) {
            channel[i] = sample;
        }
    }
    return clip;
}

} // namespace aether::host
