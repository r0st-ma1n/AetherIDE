// Drives aether::vst3::Vst3Effect the way a VST3 host does: initialize, setupProcessing,
// setActive, process with parameter changes, then deactivate and terminate.
#include "support/AllocationCounter.h"
#include "support/Check.h"

#include "aether/vst3/Vst3Effect.h"

#include "public.sdk/source/vst/hosting/parameterchanges.h"
#include "public.sdk/source/vst/utility/stringconvert.h"

#include <array>
#include <cmath>
#include <memory>
#include <string>
#include <vector>

using aether::test::AllocationCounter;
using aether::test::expectNear;
using aether::test::expectTrue;
using aether::vst3::Vst3Effect;
using namespace Steinberg;
using namespace Steinberg::Vst;

namespace {

constexpr int kBlock = 64;
constexpr double kSampleRate = 48000.0;

/** Scales by "gain" and records what the adapter handed over. */
class TestPlugin final : public aether::PluginProcessor {
public:
    TestPlugin() {
        gain_ = &parameters_.addFloat("gain", "Gain", 0.0f, 2.0f, 1.0f, {.unit = "x"});
        parameters_.addChoice("mode", "Mode", {"Soft", "Hard", "Clip"}, 0);
        addBypassParameter();
    }

    int getLatencySamples() const override {
        return 64;
    }

    double getTailSeconds() const override {
        return 0.5;
    }

    aether::ProcessSetup preparedSetup{};
    const float* lastOutputChannel = nullptr;
    int processCalls = 0;

protected:
    void prepareToPlay(const aether::ProcessSetup& setup) override {
        preparedSetup = setup;
    }

    void processBlock(aether::ProcessContext& context) override {
        ++processCalls;
        lastOutputChannel = context.output.channel(0);
        const float gain = gain_->value();
        for (int ch = 0; ch < context.output.numChannels(); ++ch) {
            for (int i = 0; i < context.output.numSamples(); ++i) {
                context.output.channel(ch)[i] = context.input.channel(ch)[i] * gain;
            }
        }
    }

private:
    aether::AudioProcessorParameter* gain_;
};

/** Host-side stereo buffers for one block. */
struct HostBuffers {
    std::array<std::vector<float>, 2> in{std::vector<float>(kBlock, 0.5f),
                                         std::vector<float>(kBlock, -0.25f)};
    std::array<std::vector<float>, 2> out{std::vector<float>(kBlock, 9.0f),
                                          std::vector<float>(kBlock, 9.0f)};
    std::array<float*, 2> inPtrs{in[0].data(), in[1].data()};
    std::array<float*, 2> outPtrs{out[0].data(), out[1].data()};
    AudioBusBuffers inputBus{};
    AudioBusBuffers outputBus{};
    ProcessData data{};

    explicit HostBuffers(IParameterChanges* changes = nullptr, int numSamples = kBlock) {
        inputBus.numChannels = 2;
        inputBus.channelBuffers32 = inPtrs.data();
        outputBus.numChannels = 2;
        outputBus.channelBuffers32 = outPtrs.data();
        data.processMode = kRealtime;
        data.symbolicSampleSize = kSample32;
        data.numSamples = numSamples;
        data.numInputs = 1;
        data.numOutputs = 1;
        data.inputs = &inputBus;
        data.outputs = &outputBus;
        data.inputParameterChanges = changes;
    }
};

std::string paramText(Vst3Effect& effect, ParamID id, ParamValue normalized) {
    String128 text{};
    effect.getParamStringByValue(id, normalized, text);
    return StringConvert::convert(text);
}

ParamID idOf(const char* id) {
    return aether::parameterIdFromString(id);
}

} // namespace

