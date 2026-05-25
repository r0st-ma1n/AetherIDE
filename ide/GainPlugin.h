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

    // Event Handlers
    void onKnob1779727804935ValueChanged(float newValue);

    // --- USER CODE BEGIN: PrivateMembers ---
    
    // --- USER CODE END: PrivateMembers ---
};
