# Git Conventions

Этот документ описывает рабочие правила по веткам, коммитам и pull request для `PrototypeIDE`.

## Модель работы

- Основная ветка: `main`
- Работа ведется в коротких ветках от `main`
- Изменения попадают в `main` через pull request

Прямые коммиты в `main` нежелательны.

## Именование веток

Формат:

```text
<type>/<issue-id>-<short-description>
```

Подходящие типы:

- `feature` - новая функциональность
- `fix` - исправление бага
- `chore` - инфраструктура, шаблоны, зависимости, конфиги
- `refactor` - переработка кода без изменения поведения
- `docs` - только документация
- `test` - добавление или правка тестов

Примеры:

```text
chore/1-repository-setup-and-standards
feature/12-add-visual-component-selection
fix/18-handle-missing-plugin-file
docs/21-update-framework-overview
```

## Коммиты

Используем `Conventional Commits`.

Формат:

```text
type(scope): short description
```

Скоуп опционален.

Разрешенные типы:

- `feat`
- `fix`
- `docs`
- `refactor`
- `test`
- `chore`
- `ci`
- `style`

Примеры:

```text
chore: add issue and pull request templates
docs: add repository coding standards
feat(ide): add file explorer selection sync
fix(framework): clamp parameter default value
```

## Pull Request

Каждый PR должен отвечать на 4 вопроса:

- Что изменено
- Зачем это изменено
- Как это проверить
- Какие есть ограничения или риски

Если меняется UI, желательно приложить скриншот или короткое описание сценария проверки.

## Размер изменений

- Предпочтительны небольшие PR с одной целью.
- Если задача затрагивает `Electron`, `framework` и документацию сразу, лучше разбить изменения на логические коммиты.
- Масштабные рефакторинги без функциональной цели нужно заранее согласовывать в issue или описании PR.
