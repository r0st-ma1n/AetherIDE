#pragma once

#include "aether/PluginProcessor.h"
#include "aether/host/AudioClip.h"

#include <functional>

namespace aether::host {

/** @brief How render() feeds the plugin. */
struct RenderOptions {
    /** Maximum block size; the last block may be shorter. */
    int blockSize = 512;

    /**
     * Called before each block with the index of its first frame, on the rendering thread.
     * Use it to change parameters mid-render, as a host would with automation.
     */
    std::function<void(PluginProcessor& plugin, int frame)> beforeBlock;
};

/**
 * @brief Runs @p input through @p plugin offline and returns the output.
 *
 * Acts as a format adapter (see docs/framework/plugin-contract.md): chooses the layout
 * input channels → same number of output channels, calls prepare(), process() per block
 * with separate input and output buffers, then release(). Buffers point into the clips,
 * nothing is copied per block.
 *
 * @throws std::invalid_argument if the plugin does not support the channel layout or
 *         @p options.blockSize is not positive.
 */
AudioClip render(PluginProcessor& plugin, const AudioClip& input,
                 const RenderOptions& options = {});

} // namespace aether::host
