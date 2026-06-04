# OurNewIDE - Architecture & Guidelines

## Project Vision
A modern IDE for creating VST3 and CLAP audio plugins. Features a visual WYSIWYG Drag&Drop interface that seamlessly generates and syncs C++ code in real-time.

## Tech Stack
*   **Audio Framework (`/framework`):** C++ (CMake). Foundation for compiling the actual VST3/CLAP plugins.
*   **IDE Frontend (`/ide`):** Web technologies (HTML/CSS/TS) wrapped in **Electron** (Node.js). Will use **Monaco Editor** for VS Code-like code editing. Electron's main process handles OS interactions and spawns the C++ CMake backend.
*   **IDE Native (`/ide/native`):** C++. Responsible for parsing code, generating C++ based on UI events, and invoking the CMake build system. Communicates with Electron via IPC.

## Design Principles
*   **Two-way Code Generation:** Dragging an element onto the canvas generates C++ code; editing C++ code (coordinates/properties) updates the canvas.
*   **Modern UX:** UI should feel responsive, native, and look like a professional tool (similar to VS Code).
*   **Separation of Concerns:** The audio framework knows nothing about the IDE. The IDE uses the framework as a library/template.

## Project Structure (Target)
```
/
├── framework/       # C++ Audio plugin framework and templates
├── ide/
│   ├── frontend/    # React/Vue/Vanilla UI + Monaco Editor
│   └── native/      # C++ native module: code generation, parsing, system interaction
└── CMakeLists.txt   # Root build script
```
