import {
  Button,
  Callout,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Grid,
  H1,
  H2,
  H3,
  Pill,
  Row,
  Spacer,
  Stack,
  Stat,
  Table,
  Text,
  useCanvasState,
  useHostTheme,
} from "cursor/canvas";

type PhaseId = "all" | "P0" | "P1" | "P2" | "P3" | "P4" | "P5";
type Status = "done" | "partial" | "next" | "planned" | "later";
type Track = "IDE" | "Framework" | "Plugins" | "DX";

type Milestone = {
  id: string;
  phase: Exclude<PhaseId, "all">;
  track: Track;
  title: string;
  why: string;
  items: string[];
  status: Status;
  quarter: string;
};

const PHASES: Array<{
  id: Exclude<PhaseId, "all">;
  name: string;
  goal: string;
  horizon: string;
}> = [
  {
    id: "P0",
    name: "Foundation",
    goal: "Рабочий визуальный цикл UI ↔ C++",
    horizon: "сейчас",
  },
  {
    id: "P1",
    name: "Product Shell",
    goal: "Из прототипа — в IDE, которой можно пользоваться каждый день",
    horizon: "Q3 2026",
  },
  {
    id: "P2",
    name: "Aether Core",
    goal: "Полноценный DSP/GUI runtime без хоста",
    horizon: "Q4 2026",
  },
  {
    id: "P3",
    name: "Plugin Targets",
    goal: "Сборка в реальные форматы (CLAP → VST3 → AU)",
    horizon: "Q1 2027",
  },
  {
    id: "P4",
    name: "Live Loop",
    goal: "Preview, hot-reload и слышимый фидбек в IDE",
    horizon: "Q2 2027",
  },
  {
    id: "P5",
    name: "Scale",
    goal: "Расширенный дизайнер, темы, шаблоны, дистрибуция",
    horizon: "H2 2027",
  },
];

