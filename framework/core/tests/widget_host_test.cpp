#include "aether/Knob.h"
#include "aether/Parameter.h"
#include "aether/PluginProcessor.h"
#include "aether/WidgetHost.h"

#include <cmath>
#include <cstdlib>
#include <iostream>
#include <string>

namespace {

int failures = 0;

void expectTrue(bool condition, const char* message) {
    if (!condition) {
        std::cerr << "FAIL: " << message << '\n';
        ++failures;
    }
}

void expectNear(float actual, float expected, float eps, const char* message) {
    if (std::fabs(actual - expected) > eps) {
        std::cerr << "FAIL: " << message << " (got " << actual << ", expected "
                  << expected << ")\n";
        ++failures;
    }
}

} // namespace

int main() {
    using namespace aether;

    // Concrete processor for layout ownership in tests.
    class TestProcessor : public PluginProcessor {
    public:
        void prepareToPlay(double, int) override {}
        void processBlock(ProcessContext&) override {}
        void releaseResources() override {}
    };

    TestProcessor processor;
    processor.parameters().addFloat("gain", "Gain", 0.0f, 1.0f, 0.5f);

    Knob knob;
    knob.setBounds(10, 20, 40, 40);
    knob.setParameter(processor.getParameter("gain"));

    float lastCallback = -1.0f;
    knob.onValueChanged = [&](float value) { lastCallback = value; };

    WidgetHost host;
    host.add(&knob);

    expectTrue(host.hitTest(5, 25) == nullptr, "miss left of knob");
    expectTrue(host.hitTest(15, 25) == &knob, "hit inside knob");
    expectTrue(host.pointerValueAt(15, 25, 0.25f), "pointer updates knob");
    expectNear(lastCallback, 0.25f, 1e-5f, "callback receives mapped value");
    expectNear(
        processor.getParameter("gain")->value(),
        0.25f,
        1e-5f,
        "parameter updated"
    );

    Knob top;
    top.setBounds(10, 20, 40, 40);
    host.add(&top);
    expectTrue(host.hitTest(15, 25) == &top, "later widget wins z-order");

    if (failures != 0) {
        std::cerr << failures << " assertion(s) failed\n";
        return EXIT_FAILURE;
    }

    std::cout << "widget_host_test: ok\n";
    return EXIT_SUCCESS;
}
