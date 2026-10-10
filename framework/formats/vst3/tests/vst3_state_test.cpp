// State and bus arrangements of aether::vst3::Vst3Effect: getState / setState round trip,
// host notification after setState, corrupt state, mono / stereo negotiation.
#include "support/Check.h"

#include "aether/vst3/Vst3Effect.h"

#include "pluginterfaces/vst/ivsteditcontroller.h"
#include "public.sdk/source/common/memorystream.h"

#include <array>
#include <cstdint>
#include <memory>
#include <vector>

using aether::test::expectNear;
using aether::test::expectTrue;
using aether::vst3::Vst3Effect;
using namespace Steinberg;
using namespace Steinberg::Vst;

namespace {

/** Gain plus a byte of custom state; mono-only if constructed so. */
class StatePlugin final : public aether::PluginProcessor {
public:
    explicit StatePlugin(bool monoOnly = false) : monoOnly_(monoOnly) {
        parameters_.addFloat("gain", "Gain", 0.0f, 2.0f, 1.0f);
    }

    bool isBusLayoutSupported(const aether::BusLayout& layout) const override {
        return monoOnly_ ? layout == aether::BusLayout::mono()
                         : aether::PluginProcessor::isBusLayoutSupported(layout);
    }

    std::uint8_t customByte = 0;

protected:
    void processBlock(aether::ProcessContext& context) override {
        context.output.clear();
    }

    void saveCustomState(std::vector<std::uint8_t>& out) const override {
        out.push_back(customByte);
    }

    void loadCustomState(std::span<const std::uint8_t> data) override {
        customByte = data.empty() ? 0 : data[0];
    }

private:
    bool monoOnly_;
};

/** Records restartComponent flags. Lives on the stack, so reference counting is a no-op. */
class TestComponentHandler final : public IComponentHandler {
public:
    tresult PLUGIN_API queryInterface(const TUID iid, void** obj) override {
        QUERY_INTERFACE(iid, obj, FUnknown::iid, IComponentHandler)
        QUERY_INTERFACE(iid, obj, IComponentHandler::iid, IComponentHandler)
        *obj = nullptr;
        return kNoInterface;
    }
    uint32 PLUGIN_API addRef() override {
        return 1;
    }
    uint32 PLUGIN_API release() override {
        return 1;
    }

    tresult PLUGIN_API beginEdit(ParamID) override {
        return kResultOk;
    }
    tresult PLUGIN_API performEdit(ParamID, ParamValue) override {
        return kResultOk;
    }
    tresult PLUGIN_API endEdit(ParamID) override {
        return kResultOk;
    }
    tresult PLUGIN_API restartComponent(int32 flags) override {
        restartFlags |= flags;
        ++restarts;
        return kResultOk;
    }

    int32 restartFlags = 0;
    int restarts = 0;
};

struct Instance {
    StatePlugin* dsp;
    Vst3Effect* effect;

