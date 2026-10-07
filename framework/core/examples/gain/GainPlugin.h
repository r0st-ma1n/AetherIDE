#pragma once

#include "aether/PluginFactory.h"
#include "aether/SmoothedValue.h"

/** Minimal effect: scales the input by a smoothed gain, with a bypass switch. */
class GainPlugin final : public aether::PluginProcessor {
public:
    /** Gain changes are ramped over this time to avoid clicks. */
    static constexpr double kGainSmoothingMs = 20.0;

    static aether::PluginInfo pluginInfo();

    GainPlugin();

protected:
    void prepareToPlay(const aether::ProcessSetup& setup) override;
    void processBlock(aether::ProcessContext& context) override;

private:
    aether::AudioProcessorParameter* gainParameter_;
    aether::SmoothedValue gain_;
};
