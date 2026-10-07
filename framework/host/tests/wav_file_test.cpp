#include "support/Check.h"

#include "aether/host/WavFile.h"

#include <cstdint>
#include <filesystem>
#include <fstream>
#include <stdexcept>
#include <vector>

using aether::host::AudioClip;
using aether::test::expectNear;
using aether::test::expectTrue;

namespace {

std::filesystem::path tempPath(const char* name) {
    return std::filesystem::temp_directory_path() / name;
}

void appendLe(std::vector<std::uint8_t>& out, std::uint32_t value, int bytes) {
    for (int i = 0; i < bytes; ++i) {
        out.push_back(static_cast<std::uint8_t>(value >> (8 * i)));
    }
}

void appendTag(std::vector<std::uint8_t>& out, const char* tag) {
    out.insert(out.end(), tag, tag + 4);
}

/** PCM WAV with an unknown odd-sized chunk before "data", like many real files have. */
std::vector<std::uint8_t> pcmWav(int bits, int channels, const std::vector<std::int32_t>& data) {
    const int bytesPerSample = bits / 8;
    std::vector<std::uint8_t> body;
    appendTag(body, "WAVE");
    appendTag(body, "fmt ");
    appendLe(body, 16, 4);
    appendLe(body, 1, 2);
    appendLe(body, channels, 2);
    appendLe(body, 44100, 4);
    appendLe(body, 44100 * channels * bytesPerSample, 4);
    appendLe(body, channels * bytesPerSample, 2);
    appendLe(body, bits, 2);
    appendTag(body, "LIST");
    appendLe(body, 3, 4);
    body.insert(body.end(), {'a', 'b', 'c', 0}); // 3 bytes + padding byte
    appendTag(body, "data");
    appendLe(body, static_cast<std::uint32_t>(data.size() * bytesPerSample), 4);
    for (const std::int32_t sample : data) {
        appendLe(body, static_cast<std::uint32_t>(sample), bytesPerSample);
    }

    std::vector<std::uint8_t> file;
    appendTag(file, "RIFF");
    appendLe(file, static_cast<std::uint32_t>(body.size()), 4);
    file.insert(file.end(), body.begin(), body.end());
    return file;
}

void writeBytes(const std::filesystem::path& path, const std::vector<std::uint8_t>& bytes) {
    std::ofstream file(path, std::ios::binary);
    file.write(reinterpret_cast<const char*>(bytes.data()),
               static_cast<std::streamsize>(bytes.size()));
}

bool throwsRuntimeError(const std::filesystem::path& path) {
    try {
        aether::host::readWav(path);
    } catch (const std::runtime_error&) {
        return true;
    }
    return false;
}

void floatRoundTripIsExact() {
    AudioClip clip = AudioClip::sine(997.0, 0.8f, 0.05, 44100.0, 2);
    clip.channels[1][7] = -1.0f;
    const auto path = tempPath("aether_wav_roundtrip.wav");
    aether::host::writeWav(path, clip);
    const AudioClip loaded = aether::host::readWav(path);

    expectTrue(loaded.numChannels() == 2, "channel count survives");
    expectTrue(loaded.numFrames() == clip.numFrames(), "frame count survives");
    expectNear(static_cast<float>(loaded.sampleRate), 44100.0f, 0.0f, "sample rate survives");
    expectTrue(loaded.channels == clip.channels, "32-bit float samples survive bit-exactly");
    std::filesystem::remove(path);
}

void readsPcm16AndSkipsUnknownChunks() {
    const auto path = tempPath("aether_wav_pcm16.wav");
    writeBytes(path, pcmWav(16, 2, {16384, -32768, 0, 32767}));
    const AudioClip clip = aether::host::readWav(path);

    expectTrue(clip.numChannels() == 2 && clip.numFrames() == 2, "stereo, two frames");
    expectNear(clip.channels[0][0], 0.5f, 0.0f, "16-bit half scale");
    expectNear(clip.channels[1][0], -1.0f, 0.0f, "16-bit negative full scale");
    expectNear(clip.channels[1][1], 32767.0f / 32768.0f, 0.0f, "16-bit positive full scale");
    std::filesystem::remove(path);
}

void readsPcm24() {
    const auto path = tempPath("aether_wav_pcm24.wav");
    writeBytes(path, pcmWav(24, 1, {4194304, -8388608}));
    const AudioClip clip = aether::host::readWav(path);
    expectNear(clip.channels[0][0], 0.5f, 0.0f, "24-bit half scale");
    expectNear(clip.channels[0][1], -1.0f, 0.0f, "24-bit sign extension");
    std::filesystem::remove(path);
}

void rejectsBadFiles() {
    expectTrue(throwsRuntimeError(tempPath("aether_wav_missing_file.wav")), "missing file");

    const auto path = tempPath("aether_wav_garbage.wav");
    writeBytes(path, {'n', 'o', 't', ' ', 'a', ' ', 'w', 'a', 'v'});
    expectTrue(throwsRuntimeError(path), "not a WAV file");

    auto eightBit = pcmWav(16, 1, {0});
    eightBit[34] = 8; // bitsPerSample = 8
    writeBytes(path, eightBit);
    expectTrue(throwsRuntimeError(path), "unsupported 8-bit PCM");
    std::filesystem::remove(path);
}

} // namespace

int main() {
    floatRoundTripIsExact();
    readsPcm16AndSkipsUnknownChunks();
    readsPcm24();
    rejectsBadFiles();
    return aether::test::finish("wav_file_test");
}
