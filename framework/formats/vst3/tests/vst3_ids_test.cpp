// VST3 class IDs must stay the same forever: DAW projects find plugins by them.
#include "support/Check.h"

#include "aether/vst3/Vst3Ids.h"

#include <array>
#include <cstdint>
#include <cstdio>
#include <string>
#include <string_view>

using aether::test::expectTrue;

namespace {

std::string hex(const std::array<std::uint8_t, 16>& bytes) {
    std::string out;
    char digits[3];
    for (const std::uint8_t b : bytes) {
        std::snprintf(digits, sizeof(digits), "%02x", b);
        out += digits;
    }
    return out;
}

void expectHash(std::string_view input, const char* expected) {
    const std::string actual = hex(aether::vst3::fnv1a128(input));
    if (actual != expected) {
        std::fprintf(stderr, "fnv1a128(\"%.*s\") = %s, expected %s\n",
                     static_cast<int>(input.size()), input.data(), actual.c_str(), expected);
    }
    expectTrue(actual == expected, "FNV-1a 128 test vector");
}

} // namespace

int main() {
    // Published FNV-1a 128 test vectors.
    expectHash("", "6c62272e07bb014262b821756295c58d");
    expectHash("a", "d228cb696f1a8caf78912b704e4a8964");
    expectHash("foobar", "343e1662793c64bf6f0d3597ba446f18");

    // Pinned: samples/GainPlugin. Changing this breaks every DAW project using the plugin.
    expectTrue(hex(aether::vst3::componentClassId("dev.aether.samples.gain")) ==
                   "bcc130815e62cf65bff16092149a65bb",
               "class ID of the GainPlugin sample is stable");
    expectTrue(aether::vst3::componentClassId("a.b") != aether::vst3::componentClassId("a.c"),
               "different plugin ids give different class IDs");

    return aether::test::finish("vst3_ids_test");
}
