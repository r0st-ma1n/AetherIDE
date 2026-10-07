#include "GainPlugin.h"

void GainPlugin::prepareToPlay(double sampleRate, [[maybe_unused]] int maxBlockSize) {
    gain_.reset(sampleRate, kGainSmoothingMs);
}

void GainPlugin::releaseResources() {}

aether::ParameterLayout GainPlugin::createParameters() {
    aether::ParameterLayout layout;

    layout.addFloat("gain", "Gain", 0.0f, 2.0f, 1.0f);

    return layout;
}

void GainPlugin::processBlock(aether::ProcessContext& context) {
    gain_.setTarget(context.parameters.get("gain").value());

    const aether::AudioBuffer& input = context.input;
    aether::AudioBuffer& output = context.output;
    const int processedChannels =
        input.numChannels() < output.numChannels() ? input.numChannels() : output.numChannels();

    for (int i = 0; i < output.numSamples(); ++i) {
        const float gain = gain_.next();

        // Reads the input sample before writing the output one, so in-place is safe.
        for (int ch = 0; ch < processedChannels; ++ch) {
            output.channel(ch)[i] = input.channel(ch)[i] * gain;
        }
    }

    for (int ch = processedChannels; ch < output.numChannels(); ++ch) {
        float* out = output.channel(ch);
        for (int i = 0; i < output.numSamples(); ++i) {
            out[i] = 0.0f;
        }
    }
}

void GainPlugin::setupUI() {
    // UI components will be generated here by the IDE
}
