#include "aether/host/HostCli.h"

#include <iostream>
#include <string>
#include <vector>

int main(int argc, char** argv) {
    const std::vector<std::string> args(argv + 1, argv + argc);
    return aether::host::runHost(args, std::cout, std::cerr);
}
