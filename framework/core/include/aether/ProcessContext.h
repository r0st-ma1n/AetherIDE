#pragma once

#include "aether/AudioBuffer.h"
#include "aether/Parameter.h"

namespace aether {

struct ProcessContext {
    AudioBuffer& audio;
    ParameterLayout& parameters;
    double sampleRate;
    int blockSize;
};

}