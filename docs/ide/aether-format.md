# Формат проекта `.aether`

`.aether` — JSON-файл в корне проекта плагина. Он описывает плагин целиком: метаданные,
параметры и интерфейс. Из него генерируется код процессора и UI (блок B3 в
[ROADMAP.md](../ROADMAP.md)).

Схема: `ide/src/shared/schemas/aetherProject.schema.json`. Типы:
`AetherProject` в `ide/src/shared/types/index.ts`.

## Пример

```json
{
  "version": 2,
  "plugin": {
    "name": "GainPlugin",
    "vendor": "Aether",
    "id": "dev.aether.samples.gain",
    "version": "1.0.0",
    "category": "Effect"
  },
  "parameters": [
    {
      "id": "gain",
      "name": "Gain",
      "type": "float",
      "min": 0,
      "max": 2,
      "default": 1
    }
  ],
  "components": [],
  "canvasWidth": 600,
  "canvasHeight": 400
}
```

## Поля верхнего уровня

| Поле                          | Обязательное | Что это                                                 |
| ----------------------------- | ------------ | ------------------------------------------------------- |
| `version`                     | да           | Версия схемы, сейчас `2`                                |
| `plugin`                      | да           | Метаданные плагина → `aether::PluginInfo`               |
| `parameters`                  | да           | Параметры → `aether::AudioProcessorParameter`           |
| `components`                  | да           | Виджеты дизайнера                                       |
| `canvasWidth`, `canvasHeight` | нет          | Размер холста дизайнера, 100–2000 px, по умолч. 600×400 |

## `plugin`

| Поле           | Обязательное | Правило                                                              |
| -------------- | ------------ | -------------------------------------------------------------------- |
| `name`         | да           | Непустая строка                                                      |
| `vendor`       | да           | Непустая строка                                                      |
| `id`           | да           | Reverse-DNS: буквы, цифры, `.`, `-`, `_`. **Не менять после релиза** |
| `version`      | да           | `major.minor.patch`, без ведущих нулей                               |
| `category`     | да           | `Effect` или `Instrument` (во фреймворке v1 — только `Effect`)       |
| `url`, `email` | нет          | Строки                                                               |

## `parameters`

Общие поля: `id`, `name`, `type`, `default`. `id` начинается с буквы, дальше буквы,
цифры, `_`, `.`, `-`; уникален в проекте. **Не менять после релиза** — по нему DAW
хранит автоматизацию (см. [plugin-contract.md](../framework/plugin-contract.md)).

| `type`   | Поля                                        | `default`            |
| -------- | ------------------------------------------- | -------------------- |
| `float`  | `min`, `max`, `step?`, `unit?`              | число в `[min, max]` |
| `bool`   | —                                           | `true` / `false`     |
| `choice` | `choices` — не меньше двух уникальных строк | индекс в `choices`   |

Для `float`: `min < max`; `step` (0 или нет — непрерывный) не больше `max - min`,
`max - min` кратно `step`, `default` лежит на сетке шага. Поля чужого типа запрещены.
Те же правила проверяет фреймворк при создании параметров — IDE ловит ошибку раньше.

JSON Schema проверяет структуру, остальное (уникальность, диапазоны, шаг) —
`validateAetherProject`. Ошибки приходят в виде `/parameters/0/default: ...`.

## `components`

Виджет: `type` (`Knob`, `Slider`, `Button`), `id`, `x`, `y`, `width`, `height` и
`properties`. В `properties` лежат необязательные `min`, `max`, `default`, `step`,
`color` и `parameterId` — id параметра, которым управляет виджет. `parameterId` должен
ссылаться на существующий параметр. В коде он хранится в маркере `// AETHER ... param=<id>`.

Кнопка привязывается к `bool`, ручка и слайдер — к `float` или `choice`. У привязанного
виджета диапазон берётся из параметра, собственные `min`/`max` в инспекторе скрыты.

## Версии и миграция

Файл со старой версией мигрирует при открытии (`migrateAetherProject`), на диск
записывается текущая версия при следующем сохранении. Файл с версией новее, чем знает
IDE, не открывается.

| Версия | Что изменилось                                                                                                                                                          |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0      | Без `version`; `properties` у виджетов может не быть                                                                                                                    |
| 1      | `version`, `components`, `canvasWidth/Height`, `pluginType`                                                                                                             |
| 2      | `plugin` и `parameters`. `pluginType` → `plugin.category`; при миграции `name` — имя файла, `vendor` — `My Company`, `id` — `com.mycompany.<name>`, `parameters` пустой |

Новая версия схемы: поднять `CURRENT_AETHER_SCHEMA_VERSION` в `migrateAetherProject.ts`
и в `electron/main/projectMarker.cjs`, добавить шаг миграции, обновить схему, этот
документ и `samples/GainPlugin/GainPlugin.aether`.

## Сохранение

Дизайнер меняет `components`, размер холста и `parameters` (панель Parameters); `plugin`
переписывается как есть. Все изменения параметров и привязок отменяются через Undo/Redo.
Смена `id` параметра переносит привязки виджетов на новый id, удаление параметра
отвязывает виджеты; в обоих случаях IDE сначала предупреждает.

Редактор кода меняет только `components` (из маркеров `// AETHER`). Если существующий
`.aether` не проходит валидацию, редактор кода его не перезаписывает.
