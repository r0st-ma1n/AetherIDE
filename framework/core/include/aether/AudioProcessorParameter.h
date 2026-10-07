#pragma once

#include <atomic>
#include <cstddef>
#include <cstdint>
#include <memory>
#include <optional>
#include <string>
#include <string_view>
#include <vector>

namespace aether {

/**
 * @brief Numeric parameter identifier shared by all plugin formats.
 *
 * Derived from the string id by parameterIdFromString(). Always below 2^31: VST3 reserves
 * IDs with the high bit set for the host, and CLAP and AU use 32-bit IDs as well.
 */
using ParamId = std::uint32_t;

/**
 * @brief Stable numeric ID for a string parameter id (FNV-1a, top bit cleared).
 *
 * The result depends only on the string, so it is the same on every platform and in every
 * build. It is what DAWs store in projects and automation.
 */
ParamId parameterIdFromString(std::string_view id) noexcept;

/** @brief How a parameter's float value is interpreted. */
enum class ParameterKind {
    Float,  ///< Continuous or stepped value in [min, max].
    Bool,   ///< 0 = off, 1 = on.
    Choice, ///< Index into choices(), 0..N-1.
};

/** @brief Optional settings for a parameter; defaults suit a plain automatable float. */
struct ParameterOptions {
    /** Smallest increment; 0 = continuous. Float parameters only. */
    float step = 0.0f;
    /** Unit label shown next to the value, e.g. "dB", "%", "Hz", "ms". Empty = none. */
    std::string unit;
    /** Whether the host may automate the parameter. */
    bool automatable = true;
    /** Marks the plugin's bypass switch. Bool parameters only; at most one per layout. */
    bool isBypass = false;
    /** Digits after the decimal point in valueToText(). Float parameters only. */
    int decimals = 2;
};

/**
 * @brief A single named, bounded parameter.
 *
 * Every parameter stores a float in [min, max]; Bool and Choice parameters are views over
 * that float (see ParameterKind).
 *
 * Threading: value(), setValue(), normalizedValue() and setNormalizedValue() are lock-free
 * and may be called from any thread, including the audio thread. Everything else is fixed
 * at construction. valueToText() and textToValue() allocate strings, so call them from the
 * host or UI thread, never from processBlock().
 */
class AudioProcessorParameter {
public:
    /**
     * @brief Constructs a Float parameter.
     * @param id            Unique machine-readable identifier. Never change it after the
     *                      plugin is released: DAW projects store automation by this id.
     * @param name          Human-readable display name.
     * @param min           Minimum value.
     * @param max           Maximum value; must be > min.
     * @param defaultValue  Initial value; must be in [min, max].
     * @param options       Step, unit and flags.
     * @throws std::invalid_argument on an empty id, an invalid range, step or flags.
     */
    AudioProcessorParameter(std::string id, std::string name, float min, float max,
                            float defaultValue, ParameterOptions options = {});

    /** @brief Constructs a Bool parameter (0 = off, 1 = on). */
    static std::unique_ptr<AudioProcessorParameter>
    makeBool(std::string id, std::string name, bool defaultValue, ParameterOptions options = {});

    /**
     * @brief Constructs a Choice parameter whose value is an index into @p choices.
     * @throws std::invalid_argument if fewer than two choices or the default is out of range.
     */
    static std::unique_ptr<AudioProcessorParameter> makeChoice(std::string id, std::string name,
                                                               std::vector<std::string> choices,
                                                               int defaultIndex,
                                                               ParameterOptions options = {});

    AudioProcessorParameter(const AudioProcessorParameter&) = delete;
    AudioProcessorParameter& operator=(const AudioProcessorParameter&) = delete;

    const std::string& id() const noexcept {
        return id_;
    }

    /** @brief Numeric ID derived from id(); see ParamId. */
    ParamId numericId() const noexcept {
        return numericId_;
    }

    const std::string& name() const noexcept {
        return name_;
    }

    ParameterKind kind() const noexcept {
        return kind_;
    }

    float min() const noexcept {
        return min_;
    }

    float max() const noexcept {
        return max_;
    }

    float defaultValue() const noexcept {
        return defaultValue_;
    }

    float step() const noexcept {
        return step_;
    }

    /** @brief Number of discrete steps between min and max; 0 = continuous. */
    int stepCount() const noexcept;

    const std::string& unit() const noexcept {
        return unit_;
    }

    bool isAutomatable() const noexcept {
        return automatable_;
    }

    bool isBypass() const noexcept {
        return isBypass_;
    }

    /** @brief Choice labels; empty unless kind() is Choice. */
    const std::vector<std::string>& choices() const noexcept {
        return choices_;
    }

    /** @brief Current value in [min, max]. */
    float value() const noexcept {
        return value_.load(std::memory_order_relaxed);
    }

