#pragma once

#include "aether/Parameter.h"

#include <functional>

namespace aether {

/**
 * Non-rendering widget stub used by IDE codegen.
 * Hit-testing and paint land in later P2 GUI tasks.
 */
class Widget {
public:
    virtual ~Widget() = default;

    void setBounds(int x, int y, int width, int height) {
        x_ = x;
        y_ = y;
        width_ = width;
        height_ = height;
    }

    void setParameter(Parameter* parameter) {
        parameter_ = parameter;
    }

    Parameter* parameter() const {
        return parameter_;
    }

    int x() const { return x_; }
    int y() const { return y_; }
    int width() const { return width_; }
    int height() const { return height_; }

    /** Invoked by the future event loop when the control value changes. */
    std::function<void(float)> onValueChanged;

protected:
    int x_ = 0;
    int y_ = 0;
    int width_ = 0;
    int height_ = 0;
    Parameter* parameter_ = nullptr;
};

} // namespace aether
