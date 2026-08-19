#pragma once

#include "aether/Widget.h"

#include <vector>

namespace aether {

/**
 * Flat z-ordered list of widgets for hit-testing (later: real tree).
 * Later paint/event loop will own this; for now it is a testable utility.
 */
class WidgetHost {
public:
    void add(Widget* widget) {
        if (widget != nullptr) {
            widgets_.push_back(widget);
        }
    }

    void clear() {
        widgets_.clear();
    }

    const std::vector<Widget*>& widgets() const {
        return widgets_;
    }

    /**
     * Top-most widget whose bounds contain (x, y), or nullptr.
     * Later siblings win over earlier ones.
     */
    Widget* hitTest(int x, int y) const {
        for (auto it = widgets_.rbegin(); it != widgets_.rend(); ++it) {
            Widget* widget = *it;
            if (widget == nullptr) {
                continue;
            }
            if (x >= widget->x() && x < widget->x() + widget->width() &&
                y >= widget->y() && y < widget->y() + widget->height()) {
                return widget;
            }
        }
        return nullptr;
    }

    /**
     * Deliver a normalized [0,1] value change to the hit widget and invoke
     * its onValueChanged callback (and setParameter value when bound).
     */
    bool pointerValueAt(int x, int y, float normalizedValue) {
        Widget* widget = hitTest(x, y);
        if (widget == nullptr) {
            return false;
        }

        float value = normalizedValue;
        if (Parameter* param = widget->parameter()) {
            const float min = param->min();
            const float max = param->max();
            value = min + (max - min) * normalizedValue;
            param->setValue(value);
            value = param->value();
        }

        if (widget->onValueChanged) {
            widget->onValueChanged(value);
        }
        return true;
    }

private:
    std::vector<Widget*> widgets_;
};

} // namespace aether