    explicit Instance(bool monoOnly = false) {
        auto plugin = std::make_unique<StatePlugin>(monoOnly);
        dsp = plugin.get();
        effect = new Vst3Effect(std::move(plugin));
        effect->initialize(nullptr);
    }
    ~Instance() {
        effect->terminate();
        effect->release();
    }
    Instance(const Instance&) = delete;
    Instance& operator=(const Instance&) = delete;
};

const ParamID kGain = aether::parameterIdFromString("gain");

SpeakerArrangement arrangementOf(Vst3Effect& effect, BusDirection dir) {
    SpeakerArrangement arrangement = 0;
    effect.getBusArrangement(dir, 0, arrangement);
    return arrangement;
}

void testStateRoundTrip() {
    Instance source;
    source.effect->setParamNormalized(kGain, 0.25);
    source.dsp->customByte = 42;

    MemoryStream stream;
    expectTrue(source.effect->getState(&stream) == kResultOk, "getState succeeds");
    stream.seek(0, IBStream::kIBSeekSet, nullptr);

    Instance target;
    TestComponentHandler handler;
    target.effect->setComponentHandler(&handler);
    expectTrue(target.effect->setState(&stream) == kResultOk, "setState succeeds");
    expectNear(static_cast<float>(target.effect->getParamNormalized(kGain)), 0.25f, 1e-6f,
               "parameter restored and visible to the controller");
    expectTrue(target.dsp->customByte == 42, "custom state restored");
    expectTrue((handler.restartFlags & kParamValuesChanged) != 0,
               "host told to re-read parameter values");
    target.effect->setComponentHandler(nullptr);
}

void testCorruptState() {
    Instance target;
    target.effect->setParamNormalized(kGain, 0.75);
    TestComponentHandler handler;
    target.effect->setComponentHandler(&handler);

    MemoryStream stream;
    const std::array<std::uint8_t, 6> garbage{1, 2, 3, 4, 5, 6};
    int32 written = 0;
    stream.write(const_cast<std::uint8_t*>(garbage.data()), garbage.size(), &written);
    stream.seek(0, IBStream::kIBSeekSet, nullptr);

    expectTrue(target.effect->setState(&stream) == kResultFalse, "corrupt state refused");
    expectNear(static_cast<float>(target.effect->getParamNormalized(kGain)), 0.75f, 1e-6f,
               "corrupt state changes nothing");
    expectTrue(handler.restarts == 0, "no restart for a refused state");
    expectTrue(target.effect->setState(nullptr) == kInvalidArgument, "null stream refused");
    target.effect->setComponentHandler(nullptr);
}

void testBusArrangements() {
    Instance instance;
    Vst3Effect& effect = *instance.effect;

    SpeakerArrangement mono = SpeakerArr::kMono;
    SpeakerArrangement stereo = SpeakerArr::kStereo;
    SpeakerArrangement surround = SpeakerArr::k51;

    expectTrue(effect.setBusArrangements(&mono, 1, &mono, 1) == kResultTrue, "mono accepted");
    expectTrue(arrangementOf(effect, kInput) == SpeakerArr::kMono, "input switched to mono");
    expectTrue(arrangementOf(effect, kOutput) == SpeakerArr::kMono, "output switched to mono");

    expectTrue(effect.setBusArrangements(&mono, 1, &stereo, 1) == kResultFalse,
               "mono -> stereo refused (not supported by the processor)");
    expectTrue(effect.setBusArrangements(&surround, 1, &surround, 1) == kResultFalse,
               "5.1 refused");
    std::array<SpeakerArrangement, 2> two{SpeakerArr::kStereo, SpeakerArr::kStereo};
    expectTrue(effect.setBusArrangements(two.data(), 2, two.data(), 2) == kResultFalse,
               "sidechain buses refused");
    expectTrue(arrangementOf(effect, kOutput) == SpeakerArr::kMono,
               "refused arrangements leave the buses alone");

    ProcessSetup setup{kRealtime, kSample32, 128, 44100.0};
    effect.setupProcessing(setup);
    expectTrue(effect.setActive(true) == kResultOk, "activate in mono");
    expectTrue(instance.dsp->processSetup().layout == aether::BusLayout::mono(),
               "processor prepared in mono");
    expectTrue(effect.setBusArrangements(&stereo, 1, &stereo, 1) == kResultFalse,
               "no arrangement changes while active");
    effect.setActive(false);

    expectTrue(effect.setBusArrangements(&stereo, 1, &stereo, 1) == kResultTrue, "back to stereo");
}

void testMonoOnlyProcessor() {
    Instance instance(/*monoOnly=*/true);
    expectTrue(arrangementOf(*instance.effect, kOutput) == SpeakerArr::kMono,
               "a mono-only processor starts with a mono bus");
    SpeakerArrangement stereo = SpeakerArr::kStereo;
    expectTrue(instance.effect->setBusArrangements(&stereo, 1, &stereo, 1) == kResultFalse,
               "stereo refused for a mono-only processor");
}

} // namespace

int main() {
    testStateRoundTrip();
    testCorruptState();
    testBusArrangements();
    testMonoOnlyProcessor();
    return aether::test::finish("vst3_state_test");
}
