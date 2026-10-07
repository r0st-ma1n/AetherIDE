#include "aether/host/WavFile.h"

#include <bit>
#include <cstdint>
#include <cstring>
#include <fstream>
#include <iterator>
#include <stdexcept>
#include <string>
#include <vector>

namespace aether::host {

namespace {

constexpr std::uint16_t kFormatPcm = 1;
constexpr std::uint16_t kFormatFloat = 3;
constexpr std::uint16_t kFormatExtensible = 0xFFFE;

std::runtime_error wavError(const std::filesystem::path& path, const std::string& message) {
    return std::runtime_error("WAV " + path.string() + ": " + message);
}

std::uint32_t readLe(const std::uint8_t* data, int bytes) {
    std::uint32_t value = 0;
    for (int i = 0; i < bytes; ++i) {
        value |= static_cast<std::uint32_t>(data[i]) << (8 * i);
    }
    return value;
}

void appendLe(std::vector<std::uint8_t>& out, std::uint32_t value, int bytes) {
    for (int i = 0; i < bytes; ++i) {
        out.push_back(static_cast<std::uint8_t>(value >> (8 * i)));
    }
}

void appendTag(std::vector<std::uint8_t>& out, const char* tag) {
    out.insert(out.end(), tag, tag + 4);
}

float decodeSample(const std::uint8_t* data, std::uint16_t format, int bytesPerSample) {
    if (format == kFormatFloat) {
        return std::bit_cast<float>(readLe(data, 4));
    }
    switch (bytesPerSample) {
    case 2:
        return static_cast<float>(static_cast<std::int16_t>(readLe(data, 2))) / 32768.0f;
    case 3: {
        // Sign-extend 24 bits.
        auto value = static_cast<std::int32_t>(readLe(data, 3) << 8) >> 8;
        return static_cast<float>(value) / 8388608.0f;
    }
    default:
        return static_cast<float>(static_cast<std::int32_t>(readLe(data, 4)) / 2147483648.0);
    }
}

} // namespace

AudioClip readWav(const std::filesystem::path& path) {
    std::ifstream file(path, std::ios::binary);
    if (!file) {
        throw wavError(path, "cannot open file");
    }
    const std::vector<std::uint8_t> bytes((std::istreambuf_iterator<char>(file)),
                                          std::istreambuf_iterator<char>());

    if (bytes.size() < 12 || std::memcmp(bytes.data(), "RIFF", 4) != 0 ||
        std::memcmp(bytes.data() + 8, "WAVE", 4) != 0) {
        throw wavError(path, "not a RIFF/WAVE file");
    }

    std::uint16_t format = 0;
    int numChannels = 0;
    double sampleRate = 0.0;
    int bitsPerSample = 0;
    const std::uint8_t* data = nullptr;
    std::size_t dataSize = 0;

    std::size_t pos = 12;
    while (pos + 8 <= bytes.size()) {
        const std::uint8_t* chunk = bytes.data() + pos;
        const std::size_t size = readLe(chunk + 4, 4);
        const std::size_t available = bytes.size() - pos - 8;
        const std::size_t bodySize = size < available ? size : available;

        if (std::memcmp(chunk, "fmt ", 4) == 0) {
            if (bodySize < 16) {
                throw wavError(path, "fmt chunk is too short");
            }
            format = static_cast<std::uint16_t>(readLe(chunk + 8, 2));
            numChannels = static_cast<int>(readLe(chunk + 10, 2));
            sampleRate = readLe(chunk + 12, 4);
            bitsPerSample = static_cast<int>(readLe(chunk + 22, 2));
            if (format == kFormatExtensible && bodySize >= 26) {
                format = static_cast<std::uint16_t>(readLe(chunk + 32, 2));
            }
        } else if (std::memcmp(chunk, "data", 4) == 0) {
            data = chunk + 8;
            dataSize = bodySize;
        }
        pos += 8 + size + (size & 1); // chunks are padded to even sizes
    }

    if (numChannels == 0 || data == nullptr) {
        throw wavError(path, "missing fmt or data chunk");
    }
    const bool supported = (format == kFormatPcm &&
                            (bitsPerSample == 16 || bitsPerSample == 24 || bitsPerSample == 32)) ||
                           (format == kFormatFloat && bitsPerSample == 32);
    if (!supported || !(sampleRate > 0.0)) {
        throw wavError(path, "unsupported format " + std::to_string(format) + " with " +
                                 std::to_string(bitsPerSample) + " bits");
    }

    const int bytesPerSample = bitsPerSample / 8;
    const std::size_t frameSize = static_cast<std::size_t>(bytesPerSample) * numChannels;
    const int numFrames = static_cast<int>(dataSize / frameSize);

    AudioClip clip = AudioClip::silence(numChannels, numFrames, sampleRate);
    for (int frame = 0; frame < numFrames; ++frame) {
        const std::uint8_t* frameData = data + frame * frameSize;
        for (int ch = 0; ch < numChannels; ++ch) {
            clip.channels[ch][frame] =
                decodeSample(frameData + ch * bytesPerSample, format, bytesPerSample);
        }
    }
    return clip;
}

void writeWav(const std::filesystem::path& path, const AudioClip& clip) {
    const auto numChannels = static_cast<std::uint32_t>(clip.numChannels());
    const auto numFrames = static_cast<std::uint32_t>(clip.numFrames());
    const auto sampleRate = static_cast<std::uint32_t>(clip.sampleRate);
    const std::uint32_t blockAlign = 4 * numChannels;
    const std::uint32_t dataSize = blockAlign * numFrames;

    std::vector<std::uint8_t> out;
    out.reserve(58 + dataSize);
    appendTag(out, "RIFF");
    appendLe(out, 50 + dataSize, 4);
    appendTag(out, "WAVE");

    appendTag(out, "fmt ");
    appendLe(out, 18, 4);
    appendLe(out, kFormatFloat, 2);
    appendLe(out, numChannels, 2);
    appendLe(out, sampleRate, 4);
    appendLe(out, sampleRate * blockAlign, 4);
    appendLe(out, blockAlign, 2);
    appendLe(out, 32, 2);
    appendLe(out, 0, 2); // cbSize

    appendTag(out, "fact");
    appendLe(out, 4, 4);
    appendLe(out, numFrames, 4);

    appendTag(out, "data");
    appendLe(out, dataSize, 4);
    for (std::uint32_t frame = 0; frame < numFrames; ++frame) {
        for (std::uint32_t ch = 0; ch < numChannels; ++ch) {
            appendLe(out, std::bit_cast<std::uint32_t>(clip.channels[ch][frame]), 4);
        }
    }

    std::ofstream file(path, std::ios::binary);
    file.write(reinterpret_cast<const char*>(out.data()), static_cast<std::streamsize>(out.size()));
    if (!file) {
        throw wavError(path, "cannot write file");
    }
}

} // namespace aether::host
