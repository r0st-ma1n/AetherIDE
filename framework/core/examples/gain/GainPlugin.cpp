#include "GainPlugin.h"

aether::PluginInfo GainPlugin::pluginInfo() {
    return {
        .name = "Gain",
        .vendor = "Aether",
        .id = "dev.aether.examples.gain",
        .version = {1, 0, 0},
    };
}

GainPlugin::GainPlugin() {
    gainParameter_ = &parameters_.addFloat("gain", "Gain", 0.0f, 2.0f, 1.0f);
    addBypassParameter();
}

void GainPlugin::prepareToPlay(const aether::ProcessSetup& setup) {
    gain_.reset(setup.sampleRate, kGainSmoothingMs);
}

void GainPlugin::processBlock(aether::ProcessContext& context) {
    gain_.setTarget(gainParameter_->value());

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

AETHER_PLUGIN(GainPlugin)
