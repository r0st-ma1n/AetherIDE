#include "GainPlugin.h"

void GainPlugin::prepare([[maybe_unused]] double sampleRate, [[maybe_unused]] int maxBlockSize) {
}

void GainPlugin::reset() {
}

apf::ParameterLayout GainPlugin::createParameters() {
    apf::ParameterLayout layout;

    layout.addFloat(
        "gain",
        "Gain",
        0.0f,
        2.0f,
        1.0f
    );

    return layout;
}

void GainPlugin::process(apf::ProcessContext& context) {
    const float gain = context.parameters.getFloat("gain").value();

    for (int ch = 0; ch < context.audio.numChannels(); ++ch) {
        float* samples = context.audio.channel(ch);

        for (int i = 0; i < context.audio.numSamples(); ++i) {
            samples[i] *= gain;
        }
    }
}

void GainPlugin::setupUI() {
{
    auto* Knob_1 = new Knob(260, 195);
{
    auto* Knob_1 = new Knob(211, 302);
{
    auto* Knob_1 = new Knob(229, 357);
{
    auto* Knob_1 = new Knob(335, 340);
{
    auto* Knob_1 = new Knob(335, 340);
{
    auto* Knob_1 = new Knob(308, 467);
{
    auto* Knob_1 = new Knob(308, 467);
{
    auto* Knob_1 = new Knob(335, 277);
{
    auto* Knob_1 = new Knob(335, 277);
{
    auto* Knob_1 = new Knob(205, 401);
{
    auto* Knob_1 = new Knob(205, 401);
{
    auto* Knob_1 = new Knob(268, 285);
{
    auto* Knob_1 = new Knob(268, 285);
{
    auto* Knob_1 = new Knob(173, 373);
{
    auto* Knob_1 = new Knob(173, 373);
{
    auto* Knob_1 = new Knob(203, 287);
{
    auto* Knob_1 = new Knob(203, 287);
{
    auto* Knob_1 = new Knob(172, 365);
{
    auto* Knob_1 = new Knob(172, 365);
{
    auto* Knob_1 = new Knob(233, 266);
{
    auto* Knob_1 = new Knob(233, 266);
{
    auto* Knob_1 = new Knob(228, 343);
{
    auto* Knob_1 = new Knob(228, 343);
{
    auto* Knob_1 = new Knob(200, 393);
{
    auto* Knob_1 = new Knob(200, 393);
{
    auto* Knob_1 = new Knob(264, 304);
{
    auto* Knob_1 = new Knob(264, 304);
{
    auto* Knob_1 = new Knob(198, 385);
{
    auto* Knob_1 = new Knob(198, 385);
{
    auto* Knob_1 = new Knob(257, 292);
{
    auto* Knob_1 = new Knob(257, 292);
{
    auto* Knob_1 = new Knob(222, 389);
{
    auto* Knob_1 = new Knob(222, 389);
{
    auto* Knob_1 = new Knob(257, 304);
{
    auto* Knob_1 = new Knob(257, 304);
{
    auto* Knob_1 = new Knob(261, 376);
{
    auto* Knob_1 = new Knob(261, 376);
{
    auto* Knob_1 = new Knob(210, 415);
{
    auto* Knob_1 = new Knob(210, 415);
{
    auto* Knob_1 = new Knob(215, 351);
{
    auto* Knob_1 = new Knob(215, 351);
{
    auto* Knob_1 = new Knob(241, 311);
{
    auto* Knob_1 = new Knob(241, 311);
{
    auto* Knob_1 = new Knob(272, 295);
{
    auto* Knob_1 = new Knob(272, 295);
{
    auto* Knob_1 = new Knob(286, 267);
{
    auto* Knob_1 = new Knob(286, 267);
{
    auto* Knob_1 = new Knob(250, 229);
{
    auto* Knob_1 = new Knob(250, 229);
{
    auto* Knob_1 = new Knob(345, 169);
{
    auto* Knob_1 = new Knob(345, 169);
{
    auto* Knob_1 = new Knob(294, 411);
{
    auto* Knob_1 = new Knob(294, 411);
{
    auto* Knob_1 = new Knob(286, 280);
{
    auto* Knob_1 = new Knob(286, 280);
{
    auto* Knob_1 = new Knob(418, 256);
{
    auto* Knob_1 = new Knob(418, 256);
{
    auto* Knob_1 = new Knob(271, 260);
{
    auto* Knob_1 = new Knob(263, 295);
{
    auto* Slider_1 = new Slider(173, 348);
    // UI components will be generated here by the IDE
}
