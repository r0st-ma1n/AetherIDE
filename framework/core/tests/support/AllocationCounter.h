#pragma once

#include <cstddef>

namespace aether::test {

/**
 * @brief Counts heap allocations made through global operator new.
 *
 * Works only in test executables linked with `aether_test_allocation_counter`, which
 * replaces the global allocation functions. Usage:
 *
 *     AllocationCounter counter;   // starts counting
 *     processor.processBlock(context);
 *     expectTrue(counter.count() == 0, "processBlock does not allocate");
 */
class AllocationCounter {
public:
    AllocationCounter() noexcept;
    ~AllocationCounter();

    AllocationCounter(const AllocationCounter&) = delete;
    AllocationCounter& operator=(const AllocationCounter&) = delete;

    /** @brief Allocations since construction, on any thread. */
    std::size_t count() const noexcept;

private:
    std::size_t start_;
};

} // namespace aether::test
