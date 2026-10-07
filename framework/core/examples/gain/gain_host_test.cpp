// Loads the real GainPlugin module (path passed by CTest) the way aether_host does and
// checks what it does to audio.

#include "support/Check.h"

#include "aether/host/HostCli.h"
#include "aether/host/OfflineRenderer.h"
#include "aether/host/PluginLibrary.h"
#include "aether/host/WavFile.h"

#include <cmath>
#include <cstdlib>
#include <filesystem>
#include <iostream>
#include <sstream>
#include <string>

using aether::host::AudioClip;
using aether::test::expectNear;
using aether::test::expectTrue;

namespace {

constexpr double kSampleRate = 48000.0;

void infoComesFromTheModule(const aether::host::PluginLibrary& library) {
    const aether::PluginInfo info = library.factory().info();
    expectTrue(info.name == "Gain" && info.id == "dev.aether.examples.gain", "plugin info");
}

void halfGainHalvesTheAmplitude(const aether::host::PluginLibrary& library) {
    auto plugin = library.factory().create();
    plugin->getParameter("gain")->setValue(0.5f);

    const AudioClip input = AudioClip::sine(1000.0, 1.0f, 0.1, kSampleRate, 2);
    const AudioClip output = aether::host::render(*plugin, input, {.blockSize = 256});

    expectNear(input.peak(), 1.0f, 1e-4f, "input sine has amplitude 1");
    expectNear(output.peak(), 0.5f, 1e-4f, "gain 0.5 gives amplitude 0.5");

    float maxError = 0.0f;
    for (int ch = 0; ch < 2; ++ch) {
        for (int i = 0; i < input.numFrames(); ++i) {
            maxError = std::fmax(maxError,
                                 std::fabs(output.channels[ch][i] - 0.5f * input.channels[ch][i]));
        }
    }
    expectNear(maxError, 0.0f, 1e-6f, "every sample is scaled by 0.5");
}

void gainChangeHasNoClick(const aether::host::PluginLibrary& library) {
    auto plugin = library.factory().create();
    constexpr int kChangeFrame = 4800;
    constexpr int kRampFrames = 960; // 20 ms at 48 kHz

    // Constant input makes the output equal to the gain curve.
    const AudioClip input = AudioClip::constant(1.0f, 1, 9600, kSampleRate);
    const AudioClip output = aether::host::render(
        *plugin, input,
        {.blockSize = 480, .beforeBlock = [](aether::PluginProcessor& p, int frame) {
             if (frame == kChangeFrame) {
                 p.getParameter("gain")->setValue(0.0f);
             }
         }});

    const auto& samples = output.channels[0];
    float largestJump = 0.0f;
    bool monotonic = true;
    for (int i = 1; i < output.numFrames(); ++i) {
        largestJump = std::fmax(largestJump, std::fabs(samples[i] - samples[i - 1]));
        monotonic = monotonic && samples[i] <= samples[i - 1];
    }

    expectNear(samples[kChangeFrame - 1], 1.0f, 0.0f, "full gain before the change");
    expectTrue(samples[kChangeFrame] > 0.99f, "no jump at the change");
    expectTrue(monotonic, "gain only goes down");
    expectTrue(largestJump < 0.01f, "no sample-to-sample jump (click)");
    expectNear(samples[kChangeFrame + kRampFrames - 1], 0.0f, 0.0f, "silent after 20 ms");
}

void commandLineRendersAWavFile(const std::string& modulePath) {
    const auto outPath = std::filesystem::temp_directory_path() / "aether_gain_host_test.wav";
    std::ostringstream out;
    std::ostringstream err;
    const int code = aether::host::runHost({"--plugin", modulePath, "--sine", "1000", "--amplitude",
                                            "1", "--duration", "0.1", "--param", "gain=0.5",
                                            "--out", outPath.string()},
                                           out, err);
    expectTrue(code == 0, "aether_host succeeds");
    if (code == 0) {
        const AudioClip written = aether::host::readWav(outPath);
        expectTrue(written.numChannels() == 2 && written.numFrames() == 4800, "WAV shape");
        expectNear(written.peak(), 0.5f, 1e-4f, "WAV has the processed amplitude");
    }
    std::filesystem::remove(outPath);

    std::ostringstream listOut;
    expectTrue(aether::host::runHost({"--plugin", modulePath, "--list-params"}, listOut, err) == 0,
               "--list-params succeeds");
    expectTrue(listOut.str().find("gain") != std::string::npos &&
                   listOut.str().find("bypass") != std::string::npos,
               "--list-params prints the parameters");

    expectTrue(aether::host::runHost(
                   {"--plugin", modulePath, "--param", "volume=1", "--out", outPath.string()}, out,
                   err) == 1,
               "unknown parameter is a usage error");
    expectTrue(aether::host::runHost(
                   {"--plugin", "no_such_plugin_module", "--out", outPath.string()}, out, err) == 2,
               "missing module is a load error");
    expectTrue(aether::host::runHost({"--out", outPath.string()}, out, err) == 1,
               "missing --plugin is a usage error");
}

} // namespace

int main(int argc, char** argv) {
    if (argc != 2) {
        std::cerr << "usage: gain_host_test <path to gain_plugin module>\n";
        return EXIT_FAILURE;
    }
    const std::string modulePath = argv[1];
    {
        const aether::host::PluginLibrary library(modulePath);
        infoComesFromTheModule(library);
        halfGainHalvesTheAmplitude(library);
        gainChangeHasNoClick(library);
    }
    commandLineRendersAWavFile(modulePath);
    return aether::test::finish("gain_host_test");
}
