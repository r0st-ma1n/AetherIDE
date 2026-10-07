#include "aether/PluginState.h"

#include <bit>
#include <cstring>
#include <optional>
#include <string_view>
#include <utility>

namespace aether {

namespace {

constexpr std::uint8_t kMagic[4] = {'A', 'E', 'T', 'S'};

void writeU32(PluginState& out, std::uint32_t value) {
    for (int shift = 0; shift < 32; shift += 8) {
        out.push_back(static_cast<std::uint8_t>(value >> shift));
    }
}

void writeBytes(PluginState& out, std::span<const std::uint8_t> bytes) {
    writeU32(out, static_cast<std::uint32_t>(bytes.size()));
    out.insert(out.end(), bytes.begin(), bytes.end());
}

/** Bounds-checked little-endian reader; every read fails once the input is exhausted. */
class Reader {
public:
    explicit Reader(std::span<const std::uint8_t> data) : data_(data) {}

    std::optional<std::uint32_t> u32() {
        if (data_.size() - pos_ < 4) {
            return std::nullopt;
        }
        std::uint32_t value = 0;
        for (int i = 0; i < 4; ++i) {
            value |= static_cast<std::uint32_t>(data_[pos_ + i]) << (8 * i);
        }
        pos_ += 4;
        return value;
    }

    std::optional<std::span<const std::uint8_t>> bytes(std::uint32_t length) {
        if (data_.size() - pos_ < length) {
            return std::nullopt;
        }
        auto result = data_.subspan(pos_, length);
        pos_ += length;
        return result;
    }

    std::size_t remaining() const {
        return data_.size() - pos_;
    }

private:
    std::span<const std::uint8_t> data_;
    std::size_t pos_ = 0;
};

} // namespace

PluginState savePluginState(const ParameterLayout& parameters,
                            std::span<const std::uint8_t> customData) {
    PluginState out(std::begin(kMagic), std::end(kMagic));
    writeU32(out, kPluginStateFormatVersion);
    writeU32(out, static_cast<std::uint32_t>(parameters.size()));

    for (std::size_t i = 0; i < parameters.size(); ++i) {
        const auto& param = parameters[i];
        const auto* id = reinterpret_cast<const std::uint8_t*>(param.id().data());
        writeBytes(out, {id, param.id().size()});
        writeU32(out, std::bit_cast<std::uint32_t>(param.value()));
    }

    writeBytes(out, customData);
    return out;
}

bool loadPluginState(ParameterLayout& parameters, std::span<const std::uint8_t> state,
                     std::vector<std::uint8_t>* customData) {
    Reader reader(state);

    const auto magic = reader.bytes(4);
    if (!magic || std::memcmp(magic->data(), kMagic, 4) != 0) {
        return false;
    }
    const auto version = reader.u32();
    if (!version || *version == 0 || *version > kPluginStateFormatVersion) {
        return false;
    }
    const auto count = reader.u32();
    // Each entry takes at least 8 bytes; reject counts the data cannot hold.
    if (!count || *count > reader.remaining() / 8) {
        return false;
    }

    std::vector<std::pair<AudioProcessorParameter*, float>> values;
    values.reserve(*count);
    for (std::uint32_t i = 0; i < *count; ++i) {
        const auto idLength = reader.u32();
        if (!idLength) {
            return false;
        }
        const auto id = reader.bytes(*idLength);
        const auto bits = reader.u32();
        if (!id || !bits) {
            return false;
        }
        const std::string_view idText(reinterpret_cast<const char*>(id->data()), id->size());
        if (auto* param = parameters.find(idText)) {
            values.emplace_back(param, std::bit_cast<float>(*bits));
        }
    }

    const auto customLength = reader.u32();
    if (!customLength) {
        return false;
    }
    const auto custom = reader.bytes(*customLength);
    if (!custom) {
        return false;
    }

    // Valid: apply. Parameters absent from the state return to their defaults.
    for (std::size_t i = 0; i < parameters.size(); ++i) {
        parameters[i].setValue(parameters[i].defaultValue());
    }
    for (const auto& [param, value] : values) {
        param->setValue(value);
    }
    if (customData != nullptr) {
        customData->assign(custom->begin(), custom->end());
    }
    return true;
}

} // namespace aether
