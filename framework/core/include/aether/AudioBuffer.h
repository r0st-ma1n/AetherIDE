#pragma once

#include <vector>
#include <stdexcept>

namespace aether {

class AudioBuffer {
public:
    AudioBuffer(int channels, int samples)
        : channels_(channels),
          samples_(samples),
          data_(channels, std::vector<float>(samples, 0.0f)) {
        if (channels <= 0 || samples <= 0) {
            throw std::invalid_argument("Invalid audio buffer size");
        }
    }

    int numChannels() const {
        return channels_;
    }

    int numSamples() const {
        return samples_;
    }

    float* channel(int index) {
        return data_.at(index).data();
    }

    const float* channel(int index) const {
        return data_.at(index).data();
    }

private:
    int channels_;
    int samples_;
    std::vector<std::vector<float>> data_;
};

} // namespace aether