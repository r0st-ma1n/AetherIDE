// Checks that the vendored VST3 SDK builds and links: a minimal SingleComponentEffect goes
// through initialize, bus setup, processing setup and terminate.
#include "support/Check.h"

#include "pluginterfaces/vst/ivstaudioprocessor.h"
#include "public.sdk/source/vst/vstsinglecomponenteffect.h"

using aether::test::expectTrue;
using namespace Steinberg;
using namespace Steinberg::Vst;

namespace {

class StereoEffect final : public SingleComponentEffect {
public:
    tresult PLUGIN_API initialize(FUnknown* context) override {
        const tresult result = SingleComponentEffect::initialize(context);
        if (result != kResultOk) {
            return result;
        }
        addAudioInput(STR16("Input"), SpeakerArr::kStereo);
        addAudioOutput(STR16("Output"), SpeakerArr::kStereo);
        parameters.addParameter(STR16("Gain"), nullptr, 0, 1.0, ParameterInfo::kCanAutomate, 0);
        return kResultOk;
    }

    tresult PLUGIN_API process(ProcessData& /*data*/) override {
        return kResultOk;
    }
};

} // namespace

int main() {
    auto* effect = new StereoEffect();

    expectTrue(effect->initialize(nullptr) == kResultOk, "initialize succeeds");
    expectTrue(effect->getBusCount(kAudio, kInput) == 1, "one audio input bus");
    expectTrue(effect->getBusCount(kAudio, kOutput) == 1, "one audio output bus");
    expectTrue(effect->getParameterCount() == 1, "one parameter");

    ProcessSetup setup{kRealtime, kSample32, 512, 48000.0};
    expectTrue(effect->setupProcessing(setup) == kResultOk, "setupProcessing succeeds");
    expectTrue(effect->canProcessSampleSize(kSample32) == kResultTrue, "32-bit processing");

    expectTrue(effect->terminate() == kResultOk, "terminate succeeds");
    effect->release();

    return aether::test::finish("vst3_sdk_test");
}
