# VST3 SDK во фреймворке

## Лицензия

Проверено 2026-10-10. С версии 3.8 (октябрь 2025) Steinberg распространяет VST3 SDK под
**MIT License** — у корня репозитория и у подмодулей `base`, `pluginterfaces`,
`public.sdk`. Прежняя двойная лицензия (GPLv3 / Steinberg proprietary) больше не действует.

Что из этого следует:

- SDK можно хранить в нашем репозитории и распространять вместе с фреймворком;
- коммерческие и закрытые плагины разрешены;
- текст лицензии и копирайт Steinberg должны сохраняться: они лежат в
  `framework/formats/vst3/sdk/LICENSE.txt` и в `LICENSE.txt` подмодулей. В документации к
  плагину, распространяемому в бинарном виде, нужно приводить этот текст;
- логотип VST и название «VST» регулируются отдельно —
  [VST Usage Guidelines](https://www.steinberg.net/developers/) Steinberg, не MIT.

Источники: [README репозитория SDK](https://github.com/steinbergmedia/vst3sdk),
[объявление Steinberg о VST 3.8](https://forums.steinberg.net/t/vst-3-8-0-sdk-released/1011988).

## Что лежит в `framework/formats/vst3/sdk`

Версия — в `sdk/VERSION` (сейчас `v3.8.1_build_84`). Скопированы только нужные части:

| Путь                                                                                    | Зачем                                    |
| --------------------------------------------------------------------------------------- | ---------------------------------------- |
| `base/`, `pluginterfaces/`                                                              | интерфейсы и базовые классы VST3         |
| `public.sdk/source/{common,main,vst}`                                                   | сторона плагина, `SingleComponentEffect` |
| `public.sdk/source/vst/{hosting,testsuite}`, `public.sdk/samples/vst-hosting/validator` | `validator` (C5)                         |
| `public.sdk/source/vst/moduleinfo`, `public.sdk/samples/vst-utilities/moduleinfotool`   | `moduleinfo.json` (C4)                   |

Не скопированы: VSTGUI (своё окно — блок F), документация, примеры, обёртки AU / AAX /
Inter-App Audio.

Код SDK не правится. clang-format его не проверяет (`Makefile`, `CPP_SOURCES`).

## Сборка

`framework/formats/vst3/CMakeLists.txt` собирает статические библиотеки
`aether_vst3_base`, `aether_vst3_pluginterfaces`, `aether_vst3_sdk_common` и
`aether_vst3_sdk` — повторяет списки из `cmake/modules/SMTG_VST3_SDK.cmake` SDK, сам CMake SDK
не используется. Отличия от списков SDK:

- нет `utility/dataexchange.cpp` (необязательный `IDataExchange`; `std::aligned_alloc` нет в
  MinGW) и `utility/vst2persistence.cpp` (пресеты VST2);
- нет `vsteditcontroller.cpp`, зато есть `vstsinglecomponenteffect.cpp`: он включает
  `vsteditcontroller.cpp` сам, переименовав `setState` / `getState`.

Кроме библиотек плагина собираются инструменты: `aether_vst3_moduleinfotool` (пишет
`moduleinfo.json`) и `aether_vst3_validator` поверх `aether_vst3_hosting`. Хост-код SDK
компилируется как C++17 (в C++20 MSVC не собирает `module_win32.cpp`). Для теста MIDI
валидатора вендорен один заголовок из примера audiohost (`miditovst.h`).

Опция `AETHER_BUILD_VST3` (по умолчанию `ON`) отключает поддержку VST3 целиком.
Тест `vst3_sdk_test` проверяет, что минимальный `SingleComponentEffect` собирается и
проходит инициализацию.

## Обновление SDK

```bash
framework/formats/vst3/update-sdk.sh v3.8.2_build_NN
```

Скрипт клонирует тег, копирует те же части и пишет `sdk/VERSION`. После обновления —
собрать, прогнать ctest и проверить, не изменились ли списки исходников в
`SMTG_VST3_SDK.cmake`.
