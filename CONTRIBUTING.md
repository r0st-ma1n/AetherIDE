# Contributing

Как вносить изменения в AetherIDE.

## Структура репозитория

- `ide/` — Electron-приложение с Vue 3 renderer
- `ide/native/` — C++ нативный модуль (IPC-мост)
- `framework/core/` — C++ Aether framework
- `framework/core/examples/gain/` — пример использования framework API
- `samples/GainPlugin/` — пример проекта, открываемого в IDE
- `docs/` — стандарты и правила разработки

Перед началом работы стоит прочитать:

- [docs/standards/architecture.md](docs/standards/architecture.md)
- [docs/GIT_CONVENTIONS.md](docs/GIT_CONVENTIONS.md)

## Локальная разработка

```bash
make ide-install   # установить зависимости
make ide-dev       # запустить Electron + Vite HMR
```

Сборка:

```bash
make ide-build     # собрать frontend
make cmake-configure && make cmake-build  # собрать C++ часть
make run-all       # собрать всё и запустить
```

## Проверки перед PR

```bash
make ide-format-check   # форматирование (Prettier)
make ide-lint           # линт (ESLint)
make ide-typecheck      # типы (vue-tsc)
make ide-test           # unit-тесты (Vitest)
make ide-build          # сборка frontend
```

Если затронута C++ часть (`framework/` или `ide/native/`):

```bash
make cmake-configure
make cmake-build
```

Всё сразу:

```bash
make test
```

## Правила для IDE (Vue/TypeScript)

- Использовать Vue 3 Composition API (`<script setup>`)
- Не использовать Node API в renderer — только через preload/IPC
- Новые фичи добавлять в соответствующий домен (`src/domains/`)
- Состояние — через Pinia stores

## Правила для Electron

- `main` — окно, lifecycle, системные операции
- `preload` — узкий bridge, только необходимое
- IPC-каналы именовать в формате `domain:action`

## Pull Request

В каждом PR:

- кратко описать что изменено и зачем
- указать связанные issue (`Closes #N`)
- описать сценарий ручной проверки
- для UI-изменений — приложить скриншот

## Если нашёл баг

В issue укажи:

- ожидаемое поведение
- фактическое поведение
- шаги воспроизведения
- затронутый файл, экран или модуль
- скриншот или лог (если применимо)
