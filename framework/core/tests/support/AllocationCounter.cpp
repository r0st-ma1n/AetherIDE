#include "AllocationCounter.h"

#include <atomic>
#include <cstdlib>
#include <new>

namespace {

std::atomic<std::size_t> allocations{0};

void* allocate(std::size_t size) {
    allocations.fetch_add(1, std::memory_order_relaxed);
    if (void* ptr = std::malloc(size == 0 ? 1 : size)) {
        return ptr;
    }
    throw std::bad_alloc();
}

} // namespace

namespace aether::test {

AllocationCounter::AllocationCounter() noexcept
    : start_(allocations.load(std::memory_order_relaxed)) {}

AllocationCounter::~AllocationCounter() = default;

std::size_t AllocationCounter::count() const noexcept {
    return allocations.load(std::memory_order_relaxed) - start_;
}

} // namespace aether::test

// Replacement global allocation functions (aligned overloads are left to the runtime).
void* operator new(std::size_t size) {
    return allocate(size);
}

void* operator new[](std::size_t size) {
    return allocate(size);
}

void* operator new(std::size_t size, const std::nothrow_t&) noexcept {
    try {
        return allocate(size);
    } catch (...) {
        return nullptr;
    }
}

void* operator new[](std::size_t size, const std::nothrow_t&) noexcept {
    try {
        return allocate(size);
    } catch (...) {
        return nullptr;
    }
}

void operator delete(void* ptr) noexcept {
    std::free(ptr);
}

void operator delete[](void* ptr) noexcept {
    std::free(ptr);
}

void operator delete(void* ptr, std::size_t) noexcept {
    std::free(ptr);
}

void operator delete[](void* ptr, std::size_t) noexcept {
    std::free(ptr);
}

void operator delete(void* ptr, const std::nothrow_t&) noexcept {
    std::free(ptr);
}

void operator delete[](void* ptr, const std::nothrow_t&) noexcept {
    std::free(ptr);
}
