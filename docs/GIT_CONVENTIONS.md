# Git Conventions

Правила по веткам, коммитам и pull request для AetherIDE.

## Модель работы

- Основная ветка: `main`
- Работа ведётся в коротких ветках от `main`
- Изменения попадают в `main` только через pull request

Прямые коммиты в `main` запрещены.

## Именование веток

Формат:

```
<type>/<issue-id>-<короткое-описание>
```

Допустимые типы — те же, что и в коммитах:

| Тип        | Когда использовать                   |
| ---------- | ------------------------------------ |
| `feat`     | новая функциональность               |
| `fix`      | исправление бага                     |
| `refactor` | переработка без изменения поведения  |
| `chore`    | зависимости, конфиги, инфраструктура |
| `docs`     | только документация                  |
| `test`     | тесты                                |
| `ci`       | CI/CD пайплайн                       |

Примеры:

```
feat/12-visual-component-selection
fix/18-handle-missing-plugin-file
refactor/35-project-structure
chore/7-add-prettier
docs/21-update-architecture
```

## Коммиты

Используем [Conventional Commits](https://www.conventionalcommits.org/).

Формат:

```
<type>(<scope>): <короткое описание>
```

Scope опционален. Описание — в нижнем регистре, без точки в конце.

Примеры:

```
feat(ui-designer): add multi-select alignment tools
fix(editor): restore file save on Ctrl+S
refactor(workspace): move tab state to pinia store
chore: enforce LF line endings via .gitattributes
docs: update architecture module boundaries
ci: add format-check step to workflow
```

### Правила

- Первая строка — не длиннее 72 символов
- Если нужен контекст — добавь тело через пустую строку
- Ссылки на issue в теле: `Closes #12`, `Refs #34`
- Не описывай КАК сделано — описывай ЧТО и ЗАЧЕМ

## Pull Request

Описание PR — по шаблону `.github/pull_request_template.md`, коротко и по делу:

- **Что и зачем** — 1–3 пункта и ссылка на issue (`Closes #N` / `Refs #N`)
- **Как проверить** — воспроизводимые шаги
- **Чек-лист** — только применимые пункты, отмечены только выполненные

Правила оформления:

- В описании только то, что реально сделано в этом PR. Незавершённое и планы — в комментарий к issue, не в PR.
- Без смайликов, в том числе в заголовках.
- Без приписок генераторов («Generated with ...») в PR и без `Co-Authored-By` и подобных трейлеров в коммитах.
- Без пересказа диффа и общих слов: ревьюер видит код, описание объясняет то, чего из кода не видно.
- Известные риски — одной строкой в «Что и зачем», если они есть.

Для UI-изменений — скриншот или описание визуального результата обязательны.

### Чеклист перед merge

```bash
make ide-format-check   # форматирование
make ide-lint           # линт
make ide-typecheck      # типы
make ide-test           # unit-тесты
make ide-build          # сборка frontend
```

Если затронута C++ часть:

```bash
make cmake-configure
make cmake-test        # сборка + CTest
make cpp-format-check
```

Или всё сразу:

```bash
make test
```

## Размер изменений

- Предпочтительны небольшие PR с одной чётко обозначенной целью
- Если задача одновременно затрагивает IDE, framework и документацию — разбивай на логические коммиты внутри одного PR
- Масштабный рефакторинг без функциональной цели нужно согласовывать в issue заранее
