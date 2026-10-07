#pragma once

#include "aether/AudioProcessor.h"
#include "aether/Parameter.h"

#include <string_view>

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

protected:
    ParameterLayout parameters_;
};

} // namespace aether
