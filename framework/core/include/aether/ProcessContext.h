#pragma once

#include "aether/AudioBuffer.h"

namespace aether {

/** @brief Number of input and output channels of the plugin's main bus. */
struct BusLayout {
    int inputChannels = 2;
    int outputChannels = 2;

    static constexpr BusLayout mono() noexcept {
        return {1, 1};
    }

    static constexpr BusLayout stereo() noexcept {
        return {2, 2};
    }

    friend constexpr bool operator==(const BusLayout&, const BusLayout&) = default;
};

/** @brief Processing configuration, fixed between prepare() and release(). */
struct ProcessSetup {
    /** Sample rate in Hz. */
    double sampleRate = 44100.0;
    /** Upper bound for the number of samples in one block. */
    int maxBlockSize = 512;
    /** Channel layout; one of the layouts the processor supports. */
    BusLayout layout = BusLayout::stereo();
};

/**
 * @brief Audio for one block.
 *
 * Both buffers have the same number of samples, at most ProcessSetup::maxBlockSize and
 * possibly 0. Channel counts match ProcessSetup::layout. `input` and `output` may point at
 * the same channel arrays (in-place processing), so read an input sample before writing the
 * output sample at that index.
 *
 * Parameters are not part of the context: the processor owns them (see PluginProcessor).
 */
struct ProcessContext {
    const AudioBuffer& input;
    AudioBuffer& output;
};

} // namespace aether
