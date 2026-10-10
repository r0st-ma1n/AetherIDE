#include "aether/vst3/Vst3Effect.h"

#include "pluginterfaces/base/ibstream.h"
#include "pluginterfaces/vst/ivstparameterchanges.h"
#include "public.sdk/source/vst/utility/stringconvert.h"
#include "public.sdk/source/vst/vstparameters.h"

#include <algorithm>
#include <cmath>
#include <optional>
#include <string>
#include <vector>

namespace aether::vst3 {

using namespace Steinberg;
using namespace Steinberg::Vst;

namespace {

/** Copies UTF-8 @p text into a VST3 String128, truncating if needed. */
void toString128(const std::string& text, String128 out) {
    StringConvert::convert(text, out);
}

/** A VST3 parameter whose text and plain-value conversions are the Aether parameter's. */
class AetherParameter final : public Parameter {
public:
    explicit AetherParameter(AudioProcessorParameter& param) : param_(param) {
        ParameterInfo& i = getInfo();
        i.id = param.numericId();
        toString128(param.name(), i.title);
        toString128(param.name(), i.shortTitle);
        toString128(param.unit(), i.units);
        i.stepCount = param.stepCount();
        i.defaultNormalizedValue = param.toNormalized(param.defaultValue());
        i.unitId = kRootUnitId;
        i.flags = 0;
        if (param.isAutomatable()) {
            i.flags |= ParameterInfo::kCanAutomate;
        }
        if (param.isBypass()) {
            i.flags |= ParameterInfo::kIsBypass;
        }
        if (param.kind() == ParameterKind::Choice) {
            i.flags |= ParameterInfo::kIsList;
        }
        valueNormalized = i.defaultNormalizedValue;
    }

    void toString(ParamValue normalized, String128 string) const override {
        toString128(param_.valueToText(param_.fromNormalized(static_cast<float>(normalized))),
                    string);
    }

    bool fromString(const TChar* string, ParamValue& normalized) const override {
        const std::optional<float> value = param_.textToValue(StringConvert::convert(string));
        if (!value) {
            return false;
        }
        normalized = param_.toNormalized(*value);
        return true;
    }

    ParamValue toPlain(ParamValue normalized) const override {
        return param_.fromNormalized(static_cast<float>(normalized));
    }

