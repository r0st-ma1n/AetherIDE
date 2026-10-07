#pragma once

#include <cmath>
#include <cstdlib>
#include <iostream>

namespace aether::test {

inline int& failureCount() {
    static int failures = 0;
    return failures;
}

inline void expectTrue(bool condition, const char* message) {
    if (!condition) {
        std::cerr << "FAIL: " << message << '\n';
        ++failureCount();
    }
}

inline void expectNear(float actual, float expected, float eps, const char* message) {
    if (std::fabs(actual - expected) > eps) {
        std::cerr << "FAIL: " << message << " (got " << actual << ", expected " << expected
                  << ")\n";
        ++failureCount();
    }
}

/** @brief Prints the summary and returns the process exit code for CTest. */
inline int finish(const char* testName) {
    if (failureCount() != 0) {
        std::cerr << testName << ": " << failureCount() << " assertion(s) failed\n";
        return EXIT_FAILURE;
    }
    std::cout << testName << ": ok\n";
    return EXIT_SUCCESS;
}

} // namespace aether::test
