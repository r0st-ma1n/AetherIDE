#pragma once

#include "aether/AudioBuffer.h"
#include "aether/AudioProcessorParameter.h"

namespace aether {

struct ProcessContext {
    AudioBuffer& audio;
    ParameterLayout& parameters;
    double sampleRate;
    int blockSize;
};

} // namespace aether
