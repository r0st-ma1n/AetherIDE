
#pragma once

#include <string>
#include <vector>
#include <stdexcept>

namespace apf {

class FloatParameter {
public:
    FloatParameter(
        std::string id,
        std::string name,
        float min,
        float max,
        float defaultValue
    );

    const std::string& id() const;
    const std::string& name() const;

    float min() const;
    float max() const;
    float value() const;

    void setValue(float value);

private:
    std::string id_;
    std::string name_;
    float min_;
    float max_;
    float value_;
};

class ParameterLayout {
public:
    void addFloat(
        const std::string& id,
        const std::string& name,
        float min,
        float max,
        float defaultValue
    );

    FloatParameter& getFloat(const std::string& id);
    const FloatParameter& getFloat(const std::string& id) const;

    std::vector<FloatParameter>& floats();
    const std::vector<FloatParameter>& floats() const;

private:
    std::vector<FloatParameter> floatParams_;
};

}