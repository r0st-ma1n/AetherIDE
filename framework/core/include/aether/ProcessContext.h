#pragma once

#include "aether/AudioBuffer.h"
#include "aether/AudioProcessorParameter.h"

namespace aether {

/**
 * @brief Everything a processor gets for one block.
 *
 * `input` and `output` may point at the same channel arrays (in-place processing), so a
 * processor must read an input sample before it writes the output sample at that index.
 */
struct ProcessContext {
    const AudioBuffer& input;
    AudioBuffer& output;
    ParameterLayout& parameters;
    double sampleRate;
    int blockSize;
};

} // namespace aether
