#include "support/AllocationCounter.h"
#include "support/Check.h"

#include "aether/AudioBuffer.h"
#include "aether/OwningAudioBuffer.h"

#include <stdexcept>

using aether::test::expectNear;
using aether::test::expectTrue;

namespace {

void allocationCounterSeesAllocations() {
    aether::test::AllocationCounter counter;
    int* volatile probe = new int(42);
    delete probe;
    expectTrue(counter.count() >= 1, "allocation counter detects operator new");
}

void viewWrapsHostPointersWithoutCopying() {
    float left[4] = {1.0f, 2.0f, 3.0f, 4.0f};
    float right[4] = {5.0f, 6.0f, 7.0f, 8.0f};
    float* channels[2] = {left, right};

    aether::AudioBuffer buffer(channels, 2, 4);

    expectTrue(buffer.numChannels() == 2, "view reports channel count");
    expectTrue(buffer.numSamples() == 4, "view reports sample count");
    expectTrue(buffer.channel(0) == left, "channel 0 is the host pointer");
    expectTrue(buffer.channel(1) == right, "channel 1 is the host pointer");

    buffer.channel(1)[2] = -1.0f;
    expectNear(right[2], -1.0f, 0.0f, "writes go to host memory");
}

void viewConstructionDoesNotAllocate() {
    float samples[8] = {};
    float* channels[1] = {samples};

    aether::test::AllocationCounter counter;
    aether::AudioBuffer buffer(channels, 1, 8);
    buffer.clear();
    expectTrue(counter.count() == 0, "AudioBuffer construction and clear() do not allocate");
}

void clearZeroesAllChannels() {
    aether::OwningAudioBuffer storage(2, 3);
    for (int ch = 0; ch < 2; ++ch) {
        for (int i = 0; i < 3; ++i) {
            storage.channel(ch)[i] = 1.0f;
        }
    }

    storage.view().clear();

    bool allZero = true;
    for (int ch = 0; ch < 2; ++ch) {
        for (int i = 0; i < 3; ++i) {
            allZero = allZero && storage.channel(ch)[i] == 0.0f;
        }
    }
    expectTrue(allZero, "clear() zeroes every sample");
}

void emptyBufferIsValid() {
    aether::AudioBuffer empty;
    expectTrue(empty.numChannels() == 0 && empty.numSamples() == 0, "default buffer is empty");

    aether::OwningAudioBuffer noChannels(0, 16);
    expectTrue(noChannels.view().numChannels() == 0, "owning buffer with zero channels");
}

void owningBufferStartsSilentAndSharesStorageWithView() {
    aether::OwningAudioBuffer storage(2, 4);
    aether::AudioBuffer view = storage.view();

    expectTrue(view.numChannels() == 2 && view.numSamples() == 4, "view has owner's size");
    expectNear(storage.channel(1)[3], 0.0f, 0.0f, "owning buffer starts silent");

    view.channel(0)[1] = 0.5f;
    expectNear(storage.channel(0)[1], 0.5f, 0.0f, "view writes into owner's storage");
}

void owningBufferRejectsNegativeSize() {
    bool threw = false;
    try {
        aether::OwningAudioBuffer invalid(-1, 4);
    } catch (const std::invalid_argument&) {
        threw = true;
    }
    expectTrue(threw, "negative channel count throws");
}

} // namespace

int main() {
    allocationCounterSeesAllocations();
    viewWrapsHostPointersWithoutCopying();
    viewConstructionDoesNotAllocate();
    clearZeroesAllChannels();
    emptyBufferIsValid();
    owningBufferStartsSilentAndSharesStorageWithView();
    owningBufferRejectsNegativeSize();
    return aether::test::finish("audio_buffer_test");
}
