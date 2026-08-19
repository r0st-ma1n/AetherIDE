// GENERATED CODE - DO NOT MODIFY COMMENTS
#include "GainPlugin.h"

void GainPluginUI::setupUI(aether::PluginProcessor& processor) {
    // --- AETHER UI BEGIN ---
    // AETHER id=knob-1779727804935 type=Knob x=40 y=120 w=140 h=70
    knob1779727804935.setBounds(40, 120, 140, 70);
    if (auto* param = processor.getParameter("knob-1779727804935")) {
        knob1779727804935.setParameter(param);
    }
    knob1779727804935.onValueChanged = [this](float val) {
        onKnob1779727804935ValueChanged(val);
    };

    // AETHER id=slider-1779887593361 type=Slider x=330 y=60 w=110 h=80
    slider1779887593361.setBounds(330, 60, 110, 80);
    if (auto* param = processor.getParameter("slider-1779887593361")) {
        slider1779887593361.setParameter(param);
    }
    slider1779887593361.onValueChanged = [this](float val) {
        onSlider1779887593361ValueChanged(val);
    };

    // AETHER id=button-1779887600111 type=Button x=230 y=220 w=130 h=50
    button1779887600111.setBounds(230, 220, 130, 50);
    if (auto* param = processor.getParameter("button-1779887600111")) {
        button1779887600111.setParameter(param);
    }
    button1779887600111.onValueChanged = [this](float val) {
        onButton1779887600111ValueChanged(val);
    };
    // --- AETHER UI END ---

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