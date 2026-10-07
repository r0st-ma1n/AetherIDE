#include "aether/PluginInfo.h"

#include <stdexcept>

namespace aether {

std::string PluginVersion::toString() const {
    return std::to_string(major) + "." + std::to_string(minor) + "." + std::to_string(patch);
}

void validatePluginInfo(const PluginInfo& info) {
    if (info.name.empty()) {
        throw std::invalid_argument("PluginInfo.name must not be empty");
    }
    if (info.vendor.empty()) {
        throw std::invalid_argument("PluginInfo.vendor must not be empty");
    }
    if (info.id.empty()) {
        throw std::invalid_argument("PluginInfo.id must not be empty");
    }
    for (const char c : info.id) {
        const bool allowed = (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') ||
                             (c >= '0' && c <= '9') || c == '.' || c == '-' || c == '_';
        if (!allowed) {
            throw std::invalid_argument("PluginInfo.id may contain only letters, digits and "
                                        "'.', '-', '_': " +
                                        info.id);
        }
    }
    if (info.version.major < 0 || info.version.minor < 0 || info.version.patch < 0) {
        throw std::invalid_argument("PluginInfo.version components must not be negative");
    }
}

} // namespace aether
