#include "GainPlugin.h"

void GainPlugin::prepare([[maybe_unused]] double sampleRate, [[maybe_unused]] int maxBlockSize) {
}

void GainPlugin::reset() {
}

aether::ParameterLayout GainPlugin::createParameters() {
    aether::ParameterLayout layout;

    layout.addFloat(
        "gain",
        "Gain",
        0.0f,
        2.0f,
        1.0f
    );

    return layout;
}

void GainPlugin::process(aether::ProcessContext& context) {
    const float gain = context.parameters.getFloat("gain").value();

    for (int ch = 0; ch < context.audio.numChannels(); ++ch) {
        float* samples = context.audio.channel(ch);

        for (int i = 0; i < context.audio.numSamples(); ++i) {
            samples[i] *= gain;
        }
    }
}

void GainPlugin::setupUI() {
    // UI components will be generated here by the IDE
}
