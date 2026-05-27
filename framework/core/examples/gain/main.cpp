#include "GainPlugin.h"

#include <iostream>

int main() {
    GainPlugin plugin;

    constexpr double sampleRate = 44100.0;
    constexpr int blockSize = 8;
    constexpr int channels = 2;

    plugin.prepare(sampleRate, blockSize);

    aether::ParameterLayout parameters = plugin.createParameters();
    parameters.getFloat("gain").setValue(0.5f);

    aether::AudioBuffer buffer(channels, blockSize);

    for (int ch = 0; ch < buffer.numChannels(); ++ch) {
        float* samples = buffer.channel(ch);

        for (int i = 0; i < buffer.numSamples(); ++i) {
            samples[i] = 1.0f;
        }
    }

    aether::ProcessContext context {
        .audio = buffer,
        .parameters = parameters,
        .sampleRate = sampleRate,
        .blockSize = blockSize
    };

    plugin.process(context);

    std::cout << "Processed samples:\n";

    for (int ch = 0; ch < buffer.numChannels(); ++ch) {
        std::cout << "Channel " << ch << ": ";

        const float* samples = buffer.channel(ch);

        for (int i = 0; i < buffer.numSamples(); ++i) {
            std::cout << samples[i] << " ";
        }

        std::cout << "\n";
    }

    return 0;
}