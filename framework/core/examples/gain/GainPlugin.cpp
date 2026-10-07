#include "GainPlugin.h"

void GainPlugin::prepareToPlay([[maybe_unused]] double sampleRate,
                               [[maybe_unused]] int maxBlockSize) {}

void GainPlugin::releaseResources() {}

aether::ParameterLayout GainPlugin::createParameters() {
    aether::ParameterLayout layout;

    layout.addFloat("gain", "Gain", 0.0f, 2.0f, 1.0f);

    return layout;
}

void GainPlugin::processBlock(aether::ProcessContext& context) {
    const float gain = context.parameters.get("gain").value();

    const aether::AudioBuffer& input = context.input;
    aether::AudioBuffer& output = context.output;

    for (int ch = 0; ch < output.numChannels(); ++ch) {
        float* out = output.channel(ch);

        if (ch >= input.numChannels()) {
            for (int i = 0; i < output.numSamples(); ++i) {
                out[i] = 0.0f;
            }
            continue;
        }

        // Reads in[i] before writing out[i], so in-place processing is safe.
        const float* in = input.channel(ch);
        for (int i = 0; i < output.numSamples(); ++i) {
            out[i] = in[i] * gain;
        }
    }
}

void GainPlugin::setupUI() {
    // UI components will be generated here by the IDE
}
