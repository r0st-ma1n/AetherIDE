// A plugin registered with AETHER_PLUGIN. plugin_contract_test.cpp never includes this
// file or names the class: it reaches the plugin only through aether::pluginFactory().

#include "aether/PluginFactory.h"

namespace {

class ContractTestPlugin final : public aether::PluginProcessor {
public:
    static aether::PluginInfo pluginInfo() {
        return {
            .name = "Contract Test",
            .vendor = "Aether Tests",
            .id = "dev.aether.tests.contract",
            .version = {2, 1, 3},
            .url = "https://example.org",
            .email = "tests@example.org",
        };
    }

    ContractTestPlugin() {
        offset_ = &parameters_.addFloat("offset", "Offset", -1.0f, 1.0f, 0.0f);
        addBypassParameter();
    }

    bool isBusLayoutSupported(const aether::BusLayout& layout) const override {
        return layout == aether::BusLayout::stereo();
    }

    int getLatencySamples() const override {
        return 32;
    }

    double getTailSeconds() const override {
        return 0.5;
    }

protected:
    void prepareToPlay(const aether::ProcessSetup& setup) override {
        preparedSampleRate_ = setup.sampleRate;
    }

    void processBlock(aether::ProcessContext& context) override {
        // Writes input + offset, and the sample rate into the last sample of channel 1, so the
        // test can see that prepare() reached the plugin.
        const float offset = offset_->value();
        for (int ch = 0; ch < context.output.numChannels(); ++ch) {
            for (int i = 0; i < context.output.numSamples(); ++i) {
                context.output.channel(ch)[i] = context.input.channel(ch)[i] + offset;
            }
        }
        const int last = context.output.numSamples() - 1;
        if (last >= 0) {
            context.output.channel(1)[last] = static_cast<float>(preparedSampleRate_);
        }
    }

private:
    aether::AudioProcessorParameter* offset_;
    double preparedSampleRate_ = 0.0;
};

} // namespace

AETHER_PLUGIN(ContractTestPlugin)