int main() {
    auto plugin = std::make_unique<TestPlugin>();
    TestPlugin& dsp = *plugin;
    auto* effect = new Vst3Effect(std::move(plugin));

    // --- initialize: buses and parameters ---
    expectTrue(effect->initialize(nullptr) == kResultOk, "initialize succeeds");
    expectTrue(effect->getBusCount(kAudio, kInput) == 1, "one input bus");
    expectTrue(effect->getBusCount(kAudio, kOutput) == 1, "one output bus");
    SpeakerArrangement arrangement = 0;
    effect->getBusArrangement(kOutput, 0, arrangement);
    expectTrue(arrangement == SpeakerArr::kStereo, "stereo main bus");
    expectTrue(effect->getParameterCount() == 3, "three parameters");

    ParameterInfo gain{};
    effect->getParameterInfo(0, gain);
    expectTrue(gain.id == idOf("gain"), "gain uses the numeric id of the contract");
    expectTrue(StringConvert::convert(gain.title) == "Gain", "gain title");
    expectTrue(StringConvert::convert(gain.units) == "x", "gain unit");
    expectTrue(gain.stepCount == 0, "gain is continuous");
    expectNear(static_cast<float>(gain.defaultNormalizedValue), 0.5f, 1e-6f, "gain default");
    expectTrue((gain.flags & ParameterInfo::kCanAutomate) != 0, "gain is automatable");

    ParameterInfo mode{};
    effect->getParameterInfo(1, mode);
    expectTrue(mode.stepCount == 2, "choice of three has two steps");
    expectTrue((mode.flags & ParameterInfo::kIsList) != 0, "choice is a list");

    ParameterInfo bypass{};
    effect->getParameterInfo(2, bypass);
    expectTrue((bypass.flags & ParameterInfo::kIsBypass) != 0, "bypass is flagged");

    // --- text and plain values come from the contract ---
    expectTrue(paramText(*effect, idOf("gain"), 0.75) == "1.50", "gain text");
    expectTrue(paramText(*effect, idOf("mode"), 1.0) == "Clip", "choice text");
    TChar input[] = u"0.5";
    ParamValue parsed = 0.0;
    expectTrue(effect->getParamValueByString(idOf("gain"), input, parsed) == kResultOk,
               "gain parses text");
    expectNear(static_cast<float>(parsed), 0.25f, 1e-6f, "parsed gain is normalized");
    expectNear(static_cast<float>(effect->normalizedParamToPlain(idOf("gain"), 0.5)), 1.0f, 1e-6f,
               "plain value");

    // --- sample size and setup ---
    expectTrue(effect->canProcessSampleSize(kSample32) == kResultTrue, "32-bit supported");
    expectTrue(effect->canProcessSampleSize(kSample64) == kResultFalse, "64-bit refused");
    ProcessSetup setup64{kRealtime, kSample64, 256, kSampleRate};
    expectTrue(effect->setupProcessing(setup64) == kResultFalse, "64-bit setup refused");
    ProcessSetup setup{kRealtime, kSample32, 256, kSampleRate};
    expectTrue(effect->setupProcessing(setup) == kResultOk, "32-bit setup accepted");

    // --- activation prepares the processor ---
    expectTrue(effect->setActive(true) == kResultOk, "activate");
    expectTrue(dsp.isPrepared(), "processor prepared");
    expectTrue(dsp.preparedSetup.sampleRate == kSampleRate, "prepared sample rate");
    expectTrue(dsp.preparedSetup.maxBlockSize == 256, "prepared block size");
    expectTrue(dsp.preparedSetup.layout == aether::BusLayout::stereo(), "prepared layout");
    expectTrue(effect->getLatencySamples() == 64, "latency from the processor");
    expectTrue(effect->getTailSamples() == 24000, "tail in samples");

    // --- process: last parameter value of the block, buffers without copies ---
    {
        ParameterChanges changes;
        int32 index = 0;
        IParamValueQueue* queue = changes.addParameterData(idOf("gain"), index);
        queue->addPoint(0, 0.25, index);
        queue->addPoint(10, 0.75, index);

        HostBuffers host(&changes);
        AllocationCounter counter;
        expectTrue(effect->process(host.data) == kResultOk, "process succeeds");
        expectTrue(counter.count() == 0, "process does not allocate");
        expectTrue(dsp.lastOutputChannel == host.out[0].data(), "host buffers are not copied");
        expectNear(host.out[0][kBlock - 1], 0.75f, 1e-6f, "left = 0.5 * gain 1.5");
        expectNear(host.out[1][0], -0.375f, 1e-6f, "right = -0.25 * gain 1.5");
        expectNear(static_cast<float>(effect->getParamNormalized(idOf("gain"))), 0.75f, 1e-6f,
                   "controller sees the processor value");
    }

    // --- the controller writes the processor's parameter ---
    effect->setParamNormalized(idOf("gain"), 0.0);
    {
        HostBuffers host;
        effect->process(host.data);
        expectNear(host.out[0][0], 0.0f, 1e-6f, "gain 0 from the controller silences");
    }

    // --- an empty block still delivers parameter changes ---
    {
        ParameterChanges changes;
        int32 index = 0;
        changes.addParameterData(idOf("gain"), index)->addPoint(0, 0.5, index);
        HostBuffers host(&changes, 0);
        const int callsBefore = dsp.processCalls;
        expectTrue(effect->process(host.data) == kResultOk, "empty block succeeds");
        expectTrue(dsp.processCalls == callsBefore, "empty block skips processBlock");
        expectNear(dsp.getParameter("gain")->value(), 1.0f, 1e-6f, "empty block applies gain");
    }

    // --- bypass passes the input through ---
    {
        effect->setParamNormalized(idOf("gain"), 0.0);
        effect->setParamNormalized(bypass.id, 1.0);
        HostBuffers host;
        effect->process(host.data);
        expectNear(host.out[0][5], 0.5f, 1e-6f, "bypass copies the left input");
        expectNear(host.out[1][5], -0.25f, 1e-6f, "bypass copies the right input");
        effect->setParamNormalized(bypass.id, 0.0);
    }

    // --- channel counts other than the prepared layout are refused ---
    {
        HostBuffers host;
        host.outputBus.numChannels = 1;
        expectTrue(effect->process(host.data) == kResultFalse, "mono output refused");
    }

    // --- deactivation releases ---
    expectTrue(effect->setActive(false) == kResultOk, "deactivate");
    expectTrue(!dsp.isPrepared(), "processor released");

    expectTrue(effect->terminate() == kResultOk, "terminate succeeds");
    effect->release();

    return aether::test::finish("vst3_effect_test");
}
