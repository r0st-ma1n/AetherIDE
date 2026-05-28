#pragma once

#include "aether/ProcessContext.h"

namespace aether {

/**
 * @brief Abstract base class for all audio processors.
 *
 * Subclass this to implement an audio plugin. The host calls
 * prepareToPlay() before streaming begins, processBlock() for each
 * block of audio, and releaseResources() when streaming ends.
 */
class AudioProcessor {
public:
    virtual ~AudioProcessor() = default;

    /**
     * @brief Called before processing begins to allocate resources.
     * @param sampleRate    The sample rate in Hz.
     * @param maxBlockSize  Maximum number of samples per block.
     */
    virtual void prepareToPlay(double sampleRate, int maxBlockSize) = 0;

    /**
     * @brief Processes one block of audio.
     * @param context  The processing context containing audio buffers and parameters.
     */
    virtual void processBlock(ProcessContext& context) = 0;

    /**
     * @brief Called after processing ends to free resources.
     */
    virtual void releaseResources() = 0;
};

} // namespace aether
