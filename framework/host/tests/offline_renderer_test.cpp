#include "support/Check.h"

#include "aether/host/OfflineRenderer.h"

#include <stdexcept>
#include <vector>

using aether::host::AudioClip;
using aether::test::expectNear;
using aether::test::expectTrue;

namespace {

/** Adds 1 to every sample and records how the host drove it. */
class RecordingPlugin : public aether::PluginProcessor {
public:
    std::vector<int> blockSizes;
    double preparedSampleRate = 0.0;
    int preparedMaxBlock = 0;
    int releases = 0;
    bool inputAliasesOutput = false;

    bool isBusLayoutSupported(const aether::BusLayout& layout) const override {
        return layout == aether::BusLayout::mono() || layout == aether::BusLayout::stereo();
    }

protected:
    void prepareToPlay(const aether::ProcessSetup& setup) override {
        preparedSampleRate = setup.sampleRate;
        preparedMaxBlock = setup.maxBlockSize;
    }

    void processBlock(aether::ProcessContext& context) override {
        blockSizes.push_back(context.output.numSamples());
        inputAliasesOutput =
            inputAliasesOutput || context.input.channel(0) == context.output.channel(0);
        for (int ch = 0; ch < context.output.numChannels(); ++ch) {
            for (int i = 0; i < context.output.numSamples(); ++i) {
                context.output.channel(ch)[i] = context.input.channel(ch)[i] + 1.0f;
            }
        }
    }

    void releaseResources() override {
        ++releases;
    }
};

void rendersInBlocksWithShortLastBlock() {
    RecordingPlugin plugin;
    const AudioClip input = AudioClip::constant(0.25f, 2, 1000, 44100.0);
    std::vector<int> blockStarts;

    const AudioClip output = aether::host::render(
        plugin, input, {.blockSize = 256, .beforeBlock = [&](aether::PluginProcessor&, int frame) {
                            blockStarts.push_back(frame);
                        }});

    expectTrue(plugin.blockSizes == std::vector<int>{256, 256, 256, 232}, "block sizes");
    expectTrue(blockStarts == std::vector<int>{0, 256, 512, 768}, "beforeBlock frames");
    expectTrue(plugin.preparedMaxBlock == 256, "maxBlockSize = block size");
    expectNear(static_cast<float>(plugin.preparedSampleRate), 44100.0f, 0.0f, "sample rate");
    expectTrue(plugin.releases == 1 && !plugin.isPrepared(), "released after rendering");
    expectTrue(!plugin.inputAliasesOutput, "separate input and output buffers");

    expectTrue(output.numChannels() == 2 && output.numFrames() == 1000, "output shape");
    expectNear(output.channels[1][999], 1.25f, 0.0f, "last sample processed");
    expectNear(input.channels[0][0], 0.25f, 0.0f, "input clip untouched");
}

void parameterChangesApplyFromTheirBlock() {
    class OffsetPlugin : public aether::PluginProcessor {
    public:
        OffsetPlugin() {
            offset_ = &parameters_.addFloat("offset", "Offset", 0.0f, 10.0f, 0.0f);
        }

    protected:
        void processBlock(aether::ProcessContext& context) override {
            for (int i = 0; i < context.output.numSamples(); ++i) {
                context.output.channel(0)[i] = offset_->value();
            }
        }

    private:
        aether::AudioProcessorParameter* offset_;
    };

    OffsetPlugin plugin;
    const AudioClip output = aether::host::render(
        plugin, AudioClip::silence(1, 100, 48000.0),
        {.blockSize = 10, .beforeBlock = [](aether::PluginProcessor& p, int frame) {
             if (frame == 50) {
                 p.getParameter("offset")->setValue(3.0f);
             }
         }});
    expectNear(output.channels[0][49], 0.0f, 0.0f, "before the change");
    expectNear(output.channels[0][50], 3.0f, 0.0f, "from the block of the change");
}

void emptyInputStillPreparesAndReleases() {
    RecordingPlugin plugin;
    const AudioClip output = aether::host::render(plugin, AudioClip::silence(1, 0, 48000.0));
    expectTrue(output.numFrames() == 0 && plugin.blockSizes.empty(), "no blocks for no frames");
    expectTrue(plugin.releases == 1, "released");
}

void rejectsUnsupportedSetups() {
    RecordingPlugin plugin;
    bool threw = false;
    try {
        aether::host::render(plugin, AudioClip::silence(3, 10, 48000.0));
    } catch (const std::invalid_argument&) {
        threw = true;
    }
    expectTrue(threw, "three channels are rejected");

    threw = false;
    try {
        aether::host::render(plugin, AudioClip::silence(1, 10, 48000.0), {.blockSize = 0});
    } catch (const std::invalid_argument&) {
        threw = true;
    }
    expectTrue(threw, "zero block size is rejected");
    expectTrue(!plugin.isPrepared(), "rejected setups do not prepare the plugin");
}

} // namespace

int main() {
    rendersInBlocksWithShortLastBlock();
    parameterChangesApplyFromTheirBlock();
    emptyInputStillPreparesAndReleases();
    rejectsUnsupportedSetups();
    return aether::test::finish("offline_renderer_test");
}