    ParamValue toNormalized(ParamValue plain) const override {
        return param_.toNormalized(static_cast<float>(plain));
    }

private:
    AudioProcessorParameter& param_;
};

/** Channels of the first (main) bus in @p buses, 0 if there is none. */
int mainBusChannels(const BusList& buses) {
    if (buses.empty()) {
        return 0;
    }
    const auto& bus = static_cast<const AudioBus&>(*buses[0]);
    return SpeakerArr::getChannelCount(bus.getArrangement());
}

} // namespace

Vst3Effect::Vst3Effect(std::unique_ptr<PluginProcessor> processor)
    : processor_(std::move(processor)) {}

Vst3Effect::~Vst3Effect() = default;

tresult PLUGIN_API Vst3Effect::initialize(FUnknown* context) {
    const tresult result = SingleComponentEffect::initialize(context);
    if (result != kResultOk) {
        return result;
    }

    // Main bus: stereo when the processor supports it, otherwise mono.
    const bool stereo = processor_->isBusLayoutSupported(BusLayout::stereo());
    const SpeakerArrangement arrangement = stereo ? SpeakerArr::kStereo : SpeakerArr::kMono;
    addAudioInput(STR16("Input"), arrangement);
    addAudioOutput(STR16("Output"), arrangement);

    ParameterLayout& layout = processor_->parameters();
    for (std::size_t i = 0; i < layout.size(); ++i) {
        parameters.addParameter(new AetherParameter(layout[i]));
    }
    return kResultOk;
}

tresult PLUGIN_API Vst3Effect::terminate() {
    processor_->release();
    return SingleComponentEffect::terminate();
}

BusLayout Vst3Effect::busLayout() const {
    return {mainBusChannels(audioInputs), mainBusChannels(audioOutputs)};
}

tresult PLUGIN_API Vst3Effect::setActive(TBool state) {
    if (state) {
        const BusLayout layout = busLayout();
        if (!processor_->isBusLayoutSupported(layout)) {
            return kResultFalse;
        }
        processor_->prepare({.sampleRate = setup_.sampleRate,
                             .maxBlockSize = setup_.maxSamplesPerBlock,
                             .layout = layout});
    } else {
        processor_->release();
    }
    return SingleComponentEffect::setActive(state);
}

tresult PLUGIN_API Vst3Effect::getState(IBStream* state) {
    if (state == nullptr) {
        return kInvalidArgument;
    }
    const PluginState bytes = processor_->getState();
    int32 written = 0;
    if (state->write(const_cast<std::uint8_t*>(bytes.data()), static_cast<int32>(bytes.size()),
                     &written) != kResultOk ||
        written != static_cast<int32>(bytes.size())) {
        return kResultFalse;
    }
    return kResultOk;
}

tresult PLUGIN_API Vst3Effect::setState(IBStream* state) {
    if (state == nullptr) {
        return kInvalidArgument;
    }
    // The host's stream holds exactly what getState() wrote; read it to the end.
    std::vector<std::uint8_t> bytes;
    std::uint8_t chunk[4096];
    for (;;) {
        int32 read = 0;
        if (state->read(chunk, static_cast<int32>(sizeof(chunk)), &read) != kResultOk ||
            read <= 0) {
            break;
        }
        bytes.insert(bytes.end(), chunk, chunk + read);
    }
    if (!processor_->setState(bytes)) {
        return kResultFalse;
    }
    // Values changed behind the host's back: make it re-read them (and refresh its UI).
    if (componentHandler) {
        componentHandler->restartComponent(kParamValuesChanged);
    }
    return kResultOk;
}

tresult PLUGIN_API Vst3Effect::setBusArrangements(SpeakerArrangement* inputs, int32 numIns,
                                                  SpeakerArrangement* outputs, int32 numOuts) {
    // v1: exactly one main bus each way, mono or stereo, and only layouts the processor
    // supports (by default mono -> mono and stereo -> stereo).
    if (numIns != 1 || numOuts != 1 || inputs == nullptr || outputs == nullptr) {
        return kResultFalse;
    }
    const auto isMonoOrStereo = [](SpeakerArrangement arrangement) {
        return arrangement == SpeakerArr::kMono || arrangement == SpeakerArr::kStereo;
    };
    if (!isMonoOrStereo(inputs[0]) || !isMonoOrStereo(outputs[0])) {
        return kResultFalse;
    }
    const BusLayout layout{SpeakerArr::getChannelCount(inputs[0]),
                           SpeakerArr::getChannelCount(outputs[0])};
    if (processor_->isPrepared() || !processor_->isBusLayoutSupported(layout)) {
        return kResultFalse;
    }
    return SingleComponentEffect::setBusArrangements(inputs, numIns, outputs, numOuts);
}

tresult PLUGIN_API Vst3Effect::setupProcessing(Vst::ProcessSetup& setup) {
    if (canProcessSampleSize(setup.symbolicSampleSize) != kResultTrue) {
        return kResultFalse;
    }
    setup_ = setup;
    return SingleComponentEffect::setupProcessing(setup);
}

tresult PLUGIN_API Vst3Effect::canProcessSampleSize(int32 symbolicSampleSize) {
    // v1 processes 32-bit floats only; hosts convert 64-bit projects.
    return symbolicSampleSize == kSample32 ? kResultTrue : kResultFalse;
}

uint32 PLUGIN_API Vst3Effect::getLatencySamples() {
    return static_cast<uint32>(processor_->getLatencySamples());
}

uint32 PLUGIN_API Vst3Effect::getTailSamples() {
    const double seconds = processor_->getTailSeconds();
    if (!(seconds > 0.0)) {
        return kNoTail;
    }
    if (std::isinf(seconds)) {
        return kInfiniteTail;
    }
    // Finite tails stay below kInfiniteTail, which means "forever".
    const double samples = std::ceil(seconds * setup_.sampleRate);
    return static_cast<uint32>(std::min(samples, static_cast<double>(kInfiniteTail - 1)));
}

void Vst3Effect::applyParameterChanges(IParameterChanges* changes) noexcept {
    if (changes == nullptr) {
        return;
    }
    const int32 count = changes->getParameterCount();
    for (int32 i = 0; i < count; ++i) {
        IParamValueQueue* queue = changes->getParameterData(i);
        if (queue == nullptr || queue->getPointCount() <= 0) {
            continue;
        }
        // v1: the last value of the block; the processor smooths (SmoothedValue).
        int32 offset = 0;
        ParamValue value = 0.0;
        if (queue->getPoint(queue->getPointCount() - 1, offset, value) != kResultOk) {
            continue;
        }
        if (AudioProcessorParameter* param =
                processor_->parameters().findById(queue->getParameterId())) {
            param->setNormalizedValue(static_cast<float>(value));
        }
    }
}

tresult PLUGIN_API Vst3Effect::process(ProcessData& data) {
    applyParameterChanges(data.inputParameterChanges);

    // A block without audio only delivers parameter changes.
    if (data.numSamples <= 0 || data.numOutputs < 1 || data.outputs[0].numChannels <= 0) {
        return kResultOk;
    }
    if (data.symbolicSampleSize != kSample32 || !processor_->isPrepared()) {
        return kResultFalse;
    }

    // The contract promises the channel counts of the prepared layout (an inactive input
    // bus may deliver none).
    const BusLayout& layout = processor_->processSetup().layout;
    AudioBusBuffers& out = data.outputs[0];
    const bool hasInput = data.numInputs > 0 && data.inputs[0].numChannels > 0;
    if (out.numChannels != layout.outputChannels ||
        (hasInput && data.inputs[0].numChannels != layout.inputChannels) ||
        data.numSamples > processor_->processSetup().maxBlockSize) {
        return kResultFalse;
    }

    // The host's channel arrays are passed through as is: no copy, in-place safe.
    AudioBuffer output(out.channelBuffers32, out.numChannels, data.numSamples);
    const AudioBuffer input = hasInput ? AudioBuffer(data.inputs[0].channelBuffers32,
                                                     data.inputs[0].numChannels, data.numSamples)
                                       : AudioBuffer(nullptr, 0, data.numSamples);

    ProcessContext context{input, output};
    processor_->process(context);
    out.silenceFlags = 0;
    return kResultOk;
}

ParamValue PLUGIN_API Vst3Effect::getParamNormalized(ParamID id) {
    const AudioProcessorParameter* param = processor_->parameters().findById(id);
    return param ? param->normalizedValue() : 0.0;
}

tresult PLUGIN_API Vst3Effect::setParamNormalized(ParamID id, ParamValue value) {
    AudioProcessorParameter* param = processor_->parameters().findById(id);
    if (param == nullptr) {
        return kResultFalse;
    }
    param->setNormalizedValue(static_cast<float>(value));
    return kResultTrue;
}

} // namespace aether::vst3
