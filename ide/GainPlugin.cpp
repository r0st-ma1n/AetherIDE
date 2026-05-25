// GENERATED CODE - DO NOT MODIFY COMMENTS
#include "GainPlugin.h"

void GainPluginUI::setupUI(apf::PluginProcessor& processor) {
    // Setup knob1779727804935
    knob1779727804935.setBounds(306, 125, 100, 40);
    if (auto* param = processor.getParameter("knob-1779727804935")) {
        knob1779727804935.setParameter(param);
    }
    knob1779727804935.onValueChanged = this { onKnob1779727804935ValueChanged(val); };

    // --- USER CODE BEGIN: SetupUI ---
    
    // --- USER CODE END: SetupUI ---
}

void GainPluginUI::onKnob1779727804935ValueChanged(float newValue) {
    // --- USER CODE BEGIN: onKnob1779727804935ValueChanged ---
    
    // --- USER CODE END: onKnob1779727804935ValueChanged ---
}

// --- USER CODE BEGIN: CustomMethods ---

// --- USER CODE END: CustomMethods ---
