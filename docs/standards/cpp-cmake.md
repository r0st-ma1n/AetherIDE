# C++ and CMake Standards

Стандарты для `framework/` и `samples/`.

## Назначение

- `framework/core` содержит переиспользуемые аудио-абстракции
- `samples/` содержит примеры проектов, которые открываются в IDE

Если код нужен только IDE, он живёт в `ide/` (TypeScript) и не попадает в framework API.

## Именование

- Классы и структуры: `PascalCase`
- Методы и переменные: `camelCase`
- Константы `constexpr`: `kPascalCase` или другой один выбранный проектом стиль, но единообразно
- Заголовки: `.h`
- Реализация: `.cpp`

## Правила по заголовкам

- Public API держать в `include/`
- Реализацию держать в `src/`
- Не добавлять лишние include в public headers
- По возможности предпочитать forward declarations там, где это не ухудшает читаемость
- Заголовок должен включать только то, что нужно для собственного интерфейса

## Правила по коду

- Один класс или одна тесно связанная сущность на файл, если нет явной причины иначе.
- Конструкторы и методы должны явно выражать инварианты объекта.
- Не использовать "магические" числовые значения в аудио-логике без именованной константы.
- Ошибочные состояния должны быть видны из API: через типы, проверки аргументов или документированные допущения.
- Пример из `examples/gain` должен оставаться минимальным и понятным.

## Работа с API framework

- Изменения в public headers считать API-изменениями.
- Перед расширением базовых абстракций сначала проверить, нельзя ли решить задачу на уровне примера или IDE backend.
- Если меняется контракт `PluginProcessor`, параметров или `ProcessContext`, нужно проверить пример `gain`, тест `plugin_contract_test` и обновить [plugin-contract.md](../framework/plugin-contract.md).

## Правила по CMake

- Использовать target-based подход.
- Не распространять compile options и include paths глобально без необходимости.
- Каждая новая цель должна явно описывать свои исходники и зависимости.
- Общие настройки задавать в одном месте, если они реально общие для всех target-ов.

## Форматирование и проверки

Стиль задаёт `.clang-format` в корне. Версия clang-format зафиксирована в `requirements-dev.txt`, чтобы локально и в CI форматирование совпадало:

```bash
pip install -r requirements-dev.txt
make cpp-format         # clang-format -i по всем отслеживаемым .cpp/.h
make cpp-format-check   # --dry-run --Werror (то же, что в CI)
```

Если `clang-format` не в `PATH`, путь можно передать: `make cpp-format-check CLANG_FORMAT=/path/to/clang-format`.

Сборка и тесты:

```bash
make cmake-configure
make cmake-build        # --config Release (BUILD_CONFIG=Debug для отладки)
make cmake-test         # ctest --output-on-failure
```

CI (`.github/workflows/CI.yml`) на каждый PR:

- проверяет формат C++ (`C++ format`);
- собирает все target-ы и гоняет CTest на `ubuntu-latest` (GCC) и `windows-latest` (MSVC).

PR с неотформатированным C++, ошибкой сборки на любой из платформ или упавшим тестом в `main` не попадает.

`clang-tidy` пока не подключён — вернёмся к нему, когда в `framework/core` появится больше кода.
