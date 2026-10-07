#include "support/AllocationCounter.h"
#include "support/Check.h"

#include "aether/AudioProcessorParameter.h"

#include <cmath>
#include <limits>
#include <stdexcept>
#include <string>
#include <vector>

using aether::AudioProcessorParameter;
using aether::ParameterKind;
using aether::ParameterLayout;
using aether::ParameterOptions;
using aether::test::expectNear;
using aether::test::expectTrue;

namespace {

template <typename Fn> bool throwsInvalidArgument(Fn&& fn) {
    try {
        fn();
    } catch (const std::invalid_argument&) {
        return true;
    }
    return false;
}

void continuousNormalization() {
    AudioProcessorParameter gain("gain", "Gain", 0.0f, 2.0f, 1.0f);

    expectNear(gain.toNormalized(0.5f), 0.25f, 1e-6f, "toNormalized maps into [0, 1]");
    expectNear(gain.fromNormalized(0.25f), 0.5f, 1e-6f, "fromNormalized maps back");
    expectNear(gain.normalizedValue(), 0.5f, 1e-6f, "default value normalized");
    expectNear(gain.fromNormalized(1.5f), 2.0f, 0.0f, "normalized above 1 is clamped");
    expectNear(gain.toNormalized(-3.0f), 0.0f, 0.0f, "plain value below min is clamped");
    expectTrue(gain.stepCount() == 0, "continuous parameter has no steps");

    gain.setNormalizedValue(0.75f);
    expectNear(gain.value(), 1.5f, 1e-6f, "setNormalizedValue sets the plain value");

    gain.setValue(std::numeric_limits<float>::quiet_NaN());
    expectNear(gain.value(), 1.0f, 0.0f, "NaN falls back to the default");
}

void steppedNormalization() {
    AudioProcessorParameter semitones("pitch", "Pitch", -12.0f, 12.0f, 0.0f, {.step = 1.0f});

    expectTrue(semitones.stepCount() == 24, "stepCount = range / step");
    semitones.setValue(3.4f);
    expectNear(semitones.value(), 3.0f, 0.0f, "setValue snaps to the step");
    expectNear(semitones.fromNormalized(0.52f), 0.0f, 0.0f, "fromNormalized snaps to the step");
    expectNear(semitones.toNormalized(6.0f), 18.0f / 24.0f, 1e-6f, "step k maps to k / count");

    expectTrue(throwsInvalidArgument(
                   [] { AudioProcessorParameter("p", "P", 0.0f, 1.0f, 0.0f, {.step = 0.3f}); }),
               "range that is not a multiple of step throws");
    expectTrue(throwsInvalidArgument(
                   [] { AudioProcessorParameter("p", "P", 0.0f, 1.0f, 0.25f, {.step = 0.5f}); }),
               "default off the step grid throws");
}

void invalidRangesThrow() {
    expectTrue(throwsInvalidArgument([] { AudioProcessorParameter("p", "P", 1.0f, 1.0f, 1.0f); }),
               "min == max throws");
    expectTrue(throwsInvalidArgument([] { AudioProcessorParameter("p", "P", 0.0f, 1.0f, 2.0f); }),
               "default outside range throws");
    expectTrue(throwsInvalidArgument([] { AudioProcessorParameter("", "P", 0.0f, 1.0f, 0.0f); }),
               "empty id throws");
    expectTrue(throwsInvalidArgument(
                   [] { AudioProcessorParameter("p", "P", 0.0f, 1.0f, 0.0f, {.isBypass = true}); }),
               "Float parameter cannot be the bypass");
}

void boolParameter() {
    ParameterLayout layout;
    auto& enabled = layout.addBool("enabled", "Enabled", true);

    expectTrue(enabled.kind() == ParameterKind::Bool, "kind is Bool");
    expectTrue(enabled.stepCount() == 1, "Bool has one step");
    expectTrue(enabled.boolValue(), "default true");
    expectNear(enabled.normalizedValue(), 1.0f, 0.0f, "true is normalized 1");

    enabled.setNormalizedValue(0.4f);
    expectTrue(!enabled.boolValue(), "normalized 0.4 snaps to off");

    expectTrue(enabled.valueToText(1.0f) == "On", "text On");
    expectTrue(enabled.valueToText(0.0f) == "Off", "text Off");
    expectTrue(enabled.textToValue(" on ") == 1.0f, "parse on (trimmed, any case)");
    expectTrue(enabled.textToValue("FALSE") == 0.0f, "parse false");
    expectTrue(enabled.textToValue("0") == 0.0f, "parse 0");
    expectTrue(!enabled.textToValue("maybe").has_value(), "reject unknown text");
}

void choiceParameter() {
    ParameterLayout layout;
    auto& mode = layout.addChoice("mode", "Mode", {"Clean", "Warm", "Hot"}, 1);

    expectTrue(mode.kind() == ParameterKind::Choice, "kind is Choice");
    expectTrue(mode.stepCount() == 2, "three choices = two steps");
    expectTrue(mode.choiceIndex() == 1, "default index");
    expectNear(mode.normalizedValue(), 0.5f, 1e-6f, "middle choice is normalized 0.5");

    mode.setNormalizedValue(1.0f);
    expectTrue(mode.choiceIndex() == 2, "normalized 1 selects the last choice");

    expectTrue(mode.valueToText(0.0f) == "Clean", "text is the label");
    expectTrue(mode.textToValue("hot") == 2.0f, "parse label, any case");
    expectTrue(mode.textToValue("1") == 1.0f, "parse index");
    expectTrue(!mode.textToValue("3").has_value(), "reject index out of range");
    expectTrue(!mode.textToValue("Loud").has_value(), "reject unknown label");

    expectTrue(throwsInvalidArgument([&] { layout.addChoice("one", "One", {"Only"}, 0); }),
               "fewer than two choices throws");
    expectTrue(throwsInvalidArgument([&] { layout.addChoice("bad", "Bad", {"A", "B"}, 2); }),
               "default index out of range throws");
}

void floatTextRoundTrip() {
    AudioProcessorParameter gain("gain", "Gain", -60.0f, 12.0f, 0.0f, {.unit = "dB"});

    const std::vector<float> values = {-60.0f, -6.0f, -0.5f, 0.0f, 3.25f, 12.0f};
    for (const float value : values) {
        const auto parsed = gain.textToValue(gain.valueToText(value));
        expectTrue(parsed.has_value(), "round-trip parses");
        expectNear(parsed.value_or(1000.0f), value, 0.005f, "round-trip keeps the value");
    }

    expectTrue(gain.valueToText(-6.0f) == "-6.00", "fixed two decimals by default");
    expectTrue(gain.valueToText(-0.001f) == "0.00", "no negative zero");
    expectTrue(gain.textToValue("-6 dB") == -6.0f, "parse with unit");
    expectTrue(gain.textToValue("-6dB") == -6.0f, "parse with unit, no space");
    expectTrue(gain.textToValue("+3") == 3.0f, "parse explicit plus");
    expectTrue(gain.textToValue("100") == 12.0f, "parsed value is clamped");
    expectTrue(!gain.textToValue("loud").has_value(), "reject text");
    expectTrue(!gain.textToValue("").has_value(), "reject empty text");
    expectTrue(!gain.textToValue("1.0.0").has_value(), "reject trailing garbage");

    AudioProcessorParameter mix("mix", "Mix", 0.0f, 100.0f, 50.0f, {.unit = "%", .decimals = 0});
    expectTrue(mix.valueToText(33.4f) == "33", "decimals option");
}

void flagsAndUnit() {
    AudioProcessorParameter freq("freq", "Frequency", 20.0f, 20000.0f, 1000.0f,
                                 {.unit = "Hz", .automatable = false});
    expectTrue(freq.unit() == "Hz", "unit stored");
    expectTrue(!freq.isAutomatable(), "automatable flag stored");
    expectTrue(!freq.isBypass(), "not a bypass by default");

    ParameterLayout layout;
    expectTrue(layout.bypass() == nullptr, "no bypass by default");
    auto& bypass = layout.addBool("bypass", "Bypass", false, {.isBypass = true});
    expectTrue(layout.bypass() == &bypass, "layout finds the bypass");
    expectTrue(throwsInvalidArgument(
                   [&] { layout.addBool("bypass2", "Bypass 2", false, {.isBypass = true}); }),
               "second bypass throws");
}

void numericIds() {
    expectTrue(aether::parameterIdFromString("gain") == 0x1b5426feu, "FNV-1a value is stable");
    expectTrue((aether::parameterIdFromString("a very long parameter id") & 0x80000000u) == 0,
               "numeric ID never sets the top bit");

    ParameterLayout layout;
    auto& gain = layout.addFloat("gain", "Gain", 0.0f, 1.0f, 0.5f);
    expectTrue(gain.numericId() == aether::parameterIdFromString("gain"), "numericId from id");
    expectTrue(layout.findById(gain.numericId()) == &gain, "findById finds the parameter");
    expectTrue(layout.findById(1) == nullptr, "findById misses unknown IDs");

    expectTrue(throwsInvalidArgument([&] { layout.addFloat("gain", "Gain 2", 0.0f, 1.0f, 0.0f); }),
               "duplicate string id throws");

    // "p2308" and "p571002" have the same 31-bit FNV-1a hash.
    layout.addFloat("p2308", "A", 0.0f, 1.0f, 0.0f);
    expectTrue(throwsInvalidArgument([&] { layout.addFloat("p571002", "B", 0.0f, 1.0f, 0.0f); }),
               "numeric ID collision throws");
}

void layoutKeepsPointersStable() {
    ParameterLayout layout;
    auto* first = &layout.addFloat("first", "First", 0.0f, 1.0f, 0.0f);
    for (int i = 0; i < 100; ++i) {
        layout.addFloat("param" + std::to_string(i), "Param", 0.0f, 1.0f, 0.0f);
    }

    expectTrue(layout.size() == 101, "size counts all parameters");
    expectTrue(&layout[0] == first, "first parameter did not move");
    expectTrue(layout.find("first") == first, "find returns the same object");
    expectTrue(layout.find("missing") == nullptr, "find misses unknown ids");

    bool threw = false;
    try {
        layout.get("missing");
    } catch (const std::out_of_range&) {
        threw = true;
    }
    expectTrue(threw, "get throws on unknown id");
}

void audioThreadCallsDoNotAllocate() {
    ParameterLayout layout;
    auto& gain = layout.addFloat("gain", "Gain", 0.0f, 2.0f, 1.0f, {.step = 0.5f});

    aether::test::AllocationCounter counter;
    gain.setValue(0.7f);
    gain.setNormalizedValue(0.3f);
    const float sum = gain.value() + gain.normalizedValue() + layout.get("gain").value();
    expectTrue(counter.count() == 0, "value access and lookup do not allocate");
    expectTrue(std::isfinite(sum), "values are finite");
}

} // namespace

int main() {
    continuousNormalization();
    steppedNormalization();
    invalidRangesThrow();
    boolParameter();
    choiceParameter();
    floatTextRoundTrip();
    flagsAndUnit();
    numericIds();
    layoutKeepsPointersStable();
    audioThreadCallsDoNotAllocate();
    return aether::test::finish("parameter_test");
}
