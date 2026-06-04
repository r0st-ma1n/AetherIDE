// GENERATED CODE - DO NOT MODIFY COMMENTS
#pragma once

#include "aether/PluginProcessor.h"
#include "aether/Parameter.h"

// --- USER CODE BEGIN: Includes ---

// --- USER CODE END: Includes ---

class GainPluginUI {
public:
    void setupUI(aether::PluginProcessor& processor);

    // --- USER CODE BEGIN: PublicMethods ---

    // --- USER CODE END: PublicMethods ---

private:
    aether::Knob knob1779727804935;
    aether::Slider slider1779887593361;
    aether::Button button1779887600111;

    // Event Handlers
    void onKnob1779727804935ValueChanged(float newValue);
    void onSlider1779887593361ValueChanged(float newValue);
    void onButton1779887600111ValueChanged(float newValue);

    // --- USER CODE BEGIN: PrivateMembers ---

    // --- USER CODE END: PrivateMembers ---
};
