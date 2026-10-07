#include "support/AllocationCounter.h"
#include "support/Check.h"

#include "aether/SmoothedValue.h"

#include <vector>

using aether::SmoothedValue;
using aether::SmoothingType;
using aether::test::expectNear;
using aether::test::expectTrue;

namespace {

constexpr double kSampleRate = 48000.0;
constexpr double kRampMs = 10.0;
constexpr int kRampSamples = 480; // 48000 Hz * 10 ms

std::vector<float> render(SmoothedValue& value, int numSamples) {
    std::vector<float> out;
    out.reserve(numSamples);
    for (int i = 0; i < numSamples; ++i) {
        out.push_back(value.next());
    }
    return out;
}

bool strictlyMonotonic(const std::vector<float>& values, float from, bool rising) {
    float previous = from;
    for (const float v : values) {
        if (rising ? !(v > previous) : !(v < previous)) {
            return false;
        }
        previous = v;
    }
    return true;
}

/** Index of the first sample equal to the target, or -1. */
int firstIndexAt(const std::vector<float>& values, float target) {
    for (int i = 0; i < static_cast<int>(values.size()); ++i) {
        if (values[i] == target) {
            return i;
        }
    }
    return -1;
}

void rampHasExactLengthAndIsMonotonic(SmoothingType type, const char* name) {
    SmoothedValue value(type);
    value.reset(kSampleRate, kRampMs);
    value.setTarget(0.0f); // first target after reset() jumps
    expectTrue(value.rampLengthSamples() == kRampSamples, "ramp length = sample rate * time");

    value.setTarget(1.0f);
    const auto ramp = render(value, kRampSamples);
    expectTrue(strictlyMonotonic(ramp, 0.0f, true), name);
    expectTrue(firstIndexAt(ramp, 1.0f) == kRampSamples - 1, "target reached on the last sample");
    expectTrue(!value.isSmoothing(), "ramp finished");
    expectNear(value.next(), 1.0f, 0.0f, "stays at the target");

    value.setTarget(-0.5f);
    const auto down = render(value, kRampSamples);
    expectTrue(strictlyMonotonic(down, 1.0f, false), "downward ramp is monotonic");
    expectNear(down.back(), -0.5f, 0.0f, "downward ramp reaches the target");
}

void linearStepsAreEqual() {
    SmoothedValue value(SmoothingType::Linear);
    value.reset(kSampleRate, kRampMs);
    value.setTarget(0.0f);
    value.setTarget(1.0f);
    const auto ramp = render(value, kRampSamples);
    expectNear(ramp[0], 1.0f / kRampSamples, 1e-6f, "first linear step");
    expectNear(ramp[kRampSamples / 2 - 1], 0.5f, 1e-4f, "half way after half the ramp");
}

void exponentialMovesFastFirst() {
    SmoothedValue value(SmoothingType::Exponential);
    value.reset(kSampleRate, kRampMs);
    value.setTarget(0.0f);
    value.setTarget(1.0f);
    const auto ramp = render(value, kRampSamples);
    expectTrue(ramp[kRampSamples / 2 - 1] > 0.9f, "exponential is past 90% at half the ramp");
    expectTrue(ramp[kRampSamples - 2] > 0.998f, "exponential is within -60 dB before the end");
}

void retargetMidRampStartsFromCurrentValue() {
    SmoothedValue value;
    value.reset(kSampleRate, kRampMs);
    value.setTarget(0.0f);
    value.setTarget(1.0f);
    value.skip(kRampSamples / 2);
    const float midway = value.current();

    value.setTarget(0.0f);
    const auto ramp = render(value, kRampSamples);
    expectTrue(strictlyMonotonic(ramp, midway, false), "new ramp starts where the old one was");
    expectTrue(firstIndexAt(ramp, 0.0f) == kRampSamples - 1, "new ramp has the full length");
}

void resetAppliesNewSampleRateAndSnaps() {
    SmoothedValue value;
    value.reset(kSampleRate, kRampMs);
    value.setTarget(0.0f);
    value.setTarget(1.0f);
    value.skip(10);

    value.reset(96000.0, kRampMs);
    expectTrue(value.rampLengthSamples() == 2 * kRampSamples, "ramp length follows sample rate");
    expectTrue(!value.isSmoothing(), "reset stops the ramp");

    value.setTarget(0.25f);
    expectNear(value.next(), 0.25f, 0.0f, "first target after reset jumps without a ramp");

    value.setTarget(0.75f);
    expectTrue(value.isSmoothing(), "later targets ramp again");
}

void zeroTimeDisablesSmoothing() {
    SmoothedValue value;
    value.reset(kSampleRate, 0.0);
    value.setTarget(0.0f);
    value.setTarget(1.0f);
    expectNear(value.next(), 1.0f, 0.0f, "0 ms jumps straight to the target");
}

void doesNotAllocate() {
    SmoothedValue value(SmoothingType::Exponential);
    aether::test::AllocationCounter counter;
    value.reset(kSampleRate, kRampMs);
    value.setTarget(0.0f);
    value.setTarget(1.0f);
    float sum = 0.0f;
    for (int i = 0; i < kRampSamples; ++i) {
        sum += value.next();
    }
    expectTrue(counter.count() == 0, "SmoothedValue does not allocate");
    expectTrue(sum > 0.0f, "ramp produced values");
}

} // namespace

int main() {
    rampHasExactLengthAndIsMonotonic(SmoothingType::Linear, "linear ramp is monotonic");
    rampHasExactLengthAndIsMonotonic(SmoothingType::Exponential, "exponential ramp is monotonic");
    linearStepsAreEqual();
    exponentialMovesFastFirst();
    retargetMidRampStartsFromCurrentValue();
    resetAppliesNewSampleRateAndSnaps();
    zeroTimeDisablesSmoothing();
    doesNotAllocate();
    return aether::test::finish("smoothed_value_test");
}
