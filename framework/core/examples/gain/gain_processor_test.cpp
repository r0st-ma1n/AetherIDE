#include "GainPlugin.h"

#include "support/AllocationCounter.h"
#include "support/Check.h"

#include "aether/OwningAudioBuffer.h"

using aether::test::expectNear;
using aether::test::expectTrue;

namespace {

constexpr double kSampleRate = 48000.0;
constexpr int kBlockSize = 64;

void fill(aether::OwningAudioBuffer& buffer, float value) {
    for (int ch = 0; ch < buffer.numChannels(); ++ch) {
        for (int i = 0; i < buffer.numSamples(); ++i) {
            buffer.channel(ch)[i] = value;
        }
    }
}

void processesInPlaceWithoutAllocating() {
    GainPlugin plugin;
    plugin.prepareToPlay(kSampleRate, kBlockSize);
    aether::ParameterLayout parameters = plugin.createParameters();
    parameters.get("gain").setValue(0.5f);

    aether::OwningAudioBuffer storage(2, kBlockSize);
    fill(storage, 1.0f);
    aether::AudioBuffer audio = storage.view();
    aether::ProcessContext context{.input = audio,
                                   .output = audio,
                                   .parameters = parameters,
                                   .sampleRate = kSampleRate,
                                   .blockSize = kBlockSize};

    aether::test::AllocationCounter counter;
    plugin.processBlock(context);
    expectTrue(counter.count() == 0, "processBlock does not allocate");

    expectNear(storage.channel(0)[0], 0.5f, 1e-6f, "in-place: first sample scaled");
    expectNear(storage.channel(1)[kBlockSize - 1], 0.5f, 1e-6f, "in-place: last sample scaled");
}

void processesSeparateBuffers() {
    GainPlugin plugin;
    plugin.prepareToPlay(kSampleRate, kBlockSize);
    aether::ParameterLayout parameters = plugin.createParameters();
    parameters.get("gain").setValue(2.0f);

    aether::OwningAudioBuffer inputStorage(2, kBlockSize);
    aether::OwningAudioBuffer outputStorage(2, kBlockSize);
    fill(inputStorage, 0.25f);
    const aether::AudioBuffer input = inputStorage.view();
    aether::AudioBuffer output = outputStorage.view();
    aether::ProcessContext context{.input = input,
                                   .output = output,
                                   .parameters = parameters,
                                   .sampleRate = kSampleRate,
                                   .blockSize = kBlockSize};

    plugin.processBlock(context);

    expectNear(outputStorage.channel(1)[10], 0.5f, 1e-6f, "output = input * gain");
    expectNear(inputStorage.channel(1)[10], 0.25f, 0.0f, "input is left untouched");
}

void silencesOutputChannelsWithoutInput() {
    GainPlugin plugin;
    plugin.prepareToPlay(kSampleRate, kBlockSize);
    aether::ParameterLayout parameters = plugin.createParameters();

    aether::OwningAudioBuffer inputStorage(1, kBlockSize);
    aether::OwningAudioBuffer outputStorage(2, kBlockSize);
    fill(inputStorage, 1.0f);
    fill(outputStorage, 9.0f);
    const aether::AudioBuffer input = inputStorage.view();
    aether::AudioBuffer output = outputStorage.view();
    aether::ProcessContext context{.input = input,
                                   .output = output,
                                   .parameters = parameters,
                                   .sampleRate = kSampleRate,
                                   .blockSize = kBlockSize};

    plugin.processBlock(context);

    expectNear(outputStorage.channel(0)[0], 1.0f, 1e-6f, "channel with input is processed");
    expectNear(outputStorage.channel(1)[0], 0.0f, 0.0f, "channel without input is silent");
}

} // namespace

int main() {
    processesInPlaceWithoutAllocating();
    processesSeparateBuffers();
    silencesOutputChannelsWithoutInput();
    return aether::test::finish("gain_processor_test");
}
