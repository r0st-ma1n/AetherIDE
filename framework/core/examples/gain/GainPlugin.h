#pragma once

#include "aether/AudioProcessor.h"
#include "aether/AudioProcessorParameter.h"
#include "aether/SmoothedValue.h"

class GainPlugin final : public aether::AudioProcessor {
public:
    /** Gain changes are ramped over this time to avoid clicks. */
    static constexpr double kGainSmoothingMs = 20.0;

    void prepareToPlay(double sampleRate, int maxBlockSize) override;
    void releaseResources() override;
    void processBlock(aether::ProcessContext& context) override;

    aether::ParameterLayout createParameters();

    void setupUI();

private:
    aether::SmoothedValue gain_;
};
