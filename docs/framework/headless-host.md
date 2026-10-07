# Headless-хост `aether_host`

Утилита, которая загружает плагин Aether из модуля (`.dll` / `.so`) и прогоняет через него
звук без DAW. Это первый адаптер формата: она работает с плагином только через контракт из
[plugin-contract.md](./plugin-contract.md). Код — `framework/host/`.

## Запуск

После сборки (`make cmake-build`) модуль примера — `gain_plugin`, утилита — `aether_host`
(`build/framework/host/`; с генератором Visual Studio оба лежат в подпапке `Release/`):

```bash
# Параметры плагина
aether_host --plugin build/framework/core/examples/gain/gain_plugin.dll --list-params

# Синус 440 Гц, 1 с, gain 0.25 → out.wav (32-bit float)
aether_host --plugin <module> --sine 440 --duration 1 --param gain=0.25 --out out.wav

# Свой WAV-файл
aether_host --plugin <module> --in input.wav --out output.wav
```

| Опция                                                      | По умолчанию       | Что делает                                                   |
| ---------------------------------------------------------- | ------------------ | ------------------------------------------------------------ |
| `--plugin <module>`                                        | —                  | модуль плагина, обязательна                                  |
| `--out <file.wav>`                                         | —                  | куда записать результат, обязательна (кроме `--list-params`) |
| `--in <file.wav>`                                          | —                  | вход из файла: PCM 16/24/32 бит или float 32 бит             |
| `--sine <hz>`                                              | 440                | вход — синус, если нет `--in`                                |
| `--amplitude`, `--duration`, `--sample-rate`, `--channels` | 0.5, 1 с, 48000, 2 | параметры синуса                                             |
| `--block-size <n>`                                         | 512                | максимальный размер блока; последний может быть короче       |
| `--param <id>=<value>`                                     | —                  | значение параметра в обычных единицах; можно повторять       |
| `--list-params`                                            | —                  | показать параметры и выйти                                   |

Коды возврата: `0` — успех, `1` — ошибка в аргументах, `2` — не удалось загрузить плагин
или обработать звук.

## Как плагин попадает в модуль

`AETHER_PLUGIN(ClassName)` кроме `aether::pluginFactory()` экспортирует две C-функции:
`aether_plugin_abi_version()` и `aether_plugin_factory()`. Хост ищет их в модуле и
отказывается загружать модуль с другим `kPluginAbiVersion`.

Хост и плагин обмениваются C++-объектами, поэтому модуль должен быть собран тем же
компилятором, той же стандартной библиотекой и той же версией Aether, что и хост. Для
VST3, CLAP и AU это не важно: их адаптеры линкуются в бинарник плагина.

## Использование в тестах

`aether::host::render(plugin, clip, options)` — тот же рендер из кода: `RenderOptions::beforeBlock`
позволяет менять параметры посреди рендера, как автоматизация в DAW. Пример —
`framework/core/examples/gain/gain_host_test.cpp`: загружает модуль `gain_plugin` и проверяет
амплитуду, отсутствие щелчков и командную строку.
