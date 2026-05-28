#pragma once

#include "aether/ProcessContext.h"
#include "aether/Parameter.h"

namespace aether {

class PluginProcessor {
public:
    virtual ~PluginProcessor() = default;

    virtual void prepare(double sampleRate, int maxBlockSize) = 0;
    virtual void reset() = 0;
    virtual void process(ProcessContext& context) = 0;

    virtual ParameterLayout createParameters() = 0;
};

}