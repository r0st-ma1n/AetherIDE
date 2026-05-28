#pragma once

#include <string>
#include <vector>
#include <stdexcept>

namespace aether {

/**
 * @brief A single named, bounded floating-point parameter.
 *
 * Values are always clamped to [min, max] on every call to setValue().
 */
class AudioProcessorParameter {
public:
    /**
     * @brief Constructs a parameter with the given range and step.
     * @param id            Unique machine-readable identifier.
     * @param name          Human-readable display name.
     * @param min           Minimum allowed value.
     * @param max           Maximum allowed value (must be > min).
     * @param defaultValue  Initial value; must be in [min, max].
     * @param step          Smallest meaningful increment (0 = continuous).
     */
    AudioProcessorParameter(
        std::string id,
        std::string name,
        float min,
        float max,
        float defaultValue,
        float step = 0.0f
    );

    /** @brief Returns the unique machine-readable identifier. */
    const std::string& id() const;

    /** @brief Returns the human-readable display name. */
    const std::string& name() const;

    /** @brief Returns the minimum allowed value. */
    float min() const;

    /** @brief Returns the maximum allowed value. */
    float max() const;

    /** @brief Returns the default value supplied at construction. */
    float defaultValue() const;

    /** @brief Returns the step size (0 = continuous). */
    float step() const;

    /** @brief Returns the current value. */
    float value() const;

    /**
     * @brief Sets the current value, clamping to [min, max].
     * @param value  The desired new value.
     */
    void setValue(float value);

private:
    std::string id_;
    std::string name_;
    float min_;
    float max_;
    float defaultValue_;
    float step_;
    float value_;
};

/**
 * @brief Manages a flat collection of AudioProcessorParameter instances.
 */
class ParameterLayout {
public:
    /**
     * @brief Adds a new parameter to the layout.
     * @param id            Unique identifier.
     * @param name          Display name.
     * @param min           Minimum value.
     * @param max           Maximum value.
     * @param defaultValue  Initial value.
     * @param step          Step size (0 = continuous).
     */
    void addFloat(
        const std::string& id,
        const std::string& name,
        float min,
        float max,
        float defaultValue,
        float step = 0.0f
    );

    /**
     * @brief Returns the parameter with the given id.
     * @throws std::runtime_error if not found.
     */
    AudioProcessorParameter& getFloat(const std::string& id);

    /** @copydoc getFloat(const std::string&) */
    const AudioProcessorParameter& getFloat(const std::string& id) const;

    /** @brief Returns all parameters. */
    std::vector<AudioProcessorParameter>& floats();

    /** @copydoc floats() */
    const std::vector<AudioProcessorParameter>& floats() const;

private:
    std::vector<AudioProcessorParameter> floatParams_;
};

} // namespace aether
