#pragma once

#include "aether/PluginProcessor.h"

#include "public.sdk/source/vst/vstsinglecomponenteffect.h"

#include <memory>

namespace aether::vst3 {

/**
 * @brief VST3 component and controller around one aether::PluginProcessor.
 *
 * Translates VST3 calls into the plugin contract (docs/framework/plugin-contract.md): the
 * host's setupProcessing / setActive become prepare / release, process() hands the host's
 * buffers to the processor without copying, and parameter changes go straight to the
 * processor's parameters. The processor's parameters are the only copy of the values: the
 * controller side reads and writes them too, so the host always sees what the DSP uses.
 *
 * v1: one main audio bus in and out, mono or stereo (whichever the processor supports),
 * 32-bit samples only, no events, no custom editor.
 */
class Vst3Effect : public Steinberg::Vst::SingleComponentEffect {
public:
    /** @param processor A new, unprepared instance, e.g. from aether::pluginFactory(). */
    explicit Vst3Effect(std::unique_ptr<PluginProcessor> processor);
    ~Vst3Effect() override;

    PluginProcessor& processor() noexcept {
        return *processor_;
    }

    // IPluginBase
    Steinberg::tresult PLUGIN_API initialize(Steinberg::FUnknown* context) override;
    Steinberg::tresult PLUGIN_API terminate() override;

    // IComponent
    Steinberg::tresult PLUGIN_API setActive(Steinberg::TBool state) override;

    // IAudioProcessor
    Steinberg::tresult PLUGIN_API setupProcessing(Steinberg::Vst::ProcessSetup& setup) override;
    Steinberg::tresult PLUGIN_API
    canProcessSampleSize(Steinberg::int32 symbolicSampleSize) override;
    Steinberg::uint32 PLUGIN_API getLatencySamples() override;
    Steinberg::uint32 PLUGIN_API getTailSamples() override;
    Steinberg::tresult PLUGIN_API process(Steinberg::Vst::ProcessData& data) override;

    // IEditController: values live in the processor's parameters.
    Steinberg::Vst::ParamValue PLUGIN_API getParamNormalized(Steinberg::Vst::ParamID id) override;
    Steinberg::tresult PLUGIN_API setParamNormalized(Steinberg::Vst::ParamID id,
                                                     Steinberg::Vst::ParamValue value) override;

private:
    void applyParameterChanges(Steinberg::Vst::IParameterChanges* changes) noexcept;
    BusLayout busLayout() const;

    std::unique_ptr<PluginProcessor> processor_;
    Steinberg::Vst::ProcessSetup setup_{};
};

} // namespace aether::vst3
