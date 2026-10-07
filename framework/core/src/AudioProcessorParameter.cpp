#include "aether/AudioProcessorParameter.h"

#include <algorithm>
#include <charconv>
#include <cmath>
#include <stdexcept>
#include <system_error>

namespace aether {

namespace {

constexpr int kMaxDecimals = 9;

std::string_view trim(std::string_view text) noexcept {
    constexpr std::string_view kSpace = " \t\r\n";
    const auto first = text.find_first_not_of(kSpace);
    if (first == std::string_view::npos) {
        return {};
    }
    const auto last = text.find_last_not_of(kSpace);
    return text.substr(first, last - first + 1);
}

bool equalsIgnoreCase(std::string_view a, std::string_view b) noexcept {
    if (a.size() != b.size()) {
        return false;
    }
    for (std::size_t i = 0; i < a.size(); ++i) {
        const auto lower = [](char c) {
            return (c >= 'A' && c <= 'Z') ? static_cast<char>(c - 'A' + 'a') : c;
        };
        if (lower(a[i]) != lower(b[i])) {
            return false;
        }
    }
    return true;
}

bool endsWithIgnoreCase(std::string_view text, std::string_view suffix) noexcept {
    return text.size() >= suffix.size() &&
           equalsIgnoreCase(text.substr(text.size() - suffix.size()), suffix);
}

std::optional<float> parseFloat(std::string_view text) noexcept {
    if (!text.empty() && text.front() == '+') {
        text.remove_prefix(1);
    }
    float value = 0.0f;
    const char* end = text.data() + text.size();
    const auto [ptr, ec] = std::from_chars(text.data(), end, value);
    if (ec != std::errc() || ptr != end || text.empty()) {
        return std::nullopt;
    }
    return value;
}

} // namespace

ParamId parameterIdFromString(std::string_view id) noexcept {
    std::uint32_t hash = 0x811c9dc5u;
    for (const char c : id) {
        hash ^= static_cast<unsigned char>(c);
        hash *= 0x01000193u;
    }
    return hash & 0x7fffffffu;
}

AudioProcessorParameter::AudioProcessorParameter(std::string id, std::string name, float min,
                                                 float max, float defaultValue,
                                                 ParameterOptions options)
    : AudioProcessorParameter(ParameterKind::Float, std::move(id), std::move(name), min, max,
                              defaultValue, std::move(options), {}) {}

std::unique_ptr<AudioProcessorParameter>
AudioProcessorParameter::makeBool(std::string id, std::string name, bool defaultValue,
                                  ParameterOptions options) {
    if (options.step != 0.0f) {
        throw std::invalid_argument("Bool parameter does not take a step: " + id);
    }
    options.step = 1.0f;
    return std::unique_ptr<AudioProcessorParameter>(
        new AudioProcessorParameter(ParameterKind::Bool, std::move(id), std::move(name), 0.0f, 1.0f,
                                    defaultValue ? 1.0f : 0.0f, std::move(options), {}));
}

std::unique_ptr<AudioProcessorParameter>
AudioProcessorParameter::makeChoice(std::string id, std::string name,
                                    std::vector<std::string> choices, int defaultIndex,
                                    ParameterOptions options) {
    if (choices.size() < 2) {
        throw std::invalid_argument("Choice parameter needs at least two choices: " + id);
    }
    if (defaultIndex < 0 || defaultIndex >= static_cast<int>(choices.size())) {
        throw std::invalid_argument("Choice default index is out of range: " + id);
    }
    if (options.step != 0.0f) {
        throw std::invalid_argument("Choice parameter does not take a step: " + id);
    }
    options.step = 1.0f;
    const auto last = static_cast<float>(choices.size() - 1);
    return std::unique_ptr<AudioProcessorParameter>(new AudioProcessorParameter(
        ParameterKind::Choice, std::move(id), std::move(name), 0.0f, last,
        static_cast<float>(defaultIndex), std::move(options), std::move(choices)));
}

AudioProcessorParameter::AudioProcessorParameter(ParameterKind kind, std::string id,
                                                 std::string name, float min, float max,
                                                 float defaultValue, ParameterOptions options,
                                                 std::vector<std::string> choices)
    : id_(std::move(id)), numericId_(parameterIdFromString(id_)), name_(std::move(name)),
      kind_(kind), min_(min), max_(max), defaultValue_(defaultValue), step_(options.step),
      unit_(std::move(options.unit)), automatable_(options.automatable),
      isBypass_(options.isBypass), decimals_(options.decimals), choices_(std::move(choices)),
      value_(defaultValue) {
    if (id_.empty()) {
        throw std::invalid_argument("Parameter id must not be empty");
    }
    if (!(min < max)) {
        throw std::invalid_argument("Parameter min must be less than max: " + id_);
    }
    if (defaultValue < min || defaultValue > max) {
        throw std::invalid_argument("Default value is outside parameter range: " + id_);
    }
    if (step_ < 0.0f || step_ > max - min) {
        throw std::invalid_argument("Parameter step must be in [0, max - min]: " + id_);
    }
    if (step_ > 0.0f) {
        const float steps = (max - min) / step_;
        if (std::fabs(steps - std::round(steps)) > 1e-4f) {
            throw std::invalid_argument("Parameter range must be a multiple of step: " + id_);
        }
        if (std::fabs(snap(defaultValue) - defaultValue) > 1e-4f * (max - min)) {
            throw std::invalid_argument("Default value is not on the step grid: " + id_);
        }
    }
    if (isBypass_ && kind_ != ParameterKind::Bool) {
        throw std::invalid_argument("Only a Bool parameter can be the bypass: " + id_);
    }
    if (decimals_ < 0 || decimals_ > kMaxDecimals) {
        throw std::invalid_argument("Parameter decimals must be in [0, 9]: " + id_);
    }
    value_.store(snap(defaultValue), std::memory_order_relaxed);
    defaultValue_ = value_.load(std::memory_order_relaxed);
}

int AudioProcessorParameter::stepCount() const noexcept {
    if (step_ <= 0.0f) {
        return 0;
    }
    return static_cast<int>(std::lround((max_ - min_) / step_));
}

float AudioProcessorParameter::snap(float value) const noexcept {
    if (std::isnan(value)) {
        value = defaultValue_;
    }
    value = std::clamp(value, min_, max_);
    if (step_ > 0.0f) {
        const float index = std::round((value - min_) / step_);
        value = std::clamp(min_ + index * step_, min_, max_);
    }
    return value;
}

void AudioProcessorParameter::setValue(float value) noexcept {
    value_.store(snap(value), std::memory_order_relaxed);
}

float AudioProcessorParameter::toNormalized(float value) const noexcept {
    return (snap(value) - min_) / (max_ - min_);
}

float AudioProcessorParameter::fromNormalized(float normalized) const noexcept {
    if (std::isnan(normalized)) {
        return defaultValue_;
    }
    normalized = std::clamp(normalized, 0.0f, 1.0f);
    return snap(min_ + normalized * (max_ - min_));
}

int AudioProcessorParameter::choiceIndex() const noexcept {
    return static_cast<int>(std::lround(value()));
}

std::string AudioProcessorParameter::valueToText(float value) const {
    value = snap(value);

    switch (kind_) {
    case ParameterKind::Bool:
        return value >= 0.5f ? "On" : "Off";
    case ParameterKind::Choice:
        return choices_[static_cast<std::size_t>(std::lround(value))];
    case ParameterKind::Float:
        break;
    }

    char buffer[64];
    const auto [end, ec] =
        std::to_chars(buffer, buffer + sizeof(buffer), value, std::chars_format::fixed, decimals_);
    if (ec != std::errc()) {
        return {};
    }
    std::string text(buffer, end);

    // "-0.00" reads as a different value from "0.00" — show it without the sign.
    if (text.front() == '-' && text.find_first_not_of("-0.") == std::string::npos) {
        text.erase(0, 1);
    }
    return text;
}

std::optional<float> AudioProcessorParameter::textToValue(std::string_view text) const {
    text = trim(text);

    switch (kind_) {
    case ParameterKind::Bool:
        if (equalsIgnoreCase(text, "on") || equalsIgnoreCase(text, "true") || text == "1") {
            return 1.0f;
        }
        if (equalsIgnoreCase(text, "off") || equalsIgnoreCase(text, "false") || text == "0") {
            return 0.0f;
        }
        return std::nullopt;

    case ParameterKind::Choice: {
        for (std::size_t i = 0; i < choices_.size(); ++i) {
            if (equalsIgnoreCase(text, choices_[i])) {
                return static_cast<float>(i);
            }
        }
        int index = 0;
        const char* end = text.data() + text.size();
        const auto [ptr, ec] = std::from_chars(text.data(), end, index);
        if (ec == std::errc() && ptr == end && !text.empty() && index >= 0 &&
            index < static_cast<int>(choices_.size())) {
            return static_cast<float>(index);
        }
        return std::nullopt;
    }

    case ParameterKind::Float:
        break;
    }

    if (!unit_.empty() && endsWithIgnoreCase(text, unit_)) {
        text = trim(text.substr(0, text.size() - unit_.size()));
    }
    const auto parsed = parseFloat(text);
    if (!parsed || !std::isfinite(*parsed)) {
        return std::nullopt;
    }
    return snap(*parsed);
}

AudioProcessorParameter& ParameterLayout::addFloat(std::string id, std::string name, float min,
                                                   float max, float defaultValue,
                                                   ParameterOptions options) {
    return add(std::make_unique<AudioProcessorParameter>(std::move(id), std::move(name), min, max,
                                                         defaultValue, std::move(options)));
}

AudioProcessorParameter& ParameterLayout::addBool(std::string id, std::string name,
                                                  bool defaultValue, ParameterOptions options) {
    return add(AudioProcessorParameter::makeBool(std::move(id), std::move(name), defaultValue,
                                                 std::move(options)));
}

AudioProcessorParameter& ParameterLayout::addChoice(std::string id, std::string name,
                                                    std::vector<std::string> choices,
                                                    int defaultIndex, ParameterOptions options) {
    return add(AudioProcessorParameter::makeChoice(
        std::move(id), std::move(name), std::move(choices), defaultIndex, std::move(options)));
}

AudioProcessorParameter& ParameterLayout::add(std::unique_ptr<AudioProcessorParameter> param) {
    if (find(param->id()) != nullptr) {
        throw std::invalid_argument("Duplicate parameter id: " + param->id());
    }
    if (const auto* clash = findById(param->numericId())) {
        throw std::invalid_argument("Parameter ids '" + param->id() + "' and '" + clash->id() +
                                    "' have the same numeric ID; rename one of them");
    }
    if (param->isBypass() && bypass() != nullptr) {
        throw std::invalid_argument("Only one bypass parameter is allowed: " + param->id());
    }
    params_.push_back(std::move(param));
    return *params_.back();
}

AudioProcessorParameter* ParameterLayout::find(std::string_view id) noexcept {
    for (auto& param : params_) {
        if (param->id() == id) {
            return param.get();
        }
    }
    return nullptr;
}

const AudioProcessorParameter* ParameterLayout::find(std::string_view id) const noexcept {
    return const_cast<ParameterLayout*>(this)->find(id);
}

AudioProcessorParameter* ParameterLayout::findById(ParamId id) noexcept {
    for (auto& param : params_) {
        if (param->numericId() == id) {
            return param.get();
        }
    }
    return nullptr;
}

const AudioProcessorParameter* ParameterLayout::findById(ParamId id) const noexcept {
    return const_cast<ParameterLayout*>(this)->findById(id);
}

AudioProcessorParameter& ParameterLayout::get(std::string_view id) {
    if (auto* param = find(id)) {
        return *param;
    }
    throw std::out_of_range("Parameter not found: " + std::string(id));
}

const AudioProcessorParameter& ParameterLayout::get(std::string_view id) const {
    return const_cast<ParameterLayout*>(this)->get(id);
}

AudioProcessorParameter* ParameterLayout::bypass() noexcept {
    for (auto& param : params_) {
        if (param->isBypass()) {
            return param.get();
        }
    }
    return nullptr;
}

} // namespace aether
