#include "aether/Parameter.h"

#include <algorithm>

namespace aether {

FloatParameter::FloatParameter(
    std::string id,
    std::string name,
    float min,
    float max,
    float defaultValue
)
    : id_(std::move(id)),
      name_(std::move(name)),
      min_(min),
      max_(max),
      value_(defaultValue) {
    if (min >= max) {
        throw std::invalid_argument("Parameter min must be less than max");
    }

    if (defaultValue < min || defaultValue > max) {
        throw std::invalid_argument("Default value is outside parameter range");
    }
}

const std::string& FloatParameter::id() const {
    return id_;
}

const std::string& FloatParameter::name() const {
    return name_;
}

float FloatParameter::min() const {
    return min_;
}

float FloatParameter::max() const {
    return max_;
}

float FloatParameter::value() const {
    return value_;
}

void FloatParameter::setValue(float value) {
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
    float defaultValue
) {
    floatParams_.emplace_back(id, name, min, max, defaultValue);
}

FloatParameter& ParameterLayout::getFloat(const std::string& id) {
    auto it = std::find_if(
        floatParams_.begin(),
        floatParams_.end(),
        [&](const FloatParameter& param) {
            return param.id() == id;
        }
    );

    if (it == floatParams_.end()) {
        throw std::runtime_error("Float parameter not found: " + id);
    }

    return *it;
}

const FloatParameter& ParameterLayout::getFloat(const std::string& id) const {
    auto it = std::find_if(
        floatParams_.begin(),
        floatParams_.end(),
        [&](const FloatParameter& param) {
            return param.id() == id;
        }
    );

    if (it == floatParams_.end()) {
        throw std::runtime_error("Float parameter not found: " + id);
    }

    return *it;
}

std::vector<FloatParameter>& ParameterLayout::floats() {
    return floatParams_;
}

const std::vector<FloatParameter>& ParameterLayout::floats() const {
    return floatParams_;
}

}