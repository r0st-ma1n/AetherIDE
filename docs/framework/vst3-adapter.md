# VST3-адаптер

`aether::vst3::Vst3Effect` (`framework/formats/vst3/`, цель `aether_vst3`) — компонент и
контроллер VST3 (`SingleComponentEffect`) вокруг одного `aether::PluginProcessor`. Адаптер
знает только [контракт плагина](./plugin-contract.md); SDK и сборка — в
[vst3-sdk.md](./vst3-sdk.md).

Экземпляр процессора адаптер получает в конструкторе; в модуле плагина его создаёт
`aether::pluginFactory().create()` (см. «Модуль и бандл»).

## Что во что переводится

| VST3                                              | Контракт                                                                                      |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `initialize`                                      | главная шина: stereo, если процессор её поддерживает, иначе mono; параметры из `parameters()` |
| `setupProcessing`                                 | запоминает sample rate и `maxSamplesPerBlock`; 64-bit — отказ                                 |
| `setActive(true)` / `setActive(false)`            | `prepare(ProcessSetup)` / `release()`                                                         |
| `process`                                         | изменения параметров, затем `process(ProcessContext)` на буферах хоста                        |
| `getLatencySamples`, `getTailSamples`             | `getLatencySamples()`, `getTailSeconds()` × sample rate                                       |
| `canProcessSampleSize`                            | только `kSample32`                                                                            |
| `getParamNormalized` / `setParamNormalized`       | `normalizedValue()` / `setNormalizedValue()`                                                  |
| `getParamStringByValue` / `getParamValueByString` | `valueToText()` / `textToValue()`                                                             |

## Параметры

- ID параметра в VST3 — `numericId()` из контракта (FNV-1a от строкового id, старший бит
  сброшен), поэтому автоматизация в проектах DAW не зависит от порядка параметров.
- `ParameterInfo`: имя, единица, `stepCount()`, значение по умолчанию в нормализованном
  виде; флаги `kCanAutomate` (если `automatable`), `kIsBypass` (bypass-параметр),
  `kIsList` (choice).
- Значения хранятся только в параметрах процессора (атомарно): контроллер их читает и пишет,
  поэтому хост видит то же, что использует DSP.
- Из `IParameterChanges` в v1 берётся последнее значение в блоке; плавность обеспечивает
  процессор (`SmoothedValue`). Блок без сэмплов только применяет изменения.

## Обработка

- Буферы хоста передаются в `AudioBuffer` как есть, без копирования; in-place работает.
- Если число каналов или размер блока не совпадает с подготовленной раскладкой, `process`
  возвращает `kResultFalse` и процессор не вызывается.
- Bypass обрабатывает базовый `PluginProcessor::process()`: вход копируется в выход.
- `process` адаптера не выделяет память (проверяет `vst3_effect_test`).

## Состояние

- `getState` пишет в поток хоста байты `PluginProcessor::getState()` (параметры и
  пользовательские данные, формат — `PluginState.h`); `setState` читает поток до конца и
  передаёт в `setState()` процессора.
- Битое состояние или состояние из более новой версии формата — `kResultFalse`, ничего не
  меняется.
- После успешного `setState` адаптер вызывает `restartComponent(kParamValuesChanged)`:
  хост перечитывает значения и показывает правильные (контроллер и так читает их из
  процессора).

## Шины

`setBusArrangements` принимает ровно одну входную и одну выходную шину, mono или stereo, и
только раскладки, которые поддерживает процессор (по умолчанию mono → mono и
stereo → stereo); остальное, в том числе sidechain и смену раскладки при активном плагине,
отклоняет. Процессор, умеющий только mono, стартует с mono-шиной.

## Модуль и бандл

Проект плагина подключает форматы одной функцией (`framework/cmake/AetherAddPlugin.cmake`):

```cmake
add_library(MyPlugin OBJECT MyPluginProcessor.cpp)   # код плагина с AETHER_PLUGIN
aether_add_plugin(MyPlugin FORMATS VST3 HOST)        # позже: CLAP, AU
```

- Цель плагина — `OBJECT`-библиотека: её код целиком попадает в каждый бинарник формата.
- `VST3` → цель `<Name>_VST3`, бандл `build/VST3/<Name>.vst3/Contents/x86_64-win/<Name>.vst3`
  (на Linux — `x86_64-linux/<Name>.so`). В модуль компилируется
  `formats/vst3/module/Vst3Module.cpp`: `GetPluginFactory` отдаёт фабрику с одним классом
  `Audio Module Class` / `Fx`, имя, вендор, url, email и версия — из `PluginInfo`.
  Экземпляр — `Vst3Effect` с процессором из `aether::pluginFactory().create()`; исключения в
  хост не уходят.
- После сборки `moduleinfotool` из SDK загружает модуль и пишет
  `Contents/Resources/moduleinfo.json` (версия — `VERSION` функции или `PROJECT_VERSION`).
- `HOST` → `<Name>_Host`, модуль для `aether_host`.
- MinGW: рантайм линкуется статически (`-static`) — у DAW нет DLL MinGW.

### ID класса

`componentClassId()`: FNV-1a 128 от `"aether.vst3/" + PluginInfo::id`. FUID строится из
четырёх big-endian слов хеша, поэтому строка CID одинакова на всех платформах — это hex
хеша. Пример: `dev.aether.samples.gain` → `BCC130815E62CF65BFF16092149A65BB`; значение
закреплено в `vst3_ids_test` и `GainPlugin_vst3_moduleinfo`. Смена `PluginInfo::id` даёт
другой плагин для DAW.

## Тесты

- `vst3_effect_test` ведёт себя как хост: `initialize`, `setupProcessing`, `setActive`,
  `process` с `ParameterChanges` из SDK, bypass, отказ при чужой раскладке, `terminate`.
- `vst3_state_test`: состояние туда и обратно (с пользовательскими данными), уведомление
  хоста, битое состояние, согласование mono / stereo.

- `vst3_ids_test`: тест-векторы FNV-1a 128 и закреплённый CID sample.
- `GainPlugin_vst3_moduleinfo`: бандл sample собран, `moduleinfo.json` записан загрузкой
  модуля, CID не изменился.

Пока не сделано: `validator` (C5).
