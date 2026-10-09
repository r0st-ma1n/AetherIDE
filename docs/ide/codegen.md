# Генерация кода из `.aether`

При сохранении в дизайнере IDE пересобирает исходники проекта `<Name>` из `<Name>.aether`.
Генератор: `ide/src/domains/ui-designer/lib/processorGenerator.ts` (процессор) и
`codeGenerator.ts` (UI); шаблоны — `ide/src/domains/templates/assets/`.

| Файл                     | Что внутри                                                    |
| ------------------------ | ------------------------------------------------------------- |
| `<Name>Processor.h/.cpp` | Класс `<Name>Processor` — наследник `aether::PluginProcessor` |
| `<Name>.h/.cpp`          | Класс `<Name>UI` с виджетами дизайнера                        |

Пример — `samples/GainPlugin/`: его собирает CI, а `gain_sample_*` в ctest грузят модуль
через `aether_host`. Тест `processorGenerator.test.ts` проверяет, что sample совпадает с
тем, что выдаёт генератор.

## Процессор

Генерируется из `.aether`:

- `pluginInfo()` — из раздела `plugin` (см. [aether-format.md](./aether-format.md));
- конструктор — по параметру на запись `parameters`: `addFloat` / `addBool` / `addChoice`,
  указатель сохраняется в поле `<id>Parameter_` (`mix.a` → `mix_aParameter_`; при
  совпадении имён — `mix_a2Parameter_`);
- `AETHER_PLUGIN(<Name>Processor)`.

Свой код пишется только внутри регионов `USER CODE`, остальное перезаписывается:

| Регион                                              | Где                                    |
| --------------------------------------------------- | -------------------------------------- |
| `Includes`, `PublicMethods`, `PrivateMembers`       | `.h`                                   |
| `Constructor`                                       | конструктор, после создания параметров |
| `PrepareToPlay`, `ProcessBlock`, `ReleaseResources` | одноимённые методы                     |
| `CustomMethods`                                     | конец `.cpp`                           |

В новом проекте `ProcessBlock` копирует вход в выход. Правила аудиопотока —
[plugin-contract.md](../framework/plugin-contract.md).

Смена `id` параметра меняет имя поля: код в регионах, который его использует, перестанет
компилироваться — поправьте имя вручную.

`category: Instrument` даёт `#error` в `.cpp`: фреймворк v1 собирает только эффекты.

## UI

Виджет с `parameterId` привязывается к параметру:
`knob.setParameter(processor.getParameter("gain"))`. Класс `<Name>UI` компилируется в
модуль плагина, но до собственного окна плагина (блок F) не используется.

## Сборка

`CMakeLists.txt` нового проекта (шаблон
`ide/src/domains/templates/assets/CMakeLists.txt.template`):

- подключает фреймворк через `FetchContent` с `GIT_TAG v<версия IDE>` и
  `SOURCE_SUBDIR framework`, проверяет `AETHER_VERSION` не ниже нужной;
- собирает `MODULE`-библиотеку из `<Name>Processor.cpp` и `<Name>.cpp`;
- добавляет ctest `<Name>_loads` и `<Name>_renders`: плагин грузится в `aether_host` и
  обрабатывает звук.

IDE при сборке передаёт `-DFETCHCONTENT_SOURCE_DIR_AETHER=<корень репозитория AetherIDE>`:
сеть не нужна, используется фреймворк, с которым запущена IDE. Путь должен вести в корень
репозитория, а не в `framework/` — `SOURCE_SUBDIR` применяется и к нему; при ошибке
configure сообщает об этом.

Без IDE проект скачивает фреймворк по тегу. Версия фреймворка — `project(Aether VERSION)`
в `framework/CMakeLists.txt` и `AETHER_FRAMEWORK_VERSION` в
`ide/src/shared/lib/frameworkVersion.ts` (тест следит, чтобы они совпадали).

Новый проект из мастера стартует с параметром `gain` (0–2) и `processBlock`, который его
применяет. `samples/GainPlugin` совпадает с таким проектом; CI собирает его и в монорепо,
и как отдельный проект.

Проекты, созданные до B4, нужно поправить вручную по шаблону.
