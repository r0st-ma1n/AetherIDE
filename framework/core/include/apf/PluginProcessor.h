#pragma once

#include "apf/ProcessContext.h"
#include "apf/Parameter.h"

namespace apf {

class PluginProcessor {
public:
    virtual ~PluginProcessor() = default;

    virtual void prepare(double sampleRate, int maxBlockSize) = 0;
    virtual void reset() = 0;
    virtual void process(ProcessContext& context) = 0;

    virtual ParameterLayout createParameters() = 0;
};

}