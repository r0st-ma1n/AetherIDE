# AetherIDE

[![CI](https://github.com/r0st-ma1n/AetherIDE/actions/workflows/CI.yml/badge.svg)](https://github.com/r0st-ma1n/AetherIDE/actions/workflows/CI.yml)

[English](README.md) · **Русский**

Desktop-IDE для разработки аудио-плагинов. Интерфейс плагина собирается в визуальном
дизайнере, параметры объявляются в проекте, DSP пишется в `processBlock`, а C++-проект
вокруг него IDE генерирует сама — поверх собственного C++20-фреймворка Aether. Цель — из
одного проекта собирать VST3, CLAP и AU. Первым идёт VST3 под Windows.

<!-- Скриншот: docs/images/ide.png — дизайнер и редактор кода с открытым GainPlugin -->

## Возможности

- **Визуальный дизайнер UI.** Drag-and-drop виджетов (Knob, Slider, Button), групповое
  выделение, выравнивание и распределение, выделение рамкой, буфер обмена, Undo/Redo
  (Command Pattern, 100 шагов).
- **Двусторонняя синхронизация дизайнера и кода.** Дизайнер пишет C++ и разбирает
  отредактированный C++ обратно в макет. Свой код в сгенерированных файлах живёт в регионах
  `USER CODE` и переживает перегенерацию.
- **Кодогенерация из файла проекта.** `.aether` (JSON, валидация по JSON Schema через AJV)
  описывает метаданные плагина, параметры и UI. Из него IDE генерирует класс процессора, поля
  параметров, стандартный bypass и CMake-проект.
- **C++20-фреймворк, не привязанный к формату.** Ядро задаёт контракт плагина (процессор,
  параметры, состояние, шины, `PluginInfo`) и ничего не знает о форматах плагинов и API ОС.
  Каждый формат — тонкий адаптер.
- **VST3-адаптер.** Переводит вызовы VST3 в контракт: буферы хоста без копирования,
  стабильные ID параметров (FNV-1a от строкового id, автоматизация в DAW не ломается при
  смене порядка), сохранение и загрузка состояния. `aether_add_plugin(MyPlugin FORMATS VST3)`
  собирает бандл `.vst3`, который в тестах проверяется валидатором Steinberg.
- **Real-time safety.** Путь аудио-потока покрыт тестами, которые падают на любой аллокации
  в куче. Параметры атомарные, сглаживание — через `SmoothedValue`.
- **Headless-хост.** `aether_host` загружает модуль плагина и рендерит звук офлайн (синус
  или WAV на входе, WAV на выходе), так что плагин можно проверить без DAW.
- **Версионируемая зависимость от фреймворка.** Сгенерированный проект подключает фреймворк
  через CMake `FetchContent` с закреплённым тегом и собирается сам. IDE подставляет локальный
  checkout: сеть не нужна, правки фреймворка видны сразу.

## Архитектура

```
 Проект в IDE (.aether: метаданные, параметры, UI)
                  │ кодогенерация — не знает про форматы
                  ▼
 Код плагина: Processor + UI на API Aether
                  │
 framework/core     DSP-контракт, параметры, состояние, шины, PluginInfo
 framework/host     headless-хост для офлайн-рендера (aether_host)
 framework/formats  адаптеры форматов: vst3 (сейчас) · clap · au (в планах)
                  │
 aether_add_plugin(MyPlugin FORMATS VST3)
```

| Часть               | Стек                                                           |
| ------------------- | -------------------------------------------------------------- |
| IDE                 | Electron 42, Vue 3, TypeScript, Pinia, Vite, Monaco Editor     |
| Фреймворк           | C++20, CMake 3.22+, VST3 SDK 3.8 (MIT)                         |
| Качество            | Vitest, CTest, ESLint, vue-tsc, Prettier, clang-format         |
| CI (GitHub Actions) | lint, typecheck, unit-тесты, сборка frontend, сборка/тесты C++ |

## Как выглядит код плагина

Сгенерированный процессор из [samples/GainPlugin](samples/GainPlugin/). Всё вне регионов
`USER CODE` берётся из `GainPlugin.aether`:

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

## Статус

Разработка идёт по [docs/ROADMAP.md](docs/ROADMAP.md). Версии с тегами: `v0.1.0`, `v0.2.0`.

| Блок | Что                                           | Статус   |
| ---- | --------------------------------------------- | -------- |
| 0    | Автоматические проверки стандартов кода, CI   | готово   |
| A    | Ядро фреймворка, готовое к реальному хосту    | готово   |
| B    | Параметры в проекте, кодогенерация процессора | готово   |
| C    | VST3-адаптер и сборка бандла                  | готово   |
| D    | Сборка VST3 из IDE                            | в работе |
| E    | Проверка в DAW, релиз v1                      | в планах |
| F–H  | Собственное окно плагина, CLAP, macOS + AU    | после v1 |

v1 — плагин-эффект, собранный из IDE, который загружается в DAW, звучит, автоматизируется
и сохраняется вместе с проектом. Интерфейс параметров пока стандартный, от хоста. Пока
только Windows x64.

## Быстрый старт

Нужно: Node.js 20.19+, npm 9+, CMake 3.22+, компилятор C++20 (MSVC, GCC или Clang).

```bash
make ide-install   # зависимости IDE
make ide-dev       # запустить IDE (Electron + Vite HMR)

make cmake-configure && make cmake-build   # собрать фреймворк, хост и примеры
make test          # полная проверка: сборка и тесты C++, формат, lint, typecheck, тесты IDE
```

Прогнать звук через пример плагина без DAW:

```bash
aether_host --plugin <path>/gain_plugin.dll --sine 440 --duration 1 --param gain=0.25 --out out.wav
```

## Структура репозитория

```
framework/
  core/        контракт плагина, параметры, состояние, виджеты; тесты
  formats/vst3 VST3-адаптер, SDK, тесты
  host/        headless-хост aether_host
  cmake/       aether_add_plugin()
ide/
  electron/    main process и preload
  src/domains/ ui-designer, editor, files, workspace, templates, build
samples/       GainPlugin — пример проекта, открывается в IDE и собирается в CI
docs/          роадмап, стандарты, документация фреймворка и IDE
```

## Документация

- [Роадмап](docs/ROADMAP.md)
- Фреймворк: [контракт плагина](docs/framework/plugin-contract.md),
  [VST3-адаптер](docs/framework/vst3-adapter.md),
  [headless-хост](docs/framework/headless-host.md)
- IDE: [формат `.aether`](docs/ide/aether-format.md), [кодогенерация](docs/ide/codegen.md)
- Процесс: [git-соглашения](docs/GIT_CONVENTIONS.md),
  [стандарты кода](docs/CODING_STANDARDS.md), [как вносить изменения](CONTRIBUTING.md)

## Лицензия

Исходный код открыт для просмотра, все права защищены. Код можно читать и изучать, но
использовать, копировать, изменять и распространять его без разрешения нельзя. Подробнее —
[LICENSE](LICENSE). Сторонние компоненты, например VST3 SDK (MIT), распространяются под
своими лицензиями. VST — товарный знак Steinberg Media Technologies GmbH.
