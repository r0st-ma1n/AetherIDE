#include "GainPlugin.h"

#include "aether/OwningAudioBuffer.h"

#include <iostream>

int main() {
    GainPlugin plugin;

    constexpr double sampleRate = 44100.0;
    constexpr int blockSize = 8;
    constexpr int channels = 2;

    plugin.prepareToPlay(sampleRate, blockSize);

    aether::ParameterLayout parameters = plugin.createParameters();
    parameters.get("gain").setValue(0.5f);

    aether::OwningAudioBuffer buffer(channels, blockSize);
    aether::AudioBuffer audio = buffer.view();

    for (int ch = 0; ch < buffer.numChannels(); ++ch) {
        float* samples = buffer.channel(ch);

        for (int i = 0; i < buffer.numSamples(); ++i) {
            samples[i] = 1.0f;
        }
    }

    aether::ProcessContext context{.input = audio,
                                   .output = audio,
                                   .parameters = parameters,
                                   .sampleRate = sampleRate,
                                   .blockSize = blockSize};

    plugin.processBlock(context);

    plugin.releaseResources();

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
