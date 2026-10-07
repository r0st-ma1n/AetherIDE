#include "aether/host/OfflineRenderer.h"

#include <algorithm>
#include <stdexcept>
#include <string>
#include <vector>

namespace aether::host {

AudioClip render(PluginProcessor& plugin, const AudioClip& input, const RenderOptions& options) {
    if (options.blockSize <= 0) {
        throw std::invalid_argument("Block size must be positive");
    }
    const int numChannels = input.numChannels();
    const BusLayout layout{.inputChannels = numChannels, .outputChannels = numChannels};
    if (!plugin.isBusLayoutSupported(layout)) {
        throw std::invalid_argument("Plugin does not support " + std::to_string(numChannels) +
                                    " -> " + std::to_string(numChannels) + " channels");
    }

    AudioClip output = AudioClip::silence(numChannels, input.numFrames(), input.sampleRate);

    // Channel pointer arrays are reused for every block; only their targets move.
    std::vector<float*> inputChannels(numChannels);
    std::vector<float*> outputChannels(numChannels);

    plugin.prepare(
        {.sampleRate = input.sampleRate, .maxBlockSize = options.blockSize, .layout = layout});

    for (int frame = 0; frame < input.numFrames(); frame += options.blockSize) {
        const int blockFrames = std::min(options.blockSize, input.numFrames() - frame);
        for (int ch = 0; ch < numChannels; ++ch) {
            // The plugin only reads input through a const AudioBuffer.
            inputChannels[ch] = const_cast<float*>(input.channels[ch].data()) + frame;
            outputChannels[ch] = output.channels[ch].data() + frame;
        }

        if (options.beforeBlock) {
            options.beforeBlock(plugin, frame);
        }

        const AudioBuffer in(inputChannels.data(), numChannels, blockFrames);
        AudioBuffer out(outputChannels.data(), numChannels, blockFrames);
        ProcessContext context{.input = in, .output = out};
        plugin.process(context);
    }

    plugin.release();
    return output;
}

} // namespace aether::host
