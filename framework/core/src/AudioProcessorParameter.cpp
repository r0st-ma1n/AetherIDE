#include "aether/AudioProcessorParameter.h"

#include <algorithm>

namespace aether {

AudioProcessorParameter::AudioProcessorParameter(
    std::string id,
    std::string name,
    float min,
    float max,
    float defaultValue,
    float step
)
    : id_(std::move(id)),
      name_(std::move(name)),
      min_(min),
      max_(max),
      defaultValue_(defaultValue),
      step_(step),
      value_(defaultValue) {
    if (min >= max) {
        throw std::invalid_argument("Parameter min must be less than max");
    }

    if (defaultValue < min || defaultValue > max) {
        throw std::invalid_argument("Default value is outside parameter range");
    }
}

const std::string& AudioProcessorParameter::id() const {
    return id_;
}

const std::string& AudioProcessorParameter::name() const {
    return name_;
}

float AudioProcessorParameter::min() const {
    return min_;
}

float AudioProcessorParameter::max() const {
    return max_;
}

float AudioProcessorParameter::defaultValue() const {
    return defaultValue_;
}

float AudioProcessorParameter::step() const {
    return step_;
}

float AudioProcessorParameter::value() const {
    return value_;
}

void AudioProcessorParameter::setValue(float value) {
    if (value < min_) {
        value_ = min_;
    } else if (value > max_) {
        value_ = max_;
    } else {
        value_ = value;
    }
}

void ParameterLayout::addFloat(
    const std::string& id,
    const std::string& name,
    float min,
    float max,
    float defaultValue,
    float step
) {
    floatParams_.emplace_back(id, name, min, max, defaultValue, step);
}

AudioProcessorParameter* ParameterLayout::findFloat(const std::string& id) {
    auto it = std::find_if(
        floatParams_.begin(),
        floatParams_.end(),
        [&](const AudioProcessorParameter& param) {
            return param.id() == id;
        }
    );

    if (it == floatParams_.end()) {
        return nullptr;
    }

    return &(*it);
}

const AudioProcessorParameter* ParameterLayout::findFloat(
    const std::string& id
) const {
    auto it = std::find_if(
        floatParams_.begin(),
        floatParams_.end(),
        [&](const AudioProcessorParameter& param) {
            return param.id() == id;
        }
    );

    if (it == floatParams_.end()) {
        return nullptr;
    }

    return &(*it);
}

AudioProcessorParameter& ParameterLayout::getFloat(const std::string& id) {
    auto* param = findFloat(id);
    if (param == nullptr) {
        throw std::runtime_error("Parameter not found: " + id);
    }
    return *param;
}

const AudioProcessorParameter& ParameterLayout::getFloat(const std::string& id) const {
    const auto* param = findFloat(id);
    if (param == nullptr) {
        throw std::runtime_error("Parameter not found: " + id);
    }
    return *param;
}

std::vector<AudioProcessorParameter>& ParameterLayout::floats() {
    return floatParams_;
}

const std::vector<AudioProcessorParameter>& ParameterLayout::floats() const {
    return floatParams_;
}

} // namespace aether
