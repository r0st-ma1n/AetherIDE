// GENERATED CODE - DO NOT MODIFY COMMENTS
// Regenerated from GainPlugin.aether on save; edit only inside USER CODE regions.
#pragma once

#include "aether/PluginFactory.h"

// --- USER CODE BEGIN: Includes ---
#include "aether/SmoothedValue.h"
// --- USER CODE END: Includes ---

class GainPluginProcessor final : public aether::PluginProcessor {
public:
    static aether::PluginInfo pluginInfo();

    GainPluginProcessor();

    // --- USER CODE BEGIN: PublicMethods ---

    // --- USER CODE END: PublicMethods ---

protected:
    void prepareToPlay(const aether::ProcessSetup& setup) override;
    void processBlock(aether::ProcessContext& context) override;
    void releaseResources() override;

private:
    aether::AudioProcessorParameter* gainParameter_ = nullptr;

    // --- USER CODE BEGIN: PrivateMembers ---
    // Ramps gain changes to avoid clicks.
    aether::SmoothedValue gain_;
    // --- USER CODE END: PrivateMembers ---
};
