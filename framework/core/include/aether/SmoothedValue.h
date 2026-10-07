#pragma once

#include <cassert>
#include <cmath>

namespace aether {

/** @brief Shape of the ramp produced by SmoothedValue. */
enum class SmoothingType {
    /** Equal steps; reaches the target in exactly the ramp length. */
    Linear,
    /**
     * One-pole curve: fast at first, then slower. Reaches 1/1000 (-60 dB) of the distance
     * by the end of the ramp, then lands exactly on the target.
     */
    Exponential,
};

/**
 * @brief Ramps a value towards a target over a fixed time, one sample at a time.
 *
 * Use it for any parameter that scales audio directly (gain, mix, pan): a sudden jump
 * produces an audible click. Typical use in a processor:
 *
 *     void prepareToPlay(const ProcessSetup& setup) override {
 *         gain_.reset(setup.sampleRate, 20.0);
 *     }
 *
 *     void processBlock(ProcessContext& context) override {
 *         gain_.setTarget(gainParameter_->value());
 *         for (int i = 0; i < context.output.numSamples(); ++i) {
 *             const float g = gain_.next();
 *             ...
 *         }
 *     }
 *
 * The ramp is monotonic: values move towards the target and never overshoot. All methods
 * are noexcept and do not allocate, so they are safe on the audio thread.
 */
class SmoothedValue {
public:
    explicit SmoothedValue(SmoothingType type = SmoothingType::Linear,
                           float initialValue = 0.0f) noexcept
        : type_(type), current_(initialValue), target_(initialValue) {}

    /**
     * @brief Sets the ramp length for a sample rate; call from prepareToPlay().
     *
     * Stops any ramp in progress. The next setTarget() jumps straight to its value, so
     * playback does not start with a ramp from a stale value.
     *
     * @param sampleRate  Sample rate in Hz, > 0.
     * @param rampMs      Ramp length in milliseconds, >= 0; 0 disables smoothing.
     */
    void reset(double sampleRate, double rampMs) noexcept {
        assert(sampleRate > 0.0 && rampMs >= 0.0);
        rampSamples_ = static_cast<int>(std::lround(sampleRate * rampMs / 1000.0));
        // Exponential: (1 - coefficient)^rampSamples == 1/1000.
        coefficient_ = rampSamples_ > 0
                           ? 1.0f - static_cast<float>(std::pow(1.0e-3, 1.0 / rampSamples_))
                           : 1.0f;
        current_ = target_;
        remaining_ = 0;
        snapOnNextTarget_ = true;
    }

    /** @brief Starts a ramp from the current value to @p target (or jumps after reset()). */
    void setTarget(float target) noexcept {
        if (snapOnNextTarget_) {
            setCurrentAndTarget(target);
            return;
        }
        if (target == target_) {
            return;
        }
        target_ = target;
        if (rampSamples_ <= 0) {
            current_ = target;
            remaining_ = 0;
            return;
        }
        remaining_ = rampSamples_;
        step_ = (target_ - current_) / static_cast<float>(rampSamples_);
    }

    /** @brief Jumps to @p value without a ramp. */
    void setCurrentAndTarget(float value) noexcept {
        current_ = value;
        target_ = value;
        remaining_ = 0;
        snapOnNextTarget_ = false;
    }

    /** @brief Advances one sample and returns the new value. */
    float next() noexcept {
        if (remaining_ <= 0) {
            return target_;
        }
        if (--remaining_ == 0) {
            current_ = target_;
        } else if (type_ == SmoothingType::Linear) {
            current_ += step_;
        } else {
            current_ += (target_ - current_) * coefficient_;
        }
        return current_;
    }

    /** @brief Advances @p numSamples samples at once. */
    void skip(int numSamples) noexcept {
        for (int i = 0; i < numSamples && remaining_ > 0; ++i) {
            next();
        }
    }

    float current() const noexcept {
        return current_;
    }

    float target() const noexcept {
        return target_;
    }

    bool isSmoothing() const noexcept {
        return remaining_ > 0;
    }

    /** @brief Ramp length in samples for the sample rate passed to reset(). */
    int rampLengthSamples() const noexcept {
        return rampSamples_;
    }

private:
    SmoothingType type_;
    float current_;
    float target_;
    float step_ = 0.0f;
    float coefficient_ = 1.0f;
    int rampSamples_ = 0;
    int remaining_ = 0;
    bool snapOnNextTarget_ = false;
};

} // namespace aether
