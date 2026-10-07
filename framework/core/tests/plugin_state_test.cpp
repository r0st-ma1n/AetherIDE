#include "support/Check.h"

#include "aether/PluginProcessor.h"
#include "aether/PluginState.h"

#include <cstdint>
#include <string>
#include <vector>

using aether::ParameterLayout;
using aether::PluginState;
using aether::test::expectNear;
using aether::test::expectTrue;

namespace {

/** Processor with custom state: a user-visible preset name. */
class NamedPresetProcessor : public aether::PluginProcessor {
public:
    NamedPresetProcessor() {
        parameters_.addFloat("gain", "Gain", 0.0f, 2.0f, 1.0f);
        parameters_.addBool("bypass", "Bypass", false, {.isBypass = true});
        parameters_.addChoice("mode", "Mode", {"Clean", "Warm", "Hot"}, 0);
    }

    void prepareToPlay(double, int) override {}
    void processBlock(aether::ProcessContext&) override {}
    void releaseResources() override {}

    std::string presetName;
    int customLoads = 0;

protected:
    void saveCustomState(std::vector<std::uint8_t>& out) const override {
        out.assign(presetName.begin(), presetName.end());
    }

    void loadCustomState(std::span<const std::uint8_t> data) override {
        presetName.assign(data.begin(), data.end());
        ++customLoads;
    }
};

void processorRoundTrip() {
    NamedPresetProcessor saved;
    saved.parameters().get("gain").setValue(0.25f);
    saved.parameters().get("bypass").setValue(1.0f);
    saved.parameters().get("mode").setValue(2.0f);
    saved.presetName = "Night drive";
    const PluginState state = saved.getState();

    NamedPresetProcessor loaded;
    expectTrue(loaded.setState(state), "state is accepted");
    expectNear(loaded.parameters().get("gain").value(), 0.25f, 0.0f, "float restored exactly");
    expectTrue(loaded.parameters().get("bypass").boolValue(), "bool restored");
    expectTrue(loaded.parameters().get("mode").choiceIndex() == 2, "choice restored");
    expectTrue(loaded.presetName == "Night drive", "custom data restored");
}

void stateFromOlderPluginVersion() {
    // Version 1 of a plugin had "gain" and "drive"; version 2 dropped "drive" and added "tone".
    ParameterLayout v1;
    v1.addFloat("gain", "Gain", 0.0f, 2.0f, 1.0f);
    v1.addFloat("drive", "Drive", 0.0f, 1.0f, 0.0f);
    v1.get("gain").setValue(1.5f);
    v1.get("drive").setValue(0.8f);
    const PluginState state = aether::savePluginState(v1);

    ParameterLayout v2;
    v2.addFloat("tone", "Tone", 0.0f, 1.0f, 0.3f);
    v2.addFloat("gain", "Gain", 0.0f, 1.0f, 0.5f); // range shrank
    v2.get("tone").setValue(0.9f);

    std::vector<std::uint8_t> custom = {1, 2, 3};
    expectTrue(aether::loadPluginState(v2, state, &custom), "older state is accepted");
    expectNear(v2.get("gain").value(), 1.0f, 0.0f, "value outside the new range is clamped");
    expectNear(v2.get("tone").value(), 0.3f, 0.0f, "parameter missing from state gets default");
    expectTrue(custom.empty(), "state without custom data yields empty custom data");
}

void customHookGetsEmptyDataWhenNoneSaved() {
    ParameterLayout layout;
    layout.addFloat("gain", "Gain", 0.0f, 2.0f, 1.0f);
    const PluginState state = aether::savePluginState(layout);

    NamedPresetProcessor processor;
    processor.presetName = "stale";
    expectTrue(processor.setState(state), "state without custom data is accepted");
    expectTrue(processor.customLoads == 1 && processor.presetName.empty(),
               "loadCustomState receives empty data");
}

void goldenBytes() {
    ParameterLayout layout;
    layout.addFloat("g", "G", 0.0f, 2.0f, 1.0f);
    const std::uint8_t custom[] = {0xAB};
    const PluginState state = aether::savePluginState(layout, custom);

    const PluginState expected = {
        'A',  'E',  'T',  'S',  // magic
        0x01, 0x00, 0x00, 0x00, // format version 1
        0x01, 0x00, 0x00, 0x00, // one parameter
        0x01, 0x00, 0x00, 0x00, // id length 1
        'g',                    // id
        0x00, 0x00, 0x80, 0x3F, // 1.0f, IEEE 754 little-endian
        0x01, 0x00, 0x00, 0x00, // custom length 1
        0xAB,                   // custom data
    };
    expectTrue(state == expected, "binary format is stable and little-endian");
}

void invalidStatesChangeNothing() {
    NamedPresetProcessor source;
    source.parameters().get("gain").setValue(0.1f);
    source.presetName = "abc";
    const PluginState valid = source.getState();

    NamedPresetProcessor target;
    target.parameters().get("gain").setValue(1.7f);
    target.presetName = "keep";

    bool allRejected = true;
    for (std::size_t length = 0; length < valid.size(); ++length) {
        const std::span<const std::uint8_t> prefix(valid.data(), length);
        allRejected = allRejected && !target.setState(prefix);
    }
    expectTrue(allRejected, "every truncated state is rejected");

    PluginState future = valid;
    future[4] = 2; // format version 2
    expectTrue(!target.setState(future), "state from a newer format is rejected");

    PluginState badMagic = valid;
    badMagic[0] = 'X';
    expectTrue(!target.setState(badMagic), "wrong magic is rejected");

    PluginState hugeCount = valid;
    hugeCount[8] = 0xFF;
    hugeCount[9] = 0xFF;
    hugeCount[10] = 0xFF;
    hugeCount[11] = 0x7F;
    expectTrue(!target.setState(hugeCount), "impossible parameter count is rejected");

    PluginState hugeId = valid;
    hugeId[12] = 0xFF;
    hugeId[13] = 0xFF;
    hugeId[14] = 0xFF;
    hugeId[15] = 0xFF;
    expectTrue(!target.setState(hugeId), "impossible id length is rejected");

    expectNear(target.parameters().get("gain").value(), 1.7f, 0.0f, "rejected states keep values");
    expectTrue(target.presetName == "keep" && target.customLoads == 0,
               "rejected states do not call loadCustomState");
}

} // namespace

int main() {
    processorRoundTrip();
    stateFromOlderPluginVersion();
    customHookGetsEmptyDataWhenNoneSaved();
    goldenBytes();
    invalidStatesChangeNothing();
    return aether::test::finish("plugin_state_test");
}
