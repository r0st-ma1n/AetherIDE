#pragma once

#include "aether/AudioProcessorParameter.h"
#include "aether/PluginState.h"
#include "aether/ProcessContext.h"

#include <cassert>
#include <cstdint>
#include <span>
#include <string_view>
#include <vector>

namespace aether {

/**
 * @brief Base class of every Aether plugin; the only thing format adapters talk to.
 *
 * The processor owns its parameters and describes its capabilities (bus layouts, latency,
 * tail). Format adapters (VST3, CLAP, AU, the headless host) drive it through the
 * non-virtual calls prepare(), process() and release(); the plugin implements the
 * protected virtual hooks. The full contract — which call comes from which thread and what
 * is forbidden on the audio thread — is in docs/framework/plugin-contract.md.
 *
 * Minimal plugin:
 *
 *     class MyGain : public aether::PluginProcessor {
 *     public:
 *         static aether::PluginInfo pluginInfo();
 *         MyGain() { gain_ = &parameters_.addFloat("gain", "Gain", 0.0f, 2.0f, 1.0f); }
 *
 *     protected:
 *         void processBlock(aether::ProcessContext& context) override { ... }
 *
 *     private:
 *         aether::AudioProcessorParameter* gain_;
 *     };
 *
 *     AETHER_PLUGIN(MyGain)
 */
class PluginProcessor {
public:
    PluginProcessor() = default;
    virtual ~PluginProcessor() = default;

    PluginProcessor(const PluginProcessor&) = delete;
    PluginProcessor& operator=(const PluginProcessor&) = delete;

    // --- Called by format adapters ------------------------------------------------------

    /**
     * @brief Prepares for processing with @p setup; main thread.
     *
     * If already prepared, releases first. @p setup.layout must be supported
     * (see isBusLayoutSupported()).
     */
    void prepare(const ProcessSetup& setup) {
        assert(isBusLayoutSupported(setup.layout));
        if (prepared_) {
            release();
        }
        setup_ = setup;
        bypass_ = parameters_.bypass();
        prepareToPlay(setup_);
        prepared_ = true;
    }

    /**
     * @brief Processes one block; audio thread.
     *
     * When the bypass parameter is on, copies input to output without calling
     * processBlock(). Must not throw: an exception here terminates the host.
     */
    void process(ProcessContext& context) noexcept {
        assert(prepared_);
        assert(context.output.numSamples() <= setup_.maxBlockSize);
        assert(context.input.numChannels() == 0 ||
               context.input.numSamples() == context.output.numSamples());

        if (bypass_ != nullptr && bypass_->boolValue()) {
            passThrough(context);
            return;
        }
        processBlock(context);
    }

    /** @brief Ends processing and frees resources from prepare(); main thread. */
    void release() {
        if (!prepared_) {
            return;
        }
        prepared_ = false;
        releaseResources();
    }

    bool isPrepared() const noexcept {
        return prepared_;
    }

    /** @brief Setup passed to the last prepare(). */
    const ProcessSetup& processSetup() const noexcept {
        return setup_;
    }

    // --- Capabilities; override to change --------------------------------------------

    /** @brief Whether the plugin can run with @p layout. Default: mono→mono, stereo→stereo. */
    virtual bool isBusLayoutSupported(const BusLayout& layout) const {
        return layout == BusLayout::mono() || layout == BusLayout::stereo();
    }

    /** @brief Delay the plugin adds, in samples; the host compensates for it. */
    virtual int getLatencySamples() const {
        return 0;
    }

    /** @brief How long the output keeps sounding after the input goes silent, in seconds. */
    virtual double getTailSeconds() const {
        return 0.0;
    }

    // --- Parameters and state ---------------------------------------------------------

    ParameterLayout& parameters() noexcept {
        return parameters_;
    }

    const ParameterLayout& parameters() const noexcept {
        return parameters_;
    }

    /** @return Parameter with the given string id, or nullptr. */
    AudioProcessorParameter* getParameter(std::string_view id) noexcept {
        return parameters_.find(id);
    }

    const AudioProcessorParameter* getParameter(std::string_view id) const noexcept {
        return parameters_.find(id);
    }

    /**
     * @brief Serialises the plugin for the DAW project or a preset; see PluginState.
     *
     * Main thread; may run while the audio thread is processing.
     */
    PluginState getState() const {
        std::vector<std::uint8_t> custom;
        saveCustomState(custom);
        return savePluginState(parameters_, custom);
    }

    /**
     * @brief Restores a state produced by getState(), possibly by an older plugin version.
     *
     * Parameters missing from the state get their defaults, unknown ids are ignored.
     * loadCustomState() is called only if the state is valid. Main thread; may run while
     * the audio thread is processing.
     *
     * @return false if the state is corrupt or from a newer format; nothing is changed then.
     */
    bool setState(std::span<const std::uint8_t> state) {
        std::vector<std::uint8_t> custom;
        if (!loadPluginState(parameters_, state, &custom)) {
            return false;
        }
        loadCustomState(custom);
        return true;
    }

protected:
    // --- Implemented by the plugin -----------------------------------------------------

    /**
     * @brief Allocate buffers and reset DSP state for @p setup; main thread.
     *
     * Called before the first processBlock() and again whenever the sample rate, maximum
     * block size or layout changes.
     */
    virtual void prepareToPlay([[maybe_unused]] const ProcessSetup& setup) {}

    /**
     * @brief Produces one block of output from input; audio thread.
     *
     * Must not allocate, lock, wait, do I/O or throw. Read parameters through the
     * AudioProcessorParameter pointers kept from the constructor.
     */
    virtual void processBlock(ProcessContext& context) = 0;

    /** @brief Frees what prepareToPlay() allocated; main thread. */
    virtual void releaseResources() {}

    /**
     * @brief Appends plugin-specific data (beyond parameters) to the state.
     *
     * The bytes are opaque to the framework. Include your own version marker if the
     * layout of this data may change between plugin versions.
     */
    virtual void saveCustomState([[maybe_unused]] std::vector<std::uint8_t>& out) const {}

    /**
     * @brief Restores data written by saveCustomState(); empty if there was none,
     * including for states saved by a plugin version without custom data.
     */
    virtual void loadCustomState([[maybe_unused]] std::span<const std::uint8_t> data) {}

    /**
     * @brief Adds the standard bypass switch (id "bypass").
     *
     * When it is on, process() passes input to output and processBlock() is not called.
     * Call from the constructor.
     */
    AudioProcessorParameter& addBypassParameter() {
        return parameters_.addBool("bypass", "Bypass", false, {.isBypass = true});
    }

    /** Parameters of the plugin; add them in the constructor, never after prepare(). */
    ParameterLayout parameters_;

private:
    static void passThrough(ProcessContext& context) noexcept {
        const AudioBuffer& in = context.input;
        AudioBuffer& out = context.output;
        for (int ch = 0; ch < out.numChannels(); ++ch) {
            float* dst = out.channel(ch);
            if (ch < in.numChannels()) {
                const float* src = in.channel(ch);
                if (src != dst) {
                    for (int i = 0; i < out.numSamples(); ++i) {
                        dst[i] = src[i];
                    }
                }
            } else {
                for (int i = 0; i < out.numSamples(); ++i) {
                    dst[i] = 0.0f;
                }
            }
        }
    }

    ProcessSetup setup_;
    AudioProcessorParameter* bypass_ = nullptr;
    bool prepared_ = false;
};

} // namespace aether
