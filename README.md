# AetherIDE

Визуальная IDE для разработки аудио-плагинов. Позволяет собирать интерфейс плагина через drag-and-drop и автоматически генерирует синхронизированный C++ код.

> Проприетарное программное обеспечение. Не предназначено для публичного распространения или использования третьими лицами.

## Что это

AetherIDE — desktop-приложение на Electron с визуальным дизайнером UI, встроенным редактором кода (Monaco) и собственным C++ фреймворком для аудио-плагинов (Aether).

Ключевые возможности:

- Drag-and-drop редактор компонентов (Knob, Slider, Button) на canvas
- Выделение нескольких компонентов, выравнивание и распределение группой
- Clipboard (Copy / Paste / Cut) и выделение рамкой (Ctrl+A)
- Undo / Redo (Command Pattern, стек до 100 шагов)
- Двусторонняя синхронизация: изменения в дизайнере генерируют C++ код и наоборот
- Встроенный Monaco Editor с подсветкой синтаксиса C++
- Файловый проводник с live-обновлением
- Валидация проектных файлов `.aether` по JSON Schema (AJV)
- Собственный C++ фреймворк Aether для написания аудио-плагинов

## Стек

| Слой | Технологии |
|---|---|
| IDE UI | Vue 3, TypeScript, Pinia, Vite, Monaco Editor |
| Desktop | Electron 42 |
| C++ native | CMake, C++20 |
| Audio framework | Aether (собственный) |

## Требования

- Node.js 18+
- npm 9+
- CMake 3.22+
- C++20 компилятор (MSVC, GCC, Clang)

## Установка и запуск

```bash
# Установить зависимости
make ide-install

# Запустить в режиме разработки (Electron + Vite HMR)
make ide-dev
```

Остальные команды:

```bash
make ide-build          # собрать frontend
make ide-start          # запустить Electron без dev-сервера
make cmake-configure    # сконфигурировать C++ часть
make cmake-build        # собрать C++ часть
make run-all            # собрать всё и запустить
make test               # полная проверка проекта
```

## Структура проекта

```
AetherIDE/
├── framework/
│   └── core/               # C++ Aether framework
│       ├── include/aether/ # публичный API
│       ├── src/
│       └── examples/gain/  # пример плагина
├── ide/
│   ├── electron/           # Electron main process и preload
│   ├── native/             # C++ нативный модуль (IPC-мост)
│   ├── src/
│   │   ├── app/            # shell верхнего уровня
│   │   ├── domains/        # фичи по доменам:
│   │   │   ├── editor/     #   Monaco Editor
│   │   │   ├── files/      #   файловый проводник
│   │   │   ├── templates/  #   шаблоны проектов
│   │   │   └── ui-designer/#   визуальный дизайнер
│   │   └── shared/         # общие типы, утилиты, схемы
│   └── ...конфиги
├── samples/
│   └── GainPlugin/         # пример проекта для IDE
├── docs/                   # стандарты и правила разработки
├── CMakeLists.txt
└── Makefile
```

## Документация

- [docs/GIT_CONVENTIONS.md](docs/GIT_CONVENTIONS.md) — ветки, коммиты, PR
- [docs/CODING_STANDARDS.md](docs/CODING_STANDARDS.md) — общие правила по коду
- [docs/standards/architecture.md](docs/standards/architecture.md) — границы модулей
- [docs/standards/javascript-electron.md](docs/standards/javascript-electron.md) — стандарты для Vue/Electron части
- [docs/standards/cpp-cmake.md](docs/standards/cpp-cmake.md) — стандарты для C++/CMake части
- [CONTRIBUTING.md](CONTRIBUTING.md) — как вносить изменения

## Лицензия

Copyright © 2026 r0st. Все права защищены. Исходный код является коммерческой тайной и не подлежит распространению.
