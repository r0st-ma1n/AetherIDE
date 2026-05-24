#pragma once

#include "apf/PluginProcessor.h"

class GainPlugin final : public apf::PluginProcessor {
public:
    void prepare(double sampleRate, int maxBlockSize) override;
    void reset() override;
    void process(apf::ProcessContext& context) override;

    apf::ParameterLayout createParameters() override;

    void setupUI();
};