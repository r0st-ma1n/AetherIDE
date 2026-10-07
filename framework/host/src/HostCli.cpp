#include "aether/host/HostCli.h"

#include "aether/host/OfflineRenderer.h"
#include "aether/host/PluginLibrary.h"
#include "aether/host/WavFile.h"

#include <charconv>
#include <cmath>
#include <exception>
#include <optional>
#include <string_view>
#include <utility>

namespace aether::host {

namespace {

constexpr const char* kUsage =
    "usage: aether_host --plugin <module> --out <file.wav> [--in <file.wav> | --sine <hz>]\n"
    "                   [--amplitude <a>] [--duration <s>] [--sample-rate <hz>] [--channels <n>]\n"
    "                   [--block-size <n>] [--param <id>=<value>]... [--list-params]\n";

struct Options {
    std::string plugin;
    std::string in;
    std::string out;
    double sineHz = 440.0;
    double amplitude = 0.5;
    double duration = 1.0;
    double sampleRate = 48000.0;
    int channels = 2;
    int blockSize = 512;
    bool listParams = false;
    std::vector<std::pair<std::string, double>> params;
};

std::optional<double> parseNumber(std::string_view text) {
    double value = 0.0;
    const char* end = text.data() + text.size();
    const auto [ptr, ec] = std::from_chars(text.data(), end, value);
    if (ec != std::errc() || ptr != end || text.empty() || !std::isfinite(value)) {
        return std::nullopt;
    }
    return value;
}

/** @return Error message, or empty on success. */
std::string parse(const std::vector<std::string>& args, Options& options) {
    for (std::size_t i = 0; i < args.size(); ++i) {
        const std::string& arg = args[i];
        if (arg == "--list-params") {
            options.listParams = true;
            continue;
        }
        if (i + 1 >= args.size()) {
            return "missing value for " + arg;
        }
        const std::string& value = args[++i];

        if (arg == "--plugin") {
            options.plugin = value;
        } else if (arg == "--in") {
            options.in = value;
        } else if (arg == "--out") {
            options.out = value;
        } else if (arg == "--param") {
            const auto eq = value.find('=');
            const auto number =
                eq == std::string::npos ? std::nullopt : parseNumber(value.substr(eq + 1));
            if (!number) {
                return "--param expects <id>=<number>, got " + value;
            }
            options.params.emplace_back(value.substr(0, eq), *number);
        } else {
            const auto number = parseNumber(value);
            if (!number) {
                return arg + " expects a number, got " + value;
            }
            if (arg == "--sine") {
                options.sineHz = *number;
            } else if (arg == "--amplitude") {
                options.amplitude = *number;
            } else if (arg == "--duration") {
                options.duration = *number;
            } else if (arg == "--sample-rate") {
                options.sampleRate = *number;
            } else if (arg == "--channels") {
                options.channels = static_cast<int>(*number);
            } else if (arg == "--block-size") {
                options.blockSize = static_cast<int>(*number);
            } else {
                return "unknown option " + arg;
            }
        }
    }

    if (options.plugin.empty()) {
        return "--plugin is required";
    }
    if (!options.listParams && options.out.empty()) {
        return "--out is required";
    }
    if (options.channels < 1 || options.blockSize < 1 || !(options.sampleRate > 0.0) ||
        options.duration < 0.0) {
        return "--channels, --block-size, --sample-rate and --duration must be positive";
    }
    return {};
}

void listParameters(const PluginProcessor& plugin, std::ostream& out) {
    const ParameterLayout& params = plugin.parameters();
    for (std::size_t i = 0; i < params.size(); ++i) {
        const auto& p = params[i];
        out << "  " << p.id() << "  \"" << p.name() << "\"  " << p.valueToText(p.min()) << " .. "
            << p.valueToText(p.max()) << "  default " << p.valueToText(p.defaultValue());
        if (!p.unit().empty()) {
            out << " " << p.unit();
        }
        out << "\n";
    }
}

} // namespace

int runHost(const std::vector<std::string>& args, std::ostream& out, std::ostream& err) {
    Options options;
    if (const std::string error = parse(args, options); !error.empty()) {
        err << "aether_host: " << error << "\n" << kUsage;
        return 1;
    }

    try {
        PluginLibrary library(options.plugin);
        const PluginInfo info = library.factory().info();
        validatePluginInfo(info);
        out << info.name << " " << info.version.toString() << " by " << info.vendor << " ("
            << info.id << ")\n";

        auto plugin = library.factory().create();
        if (options.listParams) {
            listParameters(*plugin, out);
            return 0;
        }

        for (const auto& [id, value] : options.params) {
            AudioProcessorParameter* param = plugin->getParameter(id);
            if (param == nullptr) {
                err << "aether_host: unknown parameter " << id << "\n";
                return 1;
            }
            param->setValue(static_cast<float>(value));
        }

        const AudioClip input =
            options.in.empty()
                ? AudioClip::sine(options.sineHz, static_cast<float>(options.amplitude),
                                  options.duration, options.sampleRate, options.channels)
                : readWav(options.in);

        const AudioClip output = render(*plugin, input, {.blockSize = options.blockSize});
        writeWav(options.out, output);

        out << "Rendered " << output.numFrames() << " frames x " << output.numChannels()
            << " channels at " << output.sampleRate << " Hz, peak in " << input.peak()
            << ", peak out " << output.peak() << " -> " << options.out << "\n";
        return 0;
    } catch (const std::exception& e) {
        err << "aether_host: " << e.what() << "\n";
        return 2;
    }
}

} // namespace aether::host
