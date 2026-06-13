# JavaScript / TypeScript и Electron

Стандарты для кода в `ide/`.

## Стек

- **Renderer**: Vue 3 (Composition API), TypeScript, Pinia, Vite
- **Main process**: Electron (`ide/electron/main/index.cjs`)
- **Preload**: Electron contextBridge (`ide/electron/preload/index.cjs`)
- **Editor**: Monaco Editor
- **Тесты**: Vitest

## Структура ответственности

| Слой | Файлы | Отвечает за |
|---|---|---|
| Main process | `electron/main/` | окно, lifecycle, меню, IPC-handlers, файловая система |
| Preload | `electron/preload/` | безопасный bridge между main и renderer |
| Renderer | `src/` | UI, состояние интерфейса, логика доменов |

Если код требует Node API, `fs`, дочерних процессов или системных вызовов — он не должен появляться в renderer напрямую. Всё через preload/IPC.

## Структура `src/`

Renderer организован по доменам:

```
src/
├── app/            # AppShell, layout верхнего уровня
├── domains/        # фичи, разбитые по предметным областям
│   ├── editor/     # Monaco-редактор
│   ├── files/      # файловый проводник
│   ├── templates/  # шаблоны плагинов
│   ├── ui-designer/# визуальный дизайнер
│   └── workspace/  # вкладки и рабочее пространство
└── shared/         # общие типы, утилиты, схемы
```

Новую фичу добавляй в соответствующий домен, а не в `shared`. В `shared` — только то, что реально нужно нескольким доменам.

Каждый домен содержит:

```
<domain>/
├── components/   # Vue-компоненты
├── lib/          # чистые функции (без side effects)
└── stores/       # Pinia stores
```

## Vue 3

- Использовать только Composition API (`<script setup>`)
- Состояние — через Pinia stores, не через `provide/inject` или props-drilling
- Вычисляемые значения — `computed()`, не методы
- Реактивные коллекции — `ref<T[]>`, не `reactive`
- Компоненты именовать в `PascalCase`, файлы — тоже

## TypeScript

- `strict: true` — обязателен
- Не использовать `any`; если тип неизвестен — `unknown` с явной проверкой
- Экспортировать типы через `export type`, не `export`
- Общие типы домена держать в `shared/types/index.ts`

## Pinia

- Один store на домен или логическую сущность
- Stores — в `stores/` внутри домена
- Экспортировать только через `use<Name>Store()`
- Не хранить производные данные — использовать `computed`

## IPC-каналы

Формат: `domain:action`

```
file:read
file:write
project:list-files
```

Каждый новый IPC-канал должен быть:
1. зарегистрирован в `electron/main/index.cjs` через `ipcMain.handle`
2. проброшен в `electron/preload/index.cjs` через `contextBridge`
3. типизирован на стороне renderer

## Безопасность Electron

- `contextIsolation: true`, `nodeIntegration: false` — не менять
- Preload API должен быть минимальным: только то, что реально нужно renderer
- Не пробрасывать универсальный `fs` или `shell` "на всякий случай"

## Форматирование и линт

```bash
make ide-format        # Prettier --write
make ide-format-check  # Prettier --check (в CI)
make ide-lint          # ESLint
make ide-typecheck     # vue-tsc
```

Конфиги: `.prettierrc.json` (корень), `eslint.config.mjs` (ide/).
