// GENERATED CODE - DO NOT MODIFY COMMENTS
#include "GainPlugin.h"

void GainPluginUI::setupUI(aether::PluginProcessor& processor) {
    // Setup knob1779727804935
    knob1779727804935.setBounds(100, 80, 140, 70);
    if (auto* param = processor.getParameter("knob-1779727804935")) {
        knob1779727804935.setParameter(param);
    }
    knob1779727804935.onValueChanged = this { onKnob1779727804935ValueChanged(val); };

    // Setup slider1779887593361
    slider1779887593361.setBounds(240, 30, 110, 80);
    if (auto* param = processor.getParameter("slider-1779887593361")) {
        slider1779887593361.setParameter(param);
    }
    slider1779887593361.onValueChanged = this { onSlider1779887593361ValueChanged(val); };

    // Setup button1779887600111
    button1779887600111.setBounds(180, 280, 130, 50);
    if (auto* param = processor.getParameter("button-1779887600111")) {
        button1779887600111.setParameter(param);
    }
    button1779887600111.onValueChanged = this { onButton1779887600111ValueChanged(val); };

    // --- USER CODE BEGIN: SetupUI ---

    // --- USER CODE END: SetupUI ---
}

void GainPluginUI::onKnob1779727804935ValueChanged(float newValue) {
    // --- USER CODE BEGIN: onKnob1779727804935ValueChanged ---

    // --- USER CODE END: onKnob1779727804935ValueChanged ---
}

void GainPluginUI::onSlider1779887593361ValueChanged(float newValue) {
    // --- USER CODE BEGIN: onSlider1779887593361ValueChanged ---
    
    // --- USER CODE END: onSlider1779887593361ValueChanged ---
}

void GainPluginUI::onButton1779887600111ValueChanged(float newValue) {
    // --- USER CODE BEGIN: onButton1779887600111ValueChanged ---
    
    // --- USER CODE END: onButton1779887600111ValueChanged ---
}

// --- USER CODE BEGIN: CustomMethods ---

// --- USER CODE END: CustomMethods ---