const MILESTONES: Milestone[] = [
  {
    id: "p0-designer",
    phase: "P0",
    track: "IDE",
    title: "UI Designer MVP",
    why: "Ядро продукта уже есть — drag-and-drop, multi-select, clipboard, undo/redo.",
    items: [
      "Knob / Slider / Button на canvas",
      "Align / distribute, selection box, Ctrl+A",
      "Command Pattern undo/redo (до 100 шагов)",
      "Двусторонняя синхронизация UISpec ↔ C++",
    ],
    status: "done",
    quarter: "готово",
  },
  {
    id: "p0-shell",
    phase: "P0",
    track: "IDE",
    title: "Electron shell + workspace",
    why: "Базовый каркас редактора: Monaco, проводник, вкладки.",
    items: [
      "Vue 3 + Pinia + Monaco",
      "File explorer с live-обновлением",
      "Workspace tabs (code / designer)",
      "Валидация .aether через AJV + JSON Schema",
    ],
    status: "done",
    quarter: "готово",
  },
  {
    id: "p0-framework",
    phase: "P0",
    track: "Framework",
    title: "Минимальный Aether API",
    why: "Достаточно для Gain-примера и генерации параметров из UI.",
    items: [
      "AudioProcessor / ProcessContext / AudioBuffer",
      "AudioProcessorParameter + ParameterLayout",
      "examples/gain + samples/GainPlugin",
    ],
    status: "partial",
    quarter: "готово / дыры",
  },
  {
    id: "p1-project",
    phase: "P1",
    track: "IDE",
    title: "Жизненный цикл проекта",
    why: "Сейчас прототип; нужен New / Open / Save как у настоящей IDE.",
    items: [
      "Wizard: Effect vs Instrument, имя, путь",
      "Надёжный Open/Save .aether + связанных .h/.cpp/.ui",
      "Recent projects, dirty-state и autosave",
      "Единый source of truth: убрать дубли UISpec / AetherProject / UiComponent",
    ],
    status: "done",
    quarter: "готово",
  },
  {
    id: "p1-build",
    phase: "P1",
    track: "DX",
    title: "Build panel в IDE",
    why: "ide/native умеет вызывать cmake, но это stub без UX и диагностики.",
    items: [
      "Панель Build/Run с логами ошибок",
      "Конфигурации Debug/Release из IDE",
      "Проблемы CMake → кликабельные diagnostics",
      "Заменить naive string-patch в native на TS codegen path",
    ],
    status: "done",
    quarter: "готово",
  },
  {
    id: "p1-codegen",
    phase: "P1",
    track: "IDE",
    title: "Устойчивая кодогенерация",
    why: "Парсер/генератор работают, но хрупки к ручным правкам кода.",
    items: [
      "Явные // AETHER:BEGIN/END маркеры в сгенерированных блоках",
      "Сохранять user-код вне маркеров",
      "Round-trip тесты на samples/GainPlugin",
      "Миграции schema version для .aether",
    ],
    status: "done",
    quarter: "готово",
  },
  {
    id: "p2-gui",
    phase: "P2",
    track: "Framework",
    title: "Aether GUI runtime",
    why: "Widget tree и hit-testing уже есть; рендер и automation-linking — нет.",
    items: [
      "Widget tree: Knob, Slider, Button (готово, widget_host_test)",
      "Layout + hit-testing + mouse/keyboard events (готово)",
      "Связка widget ↔ parameter (automation-ready) — в работе",
      "Offscreen / software renderer для headless тестов — в работе",
    ],
    status: "partial",
    quarter: "в работе",
  },
  {
    id: "p2-dsp",
    phase: "P2",
    track: "Framework",
    title: "DSP primitives",
    why: "Без базовых блоков пользователи пишут всё с нуля. Smoothing и MIDI не имеют незакрытых зависимостей — можно начинать сейчас.",
    items: [
      "MIDI buffer + note events (готово к старту, зависимостей нет)",
      "Smoothing / ramp для параметров (готово к старту, зависит от G1-T1 done)",
      "Базовые DSP: gain, filter, delay, oscillator",
      "Unit-тесты processBlock детерминированно",
    ],
    status: "next",
    quarter: "Q4 2026",
  },
  {
    id: "p3-clap",
    phase: "P3",
    track: "Plugins",
    title: "CLAP target (первый хост-формат)",
    why: "Открытый, современный формат — лучший первый адаптер поверх Aether.",
    items: [
      "AetherProcessor → CLAP wrapper",
      "Параметры, state save/load",
      "GUI embedding через framework GUI",
      "Сборка Gain как CLAP и проверка в Bitwig/Reaper",
    ],
    status: "later",
    quarter: "Q1 2027",
  },
  {
    id: "p3-vst3",
    phase: "P3",
    track: "Plugins",
    title: "VST3 (+ AU на macOS)",
    why: "Рыночный must-have после стабильного CLAP-пути.",
    items: [
      "VST3 adapter на том же Aether core",
      "AU wrapper (macOS) через общий abstraction",
      "CI matrix: Win / macOS / Linux",
      "Один проект IDE → несколько targets",
    ],
    status: "later",
    quarter: "Q1–Q2 2027",
  },
  {
    id: "p4-preview",
    phase: "P4",
    track: "IDE",
    title: "Live UI Preview",
    why: "Главный wow-момент: крутишь knob в дизайнере — слышишь/видишь плагин.",
    items: [
      "Встроенный preview host в Electron",
      "Hot-reload UI без полного рестарта DAW",
      "Audio I/O для прослушивания эффекта",
      "Синхронизация параметров designer ↔ runtime",
    ],
    status: "later",
    quarter: "Q2 2027",
  },
  {
    id: "p5-designer",
    phase: "P5",
    track: "IDE",
    title: "Designer 2.0",
    why: "Расширение визуального языка после стабильного runtime.",
    items: [
      "Label, Meter, XY Pad, Waveform, ComboBox",
      "Слои, группы, constraints, z-order",
      "Темы / скины / SVG assets",
      "Кастомные компоненты из шаблонов",
    ],
    status: "later",
    quarter: "H2 2027",
  },
  {
    id: "p5-ship",
    phase: "P5",
    track: "DX",
    title: "Дистрибуция и шаблоны",
    why: "Закрытый продукт всё равно нуждается в установщике и стартовых проектах.",
    items: [
      "Installer (Windows → macOS/Linux)",
      "Каталог стартовых шаблонов (EQ, Delay, Synth)",
      "Документация API + туториал «первый плагин»",
      "Crash reports / telemetry opt-in",
    ],
    status: "later",
    quarter: "H2 2027",
  },
];

