// GENERATED CODE - DO NOT MODIFY COMMENTS
#pragma once

#include "apf/PluginProcessor.h"
#include "apf/Parameter.h"

// --- USER CODE BEGIN: Includes ---

// --- USER CODE END: Includes ---

class GainPluginUI {
public:
    void setupUI(apf::PluginProcessor& processor);

    // --- USER CODE BEGIN: PublicMethods ---

    // --- USER CODE END: PublicMethods ---

private:
    apf::Knob knob1779727804935;
    apf::Slider slider1779887593361;
    apf::Button button1779887600111;

    // Event Handlers
    void onKnob1779727804935ValueChanged(float newValue);
    void onSlider1779887593361ValueChanged(float newValue);
    void onButton1779887600111ValueChanged(float newValue);

    // --- USER CODE BEGIN: PrivateMembers ---

    // --- USER CODE END: PrivateMembers ---
};
