#pragma once

#include "aether/AudioProcessor.h"
#include "aether/Parameter.h"
#include "aether/PluginState.h"

#include <cstdint>
#include <span>
#include <string_view>
#include <vector>

namespace aether {

/**
 * IDE-facing processor base.
 *
 * Owns a ParameterLayout and exposes getParameter() for generated UI code.
 * DSP methods remain pure virtual — plugin authors implement processBlock.
 */
class PluginProcessor : public AudioProcessor {
public:
    ~PluginProcessor() override = default;

    ParameterLayout& parameters() {
        return parameters_;
    }

    const ParameterLayout& parameters() const {
        return parameters_;
    }

    /**
     * @return Parameter pointer, or nullptr if id is unknown.
     */
    Parameter* getParameter(std::string_view id) noexcept {
        return parameters_.find(id);
    }

    const Parameter* getParameter(std::string_view id) const noexcept {
        return parameters_.find(id);
    }

    /**
     * @brief Serialises the plugin for the DAW project or a preset; see PluginState.
     *
     * Called by format adapters from the host's main thread, never from processBlock().
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
     * loadCustomState() is called only if the state is valid.
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

    ParameterLayout parameters_;
};

} // namespace aether
