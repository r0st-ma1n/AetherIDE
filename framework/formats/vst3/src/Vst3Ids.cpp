#include "aether/vst3/Vst3Ids.h"

#include <string>

namespace aether::vst3 {

namespace {

/** 128-bit unsigned integer as two 64-bit halves; just what FNV-1a needs. */
struct U128 {
    std::uint64_t hi;
    std::uint64_t lo;
};

/** @p x * FNV prime (2^88 + 0x13B), modulo 2^128. */
U128 multiplyByPrime(U128 x) noexcept {
    constexpr std::uint64_t kLowPart = 0x13B;
    // x * 0x13B: split lo into 32-bit halves so no product overflows.
    const std::uint64_t a = (x.lo & 0xFFFFFFFFu) * kLowPart;
    const std::uint64_t b = (x.lo >> 32) * kLowPart;
    const std::uint64_t mid = (a >> 32) + (b & 0xFFFFFFFFu);
    U128 result;
    result.lo = (a & 0xFFFFFFFFu) | (mid << 32);
    result.hi = x.hi * kLowPart + (b >> 32) + (mid >> 32);
    // x * 2^88 only reaches the high half: lo shifted by 88 - 64 bits.
    result.hi += x.lo << 24;
    return result;
}

} // namespace

std::array<std::uint8_t, 16> fnv1a128(std::string_view data) noexcept {
    U128 hash{0x6c62272e07bb0142u, 0x62b821756295c58du};
    for (const char c : data) {
        hash.lo ^= static_cast<std::uint8_t>(c);
        hash = multiplyByPrime(hash);
    }
    std::array<std::uint8_t, 16> bytes{};
    for (int i = 0; i < 8; ++i) {
        bytes[i] = static_cast<std::uint8_t>(hash.hi >> (56 - 8 * i));
        bytes[8 + i] = static_cast<std::uint8_t>(hash.lo >> (56 - 8 * i));
    }
    return bytes;
}

std::array<std::uint8_t, 16> componentClassId(std::string_view pluginId) noexcept {
    std::string key = "aether.vst3/";
    key.append(pluginId);
    return fnv1a128(key);
}

} // namespace aether::vst3
