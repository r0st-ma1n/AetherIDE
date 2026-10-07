// Plays the role of a format adapter: knows only the framework headers and reaches the
// plugin through aether::pluginFactory(), never through its class.

#include "support/AllocationCounter.h"
#include "support/Check.h"

#include "aether/OwningAudioBuffer.h"
#include "aether/PluginFactory.h"

#include <stdexcept>

using aether::test::expectNear;
using aether::test::expectTrue;

namespace {

constexpr int kBlockSize = 16;

void fill(aether::OwningAudioBuffer& buffer, float value) {
    for (int ch = 0; ch < buffer.numChannels(); ++ch) {
        for (int i = 0; i < buffer.numSamples(); ++i) {
            buffer.channel(ch)[i] = value;
        }
    }
}

void infoIsAvailableWithoutAnInstance() {
    const aether::PluginInfo info = aether::pluginFactory().info();
    expectTrue(info.name == "Contract Test", "name");
    expectTrue(info.vendor == "Aether Tests", "vendor");
    expectTrue(info.id == "dev.aether.tests.contract", "id");
    expectTrue(info.version.toString() == "2.1.3", "version string");
    expectTrue(info.category == aether::PluginCategory::Effect, "category");

    bool valid = true;
    try {
        aether::validatePluginInfo(info);
    } catch (const std::invalid_argument&) {
        valid = false;
    }
    expectTrue(valid, "registered info is valid");
}

void invalidInfoIsRejected() {
    const auto rejects = [](aether::PluginInfo info) {
        try {
            aether::validatePluginInfo(info);
        } catch (const std::invalid_argument&) {
            return true;
        }
        return false;
    };
    const aether::PluginInfo good{.name = "N", .vendor = "V", .id = "a.b"};
    expectTrue(rejects({.name = "", .vendor = "V", .id = "a.b"}), "empty name rejected");
    expectTrue(rejects({.name = "N", .vendor = "", .id = "a.b"}), "empty vendor rejected");
    expectTrue(rejects({.name = "N", .vendor = "V", .id = ""}), "empty id rejected");
    expectTrue(rejects({.name = "N", .vendor = "V", .id = "my plugin"}), "space in id rejected");
    expectTrue(!rejects(good), "minimal info accepted");
}

void capabilitiesAreVisibleThroughTheBase() {
    auto plugin = aether::pluginFactory().create();
    expectTrue(plugin != nullptr, "factory creates an instance");
    expectTrue(!plugin->isPrepared(), "new instance is not prepared");
    expectTrue(plugin->isBusLayoutSupported(aether::BusLayout::stereo()), "stereo supported");
    expectTrue(!plugin->isBusLayoutSupported(aether::BusLayout::mono()), "mono rejected");
    expectTrue(!plugin->isBusLayoutSupported({.inputChannels = 2, .outputChannels = 1}),
               "mismatched layout rejected");
    expectTrue(plugin->getLatencySamples() == 32, "latency");
    expectNear(static_cast<float>(plugin->getTailSeconds()), 0.5f, 0.0f, "tail");
    expectTrue(plugin->parameters().find("offset") != nullptr, "parameters are reachable");
    expectTrue(plugin->parameters().bypass() != nullptr, "bypass parameter registered");
}

void lifecycleThroughTheBase() {
    auto plugin = aether::pluginFactory().create();
    plugin->getParameter("offset")->setValue(0.25f);
    plugin->prepare({.sampleRate = 96000.0, .maxBlockSize = kBlockSize});
    expectTrue(plugin->isPrepared(), "prepared");
    expectNear(static_cast<float>(plugin->processSetup().sampleRate), 96000.0f, 0.0f,
               "setup stored");

    aether::OwningAudioBuffer inStorage(2, kBlockSize);
    aether::OwningAudioBuffer outStorage(2, kBlockSize);
    fill(inStorage, 1.0f);
    const aether::AudioBuffer input = inStorage.view();
    aether::AudioBuffer output = outStorage.view();
    aether::ProcessContext context{.input = input, .output = output};

    aether::test::AllocationCounter counter;
    plugin->process(context);
    expectTrue(counter.count() == 0, "process does not allocate");
    expectNear(outStorage.channel(0)[0], 1.25f, 0.0f, "processBlock ran");
    expectNear(outStorage.channel(1)[kBlockSize - 1], 96000.0f, 0.0f, "prepareToPlay ran");

    plugin->getParameter("bypass")->setValue(1.0f);
    plugin->process(context);
    expectNear(outStorage.channel(0)[0], 1.0f, 0.0f, "bypass passes input through");
    expectNear(outStorage.channel(1)[kBlockSize - 1], 1.0f, 0.0f, "bypass skips processBlock");

    plugin->prepare({.sampleRate = 44100.0, .maxBlockSize = kBlockSize});
    expectNear(static_cast<float>(plugin->processSetup().sampleRate), 44100.0f, 0.0f,
               "re-prepare applies the new setup");

    plugin->release();
    expectTrue(!plugin->isPrepared(), "released");
    plugin->release(); // second release is a no-op
}

void emptyBlockIsAllowed() {
    auto plugin = aether::pluginFactory().create();
    plugin->prepare({.sampleRate = 48000.0, .maxBlockSize = kBlockSize});
    aether::OwningAudioBuffer storage(2, 0);
    aether::AudioBuffer audio = storage.view();
    aether::ProcessContext context{.input = audio, .output = audio};
    plugin->process(context);
    expectTrue(true, "zero-sample block does not crash");
}

void stateThroughTheBase() {
    auto first = aether::pluginFactory().create();
    first->getParameter("offset")->setValue(-0.5f);
    const aether::PluginState state = first->getState();

    auto second = aether::pluginFactory().create();
    expectTrue(second->setState(state), "state accepted by a fresh instance");
    expectNear(second->getParameter("offset")->value(), -0.5f, 0.0f, "state restored");
}

} // namespace

int main() {
    infoIsAvailableWithoutAnInstance();
    invalidInfoIsRejected();
    capabilitiesAreVisibleThroughTheBase();
    lifecycleThroughTheBase();
    emptyBlockIsAllowed();
    stateThroughTheBase();
    return aether::test::finish("plugin_contract_test");
}
