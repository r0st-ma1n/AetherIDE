#include "GainPlugin.h"

#include "support/AllocationCounter.h"
#include "support/Check.h"

#include "aether/OwningAudioBuffer.h"

using aether::test::expectNear;
using aether::test::expectTrue;

namespace {

constexpr double kSampleRate = 48000.0;
constexpr int kBlockSize = 64;

const aether::ProcessSetup kSetup{
    .sampleRate = kSampleRate, .maxBlockSize = kBlockSize, .layout = aether::BusLayout::stereo()};

void fill(aether::OwningAudioBuffer& buffer, float value) {
    for (int ch = 0; ch < buffer.numChannels(); ++ch) {
        for (int i = 0; i < buffer.numSamples(); ++i) {
            buffer.channel(ch)[i] = value;
        }
    }
}

void processesInPlaceWithoutAllocating() {
    GainPlugin plugin;
    plugin.parameters().get("gain").setValue(0.5f);
    plugin.prepare(kSetup);

    aether::OwningAudioBuffer storage(2, kBlockSize);
    fill(storage, 1.0f);
    aether::AudioBuffer audio = storage.view();
    aether::ProcessContext context{.input = audio, .output = audio};

    aether::test::AllocationCounter counter;
    plugin.process(context);
    expectTrue(counter.count() == 0, "process does not allocate");

    expectNear(storage.channel(0)[0], 0.5f, 1e-6f, "in-place: first sample scaled");
    expectNear(storage.channel(1)[kBlockSize - 1], 0.5f, 1e-6f, "in-place: last sample scaled");
}

void processesSeparateBuffers() {
    GainPlugin plugin;
    plugin.parameters().get("gain").setValue(2.0f);
    plugin.prepare(kSetup);

    aether::OwningAudioBuffer inputStorage(2, kBlockSize);
    aether::OwningAudioBuffer outputStorage(2, kBlockSize);
    fill(inputStorage, 0.25f);
    const aether::AudioBuffer input = inputStorage.view();
    aether::AudioBuffer output = outputStorage.view();
    aether::ProcessContext context{.input = input, .output = output};

    plugin.process(context);

    expectNear(outputStorage.channel(1)[10], 0.5f, 1e-6f, "output = input * gain");
    expectNear(inputStorage.channel(1)[10], 0.25f, 0.0f, "input is left untouched");
}

void bypassPassesInputThrough() {
    GainPlugin plugin;
    plugin.parameters().get("gain").setValue(0.0f);
    plugin.parameters().get("bypass").setValue(1.0f);
    plugin.prepare(kSetup);

    aether::OwningAudioBuffer inputStorage(2, kBlockSize);
    aether::OwningAudioBuffer outputStorage(2, kBlockSize);
    fill(inputStorage, 0.7f);
    const aether::AudioBuffer input = inputStorage.view();
    aether::AudioBuffer output = outputStorage.view();
    aether::ProcessContext context{.input = input, .output = output};

    plugin.process(context);
    expectNear(outputStorage.channel(0)[5], 0.7f, 0.0f, "bypassed output equals input");

    plugin.parameters().get("bypass").setValue(0.0f);
    plugin.process(context);
    expectNear(outputStorage.channel(0)[5], 0.0f, 0.0f, "processing resumes after bypass");
}

void gainChangeIsRampedWithoutClick() {
    GainPlugin plugin;
    plugin.parameters().get("gain").setValue(1.0f);
    plugin.prepare({.sampleRate = kSampleRate,
                    .maxBlockSize = kBlockSize,
                    .layout = aether::BusLayout::mono()});

    // 20 ms at 48 kHz = 960 samples = 15 blocks of 64.
    const int rampSamples = static_cast<int>(kSampleRate * GainPlugin::kGainSmoothingMs / 1000.0);
    const int blocks = rampSamples / kBlockSize;

    aether::OwningAudioBuffer storage(1, kBlockSize);
    aether::AudioBuffer audio = storage.view();
    aether::ProcessContext context{.input = audio, .output = audio};

    fill(storage, 1.0f);
    plugin.process(context);
    expectNear(storage.channel(0)[0], 1.0f, 0.0f, "first block after prepare uses gain directly");

    plugin.parameters().get("gain").setValue(0.0f);
    float previous = 1.0f;
    bool monotonic = true;
    float largestJump = 0.0f;
    for (int b = 0; b < blocks; ++b) {
        fill(storage, 1.0f);
        plugin.process(context);
        for (int i = 0; i < kBlockSize; ++i) {
            const float sample = storage.channel(0)[i];
            monotonic = monotonic && sample <= previous;
            largestJump = previous - sample > largestJump ? previous - sample : largestJump;
            previous = sample;
        }
    }

    expectTrue(monotonic, "gain ramps down monotonically");
    expectTrue(largestJump < 0.01f, "no sample-to-sample jump (click)");
    expectNear(previous, 0.0f, 0.0f, "gain reaches the target after the ramp time");
}

} // namespace

int main() {
    processesInPlaceWithoutAllocating();
    processesSeparateBuffers();
    bypassPassesInputThrough();
    gainChangeIsRampedWithoutClick();
    return aether::test::finish("gain_processor_test");
}
