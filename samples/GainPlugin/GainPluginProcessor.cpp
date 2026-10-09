// GENERATED CODE - DO NOT MODIFY COMMENTS
// Regenerated from GainPlugin.aether on save; edit only inside USER CODE regions.
#include "GainPluginProcessor.h"

aether::PluginInfo GainPluginProcessor::pluginInfo() {
    return {
        .name = "GainPlugin",
        .vendor = "Aether",
        .id = "dev.aether.samples.gain",
        .version = {1, 0, 0},
        .category = aether::PluginCategory::Effect,
    };
}

GainPluginProcessor::GainPluginProcessor() {
    gainParameter_ = &parameters_.addFloat("gain", "Gain", 0.0f, 2.0f, 1.0f);

    // --- USER CODE BEGIN: Constructor ---

    // --- USER CODE END: Constructor ---
}

void GainPluginProcessor::prepareToPlay([[maybe_unused]] const aether::ProcessSetup& setup) {
    // --- USER CODE BEGIN: PrepareToPlay ---

    // --- USER CODE END: PrepareToPlay ---
}

void GainPluginProcessor::processBlock(aether::ProcessContext& context) {
    // --- USER CODE BEGIN: ProcessBlock ---
    // Scales the input by the gain parameter. Reads the input sample before writing the
    // output one, so in-place processing is safe.
    const float gain = gainParameter_->value();
    const aether::AudioBuffer& input = context.input;
    aether::AudioBuffer& output = context.output;
    for (int ch = 0; ch < output.numChannels(); ++ch) {
        float* out = output.channel(ch);
        const float* in = ch < input.numChannels() ? input.channel(ch) : nullptr;
        for (int i = 0; i < output.numSamples(); ++i) {
            out[i] = in != nullptr ? in[i] * gain : 0.0f;
        }
    }
    // --- USER CODE END: ProcessBlock ---
}

void GainPluginProcessor::releaseResources() {
    // --- USER CODE BEGIN: ReleaseResources ---

    // --- USER CODE END: ReleaseResources ---
}

// --- USER CODE BEGIN: CustomMethods ---

// --- USER CODE END: CustomMethods ---

AETHER_PLUGIN(GainPluginProcessor)
