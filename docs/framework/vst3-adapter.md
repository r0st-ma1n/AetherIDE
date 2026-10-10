# VST3-адаптер

`aether::vst3::Vst3Effect` (`framework/formats/vst3/`, цель `aether_vst3`) — компонент и
контроллер VST3 (`SingleComponentEffect`) вокруг одного `aether::PluginProcessor`. Адаптер
знает только [контракт плагина](./plugin-contract.md); SDK и сборка — в
[vst3-sdk.md](./vst3-sdk.md).

Экземпляр процессора адаптер получает в конструкторе; в модуле плагина его создаёт
`aether::pluginFactory().create()` (фабрика модуля и бандл — задача C4).

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

## Тесты

- `vst3_effect_test` ведёт себя как хост: `initialize`, `setupProcessing`, `setActive`,
  `process` с `ParameterChanges` из SDK, bypass, отказ при чужой раскладке, `terminate`.
- `vst3_state_test`: состояние туда и обратно (с пользовательскими данными), уведомление
  хоста, битое состояние, согласование mono / stereo.

Пока не сделано: фабрика модуля, FUID и бандл (C4), `validator` (C5).
