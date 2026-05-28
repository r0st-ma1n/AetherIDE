#pragma once

#include "aether/AudioProcessor.h"
#include "aether/AudioProcessorParameter.h"

class GainPlugin final : public aether::AudioProcessor {
public:
    void prepareToPlay(double sampleRate, int maxBlockSize) override;
    void releaseResources() override;
    void processBlock(aether::ProcessContext& context) override;

    aether::ParameterLayout createParameters();

    void setupUI();
};
