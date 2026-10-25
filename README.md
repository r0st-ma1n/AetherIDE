# AetherIDE

[![CI](https://github.com/r0st-ma1n/AetherIDE/actions/workflows/CI.yml/badge.svg)](https://github.com/r0st-ma1n/AetherIDE/actions/workflows/CI.yml)

**English** · [Русский](README.ru.md)

A desktop IDE for building audio plugins. You lay out the plugin UI in a visual designer,
declare parameters, write DSP in `processBlock`, and the IDE generates the C++ project around
it on top of Aether, its own C++20 plugin framework. The end goal is to build VST3, CLAP and
AU from one project. VST3 on Windows comes first.

<!-- Screenshot: docs/images/ide.png — designer + code editor with GainPlugin open -->

## Highlights

- **Visual UI designer.** Drag-and-drop widgets (Knob, Slider, Button), multi-select,
  align/distribute, rubber-band selection, clipboard, undo/redo (Command pattern, 100 steps).
- **Two-way designer ↔ code sync.** The designer writes C++ and parses edited C++ back into
  the layout. Generated files keep user code inside `USER CODE` regions across regeneration.
- **Code generation from a project file.** `.aether` (JSON, validated with JSON Schema/AJV)
  describes plugin metadata, parameters and UI. The IDE produces the processor class,
  parameter fields, a standard bypass parameter and the CMake project.
- **Format-agnostic C++20 framework.** The core defines the plugin contract (processor,
  parameters, state, buses, `PluginInfo`) and knows nothing about plugin formats or OS APIs.
  Each format is a thin adapter.
- **VST3 adapter.** It maps VST3 calls onto the contract with zero-copy host buffers, stable
  parameter IDs (FNV-1a of the string id, so DAW automation survives reordering) and state
  save/restore. `aether_add_plugin(MyPlugin FORMATS VST3)` builds the `.vst3` bundle, which
  is checked with Steinberg's validator in tests.
- **Real-time safety.** The audio-thread path is covered by tests that fail on any heap
  allocation. Parameters are atomic, and `SmoothedValue` handles smoothing.
- **Headless host.** `aether_host` loads a plugin module and renders audio offline (sine or
  WAV in, WAV out), so plugins can be tested without a DAW.
- **Versioned framework dependency.** A generated project pulls the framework through CMake
  `FetchContent` pinned to a tag, so it builds on its own. The IDE points it at the local
  checkout, so it builds offline and framework edits show up right away.

## Architecture

```
 IDE project (.aether: metadata, parameters, UI)
                  │ code generation — format-agnostic
                  ▼
 Plugin code: Processor + UI on the Aether API
                  │
 framework/core     DSP contract, parameters, state, buses, PluginInfo
 framework/host     headless offline host (aether_host)
 framework/formats  format adapters: vst3 (now) · clap · au (planned)
                  │
 aether_add_plugin(MyPlugin FORMATS VST3)
```

| Part                | Stack                                                       |
| ------------------- | ----------------------------------------------------------- |
| IDE                 | Electron 42, Vue 3, TypeScript, Pinia, Vite, Monaco Editor  |
| Framework           | C++20, CMake 3.22+, VST3 SDK 3.8 (MIT)                      |
| Quality             | Vitest, CTest, ESLint, vue-tsc, Prettier, clang-format      |
| CI (GitHub Actions) | lint, typecheck, unit tests, frontend build, C++ build/test |

## What plugin code looks like

The generated processor for [samples/GainPlugin](samples/GainPlugin/). Everything outside
`USER CODE` regions comes from `GainPlugin.aether`:

```cpp
GainPluginProcessor::GainPluginProcessor() {
    gainParameter_ = &parameters_.addFloat("gain", "Gain", 0.0f, 2.0f, 1.0f);
    addBypassParameter();
}

void GainPluginProcessor::processBlock(aether::ProcessContext& context) {
    // --- USER CODE BEGIN: ProcessBlock ---
    gain_.setTarget(gainParameter_->value());
    auto& output = context.output;
    for (int i = 0; i < output.numSamples(); ++i) {
        const float gain = gain_.next();
        for (int ch = 0; ch < output.numChannels(); ++ch) {
            const float in = ch < context.input.numChannels() ? context.input.channel(ch)[i] : 0.0f;
            output.channel(ch)[i] = in * gain;
        }
    }
    // --- USER CODE END: ProcessBlock ---
}

AETHER_PLUGIN(GainPluginProcessor)
```

## Status

Development follows [docs/ROADMAP.md](docs/ROADMAP.md). Tagged versions: `v0.1.0`, `v0.2.0`.

| Block | Scope                                        | Status      |
| ----- | -------------------------------------------- | ----------- |
| 0     | Automated code-standard checks, CI           | done        |
| A     | Framework core ready for a real host         | done        |
| B     | Parameters in the project, processor codegen | done        |
| C     | VST3 adapter and bundle build                | done        |
| D     | Building VST3 from the IDE                   | in progress |
| E     | DAW verification, v1 release                 | planned     |
| F–H   | Custom plugin window, CLAP, macOS + AU       | after v1    |

v1 is an effect plugin built from the IDE that loads, plays, automates and saves in a DAW.
It uses the host's generic parameter UI. Windows x64 only for now.

## Getting started

Requirements: Node.js 20.19+, npm 9+, CMake 3.22+, a C++20 compiler (MSVC, GCC or Clang).

```bash
make ide-install   # install IDE dependencies
make ide-dev       # run the IDE (Electron + Vite HMR)

make cmake-configure && make cmake-build   # build the framework, host and samples
make test          # full check: C++ build and tests, formatting, lint, typecheck, IDE tests
```

Render audio through the sample plugin without a DAW:

```bash
aether_host --plugin <path>/gain_plugin.dll --sine 440 --duration 1 --param gain=0.25 --out out.wav
```

## Repository layout

```
framework/
  core/        plugin contract, parameters, state, widgets; tests
  formats/vst3 VST3 adapter, bundled SDK, tests
  host/        headless host aether_host
  cmake/       aether_add_plugin()
ide/
  electron/    main process and preload
  src/domains/ ui-designer, editor, files, workspace, templates, build
samples/       GainPlugin — example project opened in the IDE and built in CI
docs/          roadmap, standards, framework and IDE docs
```

## Documentation

The detailed docs are in Russian.

- [Roadmap](docs/ROADMAP.md)
- Framework: [plugin contract](docs/framework/plugin-contract.md),
  [VST3 adapter](docs/framework/vst3-adapter.md),
  [headless host](docs/framework/headless-host.md)
- IDE: [`.aether` format](docs/ide/aether-format.md), [code generation](docs/ide/codegen.md)
- Process: [git conventions](docs/GIT_CONVENTIONS.md),
  [coding standards](docs/CODING_STANDARDS.md), [contributing](CONTRIBUTING.md)

## License

Source-available, all rights reserved. You may view and study the code, but you may not
use, copy, modify or redistribute it without permission. See [LICENSE](LICENSE).
Third-party components, such as the VST3 SDK (MIT), keep their own licenses.
VST is a trademark of Steinberg Media Technologies GmbH.