function statusTone(
  status: Status
): "success" | "warning" | "info" | "neutral" | "deleted" {
  switch (status) {
    case "done":
      return "success";
    case "partial":
      return "warning";
    case "next":
      return "info";
    case "planned":
      return "neutral";
    case "later":
      return "neutral";
  }
}

function statusLabel(status: Status): string {
  switch (status) {
    case "done":
      return "Done";
    case "partial":
      return "Partial";
    case "next":
      return "Next";
    case "planned":
      return "Planned";
    case "later":
      return "Later";
  }
}

function trackTone(
  track: Track
): "neutral" | "info" | "success" | "warning" | "deleted" {
  switch (track) {
    case "IDE":
      return "info";
    case "Framework":
      return "success";
    case "Plugins":
      return "warning";
    case "DX":
      return "neutral";
  }
}

export default function AetherIdeRoadmap() {
  const theme = useHostTheme();
  const [phase, setPhase] = useCanvasState<PhaseId>("phase", "all");
  const [selectedId, setSelectedId] = useCanvasState<string>(
    "selectedMilestone",
    "p2-gui"
  );

  const filtered =
    phase === "all"
      ? MILESTONES
      : MILESTONES.filter((m) => m.phase === phase);

  const selected =
    MILESTONES.find((m) => m.id === selectedId) ?? filtered[0] ?? MILESTONES[0];

  const doneCount = MILESTONES.filter((m) => m.status === "done").length;
  const partialCount = MILESTONES.filter((m) => m.status === "partial").length;
  const nextCount = MILESTONES.filter((m) => m.status === "next").length;

  return (
    <Stack gap={20} style={{ padding: 20 }}>
      <Stack gap={6}>
        <H1>AetherIDE Roadmap</H1>
        <Text tone="secondary">
          От визуального прототипа к IDE, которая собирает слышимые плагины в
          CLAP/VST3. Оценка горизонтов — ориентир при соло/маленькой команде.
        </Text>
      </Stack>

      <Grid columns={4} gap={12}>
        <Stat value={`${doneCount}`} label="Done milestones" tone="success" />
        <Stat
          value={`${partialCount}`}
          label="Partial / gaps"
          tone="warning"
        />
        <Stat value={`${nextCount}`} label="Immediate next" tone="info" />
        <Stat value="6" label="Phases to ship" />
      </Grid>

      <Callout tone="success" title="P1 закрыта, фокус — P2">
        Проектный цикл и codegen (P1) стабилизированы: root/Open/Save,
        Recent, dirty-guards, wizard, build panel, AETHER-маркеры — всё
        реализовано и закоммичено на refactor/35-project-structure (ветка
        ещё не смёржена в main). Дальше — нарастить Aether GUI/DSP (P2), и
        только потом таргетировать форматы хостов (P3). Live preview без
        собственного runtime будет хрупким.
      </Callout>

      <Stack gap={8}>
        <H2>Фазы</H2>
        <Row gap={8} wrap>
          <Pill active={phase === "all"} onClick={() => setPhase("all")}>
            All
          </Pill>
          {PHASES.map((p) => (
            <Pill active={phase === p.id} onClick={() => setPhase(p.id)}>
              {`${p.id} · ${p.name}`}
            </Pill>
          ))}
        </Row>
      </Stack>

      <Table
        headers={["Phase", "Name", "Goal", "Horizon"]}
        columnAlign={["left", "left", "left", "right"]}
        rows={PHASES.filter((p) => phase === "all" || p.id === phase).map(
          (p) => [
            <Pill size="sm" tone="info" active={phase === p.id}>
              {p.id}
            </Pill>,
            p.name,
            p.goal,
            p.horizon,
          ]
        )}
        rowTone={PHASES.filter((p) => phase === "all" || p.id === phase).map(
          (p) =>
            p.id === "P0" ? "success" : p.id === "P1" ? "info" : "neutral"
        )}
        striped
      />

      <Divider />

      <Grid columns="1.1fr 1fr" gap={16}>
        <Stack gap={10}>
          <H2>Milestones</H2>
          <Text tone="secondary" size="small">
            Нажми Open — детали справа.
          </Text>
          {filtered.map((m) => {
            const active = selected?.id === m.id;
            return (
              <Card
                style={{
                  outline: active
                    ? `1px solid ${theme.accent.primary}`
                    : undefined,
                }}
              >
                <CardHeader
                  trailing={
                    <Row gap={6} align="center">
                      <Pill size="sm" tone={trackTone(m.track)}>
                        {m.track}
                      </Pill>
                      <Pill size="sm" tone={statusTone(m.status)}>
                        {statusLabel(m.status)}
                      </Pill>
                      <Button
                        variant={active ? "primary" : "secondary"}
                        onClick={() => setSelectedId(m.id)}
                      >
                        {active ? "Selected" : "Open"}
                      </Button>
                    </Row>
                  }
                >
                  {`${m.phase} · ${m.title}`}
                </CardHeader>
                <CardBody>
                  <Text tone="secondary" size="small">
                    {m.why}
                  </Text>
                </CardBody>
              </Card>
            );
          })}
        </Stack>

        <Stack gap={12}>
          <H2>Фокус</H2>
          {selected ? (
            <Card>
              <CardHeader
                trailing={
                  <Pill size="sm" tone={statusTone(selected.status)}>
                    {statusLabel(selected.status)}
                  </Pill>
                }
              >
                {selected.title}
              </CardHeader>
              <CardBody>
                <Stack gap={12}>
                  <Row gap={8} wrap>
                    <Pill size="sm" tone="info">
                      {selected.phase}
                    </Pill>
                    <Pill size="sm" tone={trackTone(selected.track)}>
                      {selected.track}
                    </Pill>
                    <Text size="small" tone="tertiary">
                      {selected.quarter}
                    </Text>
                  </Row>
                  <Text>{selected.why}</Text>
                  <H3>Deliverables</H3>
                  <Stack gap={6}>
                    {selected.items.map((item) => (
                      <Text size="small">– {item}</Text>
                    ))}
                  </Stack>
                </Stack>
              </CardBody>
            </Card>
          ) : null}

          <Card>
            <CardHeader>Ближайшие 90 дней</CardHeader>
            <CardBody>
              <Stack gap={8}>
                <Text weight="semibold">1. Offscreen renderer (G2-T2)</Text>
                <Text size="small" tone="secondary">
                  RGBA-буфер + paint() для Knob/Slider/Button, разблокирован.
                </Text>
                <Text weight="semibold">2. Parameter smoothing + MIDI (D1)</Text>
                <Text size="small" tone="secondary">
                  SmoothedValue/listeners и MidiBuffer — оба готовы к старту.
                </Text>
                <Text weight="semibold">3. Widget ↔ parameter (G2-T3)</Text>
                <Text size="small" tone="secondary">
                  Automation-ready связка после D1-T1; открывает DSP (D2).
                </Text>
              </Stack>
            </CardBody>
          </Card>

          <Callout tone="warning" title="Риск №1">
            Прыгнуть сразу в VST3/AU без Aether GUI runtime. Адаптеры тогда
            раздуются, а preview в IDE останется фейковым.
          </Callout>
        </Stack>
      </Grid>

      <Divider />

      <Stack gap={8}>
        <H2>Зависимости (критический путь)</H2>
        <Table
          headers={["From", "Enables", "Why it blocks"]}
          rows={[
            [
              "P1 Project + codegen",
              "Всё дальше",
              "Без надёжного save/load нельзя итерировать плагины",
            ],
            [
              "P2 Aether GUI",
              "P3 / P4",
              "Хост-форматы и preview требуют реального widget tree",
            ],
            [
              "P2 DSP + MIDI",
              "Instrument templates",
              "Effect-only roadmap упрётся в потолок",
            ],
            [
              "P3 CLAP first",
              "VST3 / AU",
              "Один адаптер отладить дешевле, чем три сразу",
            ],
            [
              "P4 Live preview",
              "Designer 2.0",
              "Новые виджеты бесполезны без быстрого фидбека",
            ],
          ]}
          striped
        />
      </Stack>

      <Row>
        <Text size="small" tone="tertiary">
          Источник: git log refactor/35-project-structure, framework/core
          API, ide/electron main process, p1/p2-backlog canvases
        </Text>
        <Spacer />
        <Text size="small" tone="tertiary">
          Обновлено: Aug 2026 — P1 done, P2 в работе
        </Text>
      </Row>
    </Stack>
  );
}
