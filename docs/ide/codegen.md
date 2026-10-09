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

`CMakeLists.txt` нового проекта собирает `MODULE`-библиотеку из `<Name>Processor.cpp` и
`<Name>.cpp`. Проекты, созданные до B3, нужно поправить вручную по шаблону
`ide/src/domains/templates/assets/CMakeLists.txt.template`.
