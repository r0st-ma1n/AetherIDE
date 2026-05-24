#pragma once

#include "apf/AudioBuffer.h"
#include "apf/Parameter.h"

namespace apf {

struct ProcessContext {
    AudioBuffer& audio;
    ParameterLayout& parameters;
    double sampleRate;
    int blockSize;
};

}