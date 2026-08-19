#pragma once

#include "aether/AudioProcessor.h"
#include "aether/Button.h"
#include "aether/Knob.h"
#include "aether/Parameter.h"
#include "aether/Slider.h"

#include <string>

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
    Parameter* getParameter(const std::string& id) {
        return parameters_.findFloat(id);
    }

    const Parameter* getParameter(const std::string& id) const {
        return parameters_.findFloat(id);
    }

protected:
    ParameterLayout parameters_;
};

} // namespace aether
