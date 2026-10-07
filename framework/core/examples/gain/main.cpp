#include "aether/OwningAudioBuffer.h"
#include "aether/PluginFactory.h"

#include <iostream>

// Drives the registered plugin through the factory, like a format adapter would.
int main() {
    const aether::PluginFactory& factory = aether::pluginFactory();
    const aether::PluginInfo info = factory.info();
    std::cout << info.name << " " << info.version.toString() << " by " << info.vendor << "\n";

    auto plugin = factory.create();
    plugin->parameters().get("gain").setValue(0.5f);
    plugin->prepare(
        {.sampleRate = 44100.0, .maxBlockSize = 8, .layout = aether::BusLayout::stereo()});

    aether::OwningAudioBuffer buffer(2, 8);
    for (int ch = 0; ch < buffer.numChannels(); ++ch) {
        for (int i = 0; i < buffer.numSamples(); ++i) {
            buffer.channel(ch)[i] = 1.0f;
        }
    }

    aether::AudioBuffer audio = buffer.view();
    aether::ProcessContext context{.input = audio, .output = audio};
    plugin->process(context);
    plugin->release();

    std::cout << "Processed samples:\n";
    for (int ch = 0; ch < buffer.numChannels(); ++ch) {
        std::cout << "Channel " << ch << ": ";
        for (int i = 0; i < buffer.numSamples(); ++i) {
            std::cout << buffer.channel(ch)[i] << " ";
        }
        std::cout << "\n";
    }
    return 0;
}
