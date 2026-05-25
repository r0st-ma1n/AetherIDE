# Contributing

Этот документ описывает, как вносить изменения в `PrototypeIDE` и что нужно проверить перед созданием `PR`.

## Scope

Основные части репозитория:

- `ide/` — desktop-приложение на `Electron` с renderer на `Vue 3 + TypeScript + Pinia + Vite`
- `ide/backend/` — нативная backend-часть IDE
- `framework/core/` — базовый фреймворк и общие аудио-абстракции
- `framework/core/examples/gain/` — пример использования framework API

Перед началом работы полезно прочитать:

- `docs/standards/architecture.md`
- `docs/standards/javascript-electron.md`

## Branching

Рекомендуемый формат веток:

- `feat/<issue>-short-name`
- `fix/<issue>-short-name`
- `refactor/<issue>-short-name`
- `chore/<issue>-short-name`

Примеры:

- `feat/5-port-react-prototype-to-vue3`
- `fix/12-code-editor-click-lock`

## Commit Messages

Предпочтительный формат:

```text
type(scope): short summary
```

Примеры:

```text
feat(ide): migrate core prototype flows to vue
fix(ide): restore file editor interaction
refactor(ide): move renderer state to pinia
chore: fix workflow checks
```

Рекомендуемые типы:

- `feat`
- `fix`
- `refactor`
- `chore`
- `ci`

## Local Setup

Установка frontend-зависимостей:

```bash
make ide-install
```

Запуск frontend в dev-режиме:

```bash
make ide-dev
```

Сборка frontend:

```bash
make ide-build
```

Запуск desktop-приложения:

```bash
make ide-start
```

Полный запуск с backend и frontend:

```bash
make run-all
```

## Quality Checks

Перед `PR` нужно прогнать минимум:

```bash
make ide-format-check
make ide-lint
make ide-typecheck
make ide-build
```

Общая проверка проекта:

```bash
make test
```

Важно:

- `make test` включает `cmake-configure` и `cmake-build`
- backend-сборка может зависеть от внешних зависимостей и сетевого доступа

## Frontend Rules

Для `ide/`:

- использовать `Vue 3 + TypeScript + Pinia`
- не дублировать состояние без явного source of truth
- renderer не должен использовать Node API напрямую
- filesystem и системные операции должны идти только через `preload`/IPC
- новые renderer-фичи по возможности добавлять в доменные модули, а не в случайные shared-файлы

## Electron Rules

- `main` отвечает за окно, menu, lifecycle и системные операции
- `preload` должен оставаться узким bridge-слоем
- новые IPC-каналы именовать в формате `domain:action`

Примеры:

```text
file:read
file:write
project:list-files
```

## Pull Requests

В каждом `PR` желательно:

- коротко описать, что изменено и зачем
- указать связанные issue
- описать сценарий ручной проверки
- приложить скриншоты для UI-изменений, либо явно описать результат

Перед merge нужно убедиться:

- форматирование проходит
- линт проходит
- typecheck проходит
- frontend собирается
- если затронут backend, `cmake` конфигурация и сборка тоже проходят

## When Updating Documentation

Обновляй документацию, если изменились:

- команды запуска или сборки
- структура проекта
- архитектурные границы
- workflow contribution / review

Минимальный список файлов, которые стоит проверить:

- `README.md`
- `CONTRIBUTING.md`
- `docs/standards/*.md`

## Reporting Issues

Если заводишь bug issue, полезно указать:

- что ожидалось
- что произошло фактически
- шаги воспроизведения
- затронутый файл, экран или модуль
- приложенный скриншот или лог, если проблема UI/runtime