    /** @brief Sets the value, clamped to [min, max] and snapped to the step. */
    void setValue(float value) noexcept;

    /** @brief Current value mapped to [0, 1]. */
    float normalizedValue() const noexcept {
        return toNormalized(value());
    }

    /** @brief Sets the value from [0, 1]; out-of-range input is clamped. */
    void setNormalizedValue(float normalized) noexcept {
        setValue(fromNormalized(normalized));
    }

    /** @brief Maps a plain value to [0, 1] (clamped and snapped first). */
    float toNormalized(float value) const noexcept;

    /** @brief Maps [0, 1] to a plain value in [min, max], snapped to the step. */
    float fromNormalized(float normalized) const noexcept;

    /** @brief Current value as Bool; true when >= 0.5. */
    bool boolValue() const noexcept {
        return value() >= 0.5f;
    }

    /** @brief Current value as a Choice index. */
    int choiceIndex() const noexcept;

    /**
     * @brief Display text for a plain value, without the unit.
     *
     * Float: fixed-point with options.decimals digits; Bool: "On"/"Off"; Choice: the label.
     * Locale-independent.
     */
    std::string valueToText(float value) const;

    /**
     * @brief Parses display text back to a plain value.
     *
     * Accepts what valueToText() produces, optionally followed by the unit. Bool also
     * accepts "1"/"0", "true"/"false"; Choice also accepts the index. Returns nothing if the
     * text cannot be parsed.
     */
    std::optional<float> textToValue(std::string_view text) const;

private:
    AudioProcessorParameter(ParameterKind kind, std::string id, std::string name, float min,
                            float max, float defaultValue, ParameterOptions options,
                            std::vector<std::string> choices);

    float snap(float value) const noexcept;

    std::string id_;
    ParamId numericId_;
    std::string name_;
    ParameterKind kind_;
    float min_;
    float max_;
    float defaultValue_;
    float step_;
    std::string unit_;
    bool automatable_;
    bool isBypass_;
    int decimals_;
    std::vector<std::string> choices_;
    std::atomic<float> value_;

    static_assert(std::atomic<float>::is_always_lock_free,
                  "parameter values must be lock-free for the audio thread");
};

/**
 * @brief Owns the plugin's parameters.
 *
 * Parameters are added once, while the processor is set up, and never removed; pointers and
 * references to them stay valid for the layout's lifetime. Adding is not thread-safe and
 * must finish before processing starts.
 *
 * String ids are part of the plugin's public contract: DAW projects store values and
 * automation by them (via numericId()). Never rename or reuse an id after release.
 */
class ParameterLayout {
public:
    ParameterLayout() = default;
    ParameterLayout(ParameterLayout&&) noexcept = default;
    ParameterLayout& operator=(ParameterLayout&&) noexcept = default;

    /**
     * @brief Adds a Float parameter; see AudioProcessorParameter for the arguments.
     * @throws std::invalid_argument if the id or its numeric ID is already used.
     */
    AudioProcessorParameter& addFloat(std::string id, std::string name, float min, float max,
                                      float defaultValue, ParameterOptions options = {});

    /** @brief Adds a Bool parameter. */
    AudioProcessorParameter& addBool(std::string id, std::string name, bool defaultValue,
                                     ParameterOptions options = {});

    /** @brief Adds a Choice parameter. */
    AudioProcessorParameter& addChoice(std::string id, std::string name,
                                       std::vector<std::string> choices, int defaultIndex,
                                       ParameterOptions options = {});

    /** @brief Number of parameters, in the order they were added. */
    std::size_t size() const noexcept {
        return params_.size();
    }

    AudioProcessorParameter& operator[](std::size_t index) noexcept {
        return *params_[index];
    }

    const AudioProcessorParameter& operator[](std::size_t index) const noexcept {
        return *params_[index];
    }

    /** @brief Parameter with the given string id, or nullptr. */
    AudioProcessorParameter* find(std::string_view id) noexcept;
    const AudioProcessorParameter* find(std::string_view id) const noexcept;

    /** @brief Parameter with the given numeric ID, or nullptr. */
    AudioProcessorParameter* findById(ParamId id) noexcept;
    const AudioProcessorParameter* findById(ParamId id) const noexcept;

    /**
     * @brief Parameter with the given string id.
     * @throws std::out_of_range if not found.
     */
    AudioProcessorParameter& get(std::string_view id);
    const AudioProcessorParameter& get(std::string_view id) const;

    /** @brief The bypass parameter, or nullptr if the plugin has none. */
    AudioProcessorParameter* bypass() noexcept;

private:
    AudioProcessorParameter& add(std::unique_ptr<AudioProcessorParameter> param);

    std::vector<std::unique_ptr<AudioProcessorParameter>> params_;
};

} // namespace aether
