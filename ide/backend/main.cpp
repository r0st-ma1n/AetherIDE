#include <iostream>
#include <fstream>
#include <string>
#include <vector>

void addComponentToCode(const std::string& componentType, int x, int y, const std::string& filePath) {
    // This is a naive implementation for the prototype.
    // In a real scenario, we'd use Clang libtooling or tree-sitter to parse the C++ AST safely.
    
    std::ifstream fileIn(filePath);
    if (!fileIn.is_open()) {
        std::cerr << "Error: Could not open file " << filePath << std::endl;
        return;
    }

    std::vector<std::string> lines;
    std::string line;
    while (std::getline(fileIn, line)) {
        lines.push_back(line);
    }
    fileIn.close();

    bool foundSetupUI = false;
    std::vector<std::string> newLines;

    for (const auto& l : lines) {
        newLines.push_back(l);
        if (l.find("void GainPlugin::setupUI()") != std::string::npos) {
            foundSetupUI = true;
            // Generate a unique ID (very naive approach for prototype)
            static int id_counter = 0;
            id_counter++;
            std::string id = componentType + "_" + std::to_string(id_counter);
            newLines.push_back("    auto* " + id + " = new " + componentType + "(" + std::to_string(x) + ", " + std::to_string(y) + ");");
        }
    }

    if (!foundSetupUI) {
        std::cerr << "Error: Could not find setupUI() method in " << filePath << std::endl;
        return;
    }

    std::ofstream fileOut(filePath);
    for (const auto& l : newLines) {
        fileOut << l << std::endl;
    }
    
    std::cout << "SUCCESS: Added " << componentType << " at (" << x << ", " << y << ")" << std::endl;
}

int main(int argc, char* argv[]) {
    if (argc < 2) {
        std::cerr << "Usage: ide_backend <command> [args...]\n"
                  << "Commands:\n"
                  << "  generate <ComponentType> <X> <Y> <FilePath>\n"
                  << "  build <BuildDirectory>\n";
        return 1;
    }

    std::string command = argv[1];

    if (command == "generate") {
        if (argc < 6) {
            std::cerr << "Error: Missing arguments for generate command." << std::endl;
            return 1;
        }
        std::string componentType = argv[2];
        int x = std::stoi(argv[3]);
        int y = std::stoi(argv[4]);
        std::string filePath = argv[5];

        addComponentToCode(componentType, x, y, filePath);
    } else if (command == "build") {
        if (argc < 3) {
            std::cerr << "Error: Missing build directory." << std::endl;
            return 1;
        }
        std::string buildDir = argv[2];
        std::cout << "Invoking CMake build in " << buildDir << "..." << std::endl;
        
        // Execute CMake via system command
        std::string cmakeCmd = "cmake --build " + buildDir;
        int result = system(cmakeCmd.c_str());
        
        if (result == 0) {
            std::cout << "SUCCESS: Build finished." << std::endl;
        } else {
            std::cerr << "ERROR: Build failed with code " << result << std::endl;
        }
    } else {
        std::cerr << "Error: Unknown command '" << command << "'" << std::endl;
        return 1;
    }

    return 0;
}