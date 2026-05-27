#pragma once

#include "aether/PluginProcessor.h"

class GainPlugin final : public aether::PluginProcessor {
public:
    void prepare(double sampleRate, int maxBlockSize) override;
    void reset() override;
    void process(aether::ProcessContext& context) override;

    aether::ParameterLayout createParameters() override;

    void setupUI();
};