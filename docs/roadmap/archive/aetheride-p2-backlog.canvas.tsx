2import {
  Callout,
  Card,
  CardBody,
  CardHeader,
  Divider,
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

type StreamId = "all" | "G1" | "G2" | "D1" | "D2";
type Priority = "P0" | "P1" | "P2";
type TaskStatus = "ready" | "depends" | "done";

type Task = {
  id: string;
  stream: Exclude<StreamId, "all">;
  title: string;
  why: string;
  doList: string[];
  accept: string[];
  dependsOn: string[];
  priority: Priority;
  status: TaskStatus;
};

const STREAMS: Array<{
  id: Exclude<StreamId, "all">;
  name: string;
  goal: string;
}> = [
  {
    id: "G1",
    name: "IDE ↔ C++ contract",
    goal: "Codegen и sample компилируются против aether_core",
  },
  {
    id: "G2",
    name: "GUI runtime",
    goal: "Widget tree, hit-test, events, soft renderer",
  },
  {
    id: "D1",
    name: "Parameter / MIDI plumbing",
    goal: "Smoothing, listeners, MidiBuffer в ProcessContext",
  },
  {
    id: "D2",
    name: "DSP primitives",
    goal: "Gain/filter/delay/osc + deterministic tests",
  },
];

const TASKS: Task[] = [
  {
    id: "G1-T1",
    stream: "G1",
    title: "PluginProcessor + Parameter + widget stubs",
    why: "IDE и samples/GainPlugin ждут API, которого нет в framework.",
    doList: [
      "Parameter.h alias / thin wrapper над AudioProcessorParameter",
      "PluginProcessor с getParameter(id) → Parameter*",
      "Knob / Slider / Button: setBounds, setParameter, onValueChanged",
      "samples/GainPlugin в root CMake; сборка зелёная",
    ],
    accept: [
      "cmake --build собирает target GainPlugin",
      "GainPlugin.h компилируется без missing headers",
    ],
    dependsOn: [],
    priority: "P0",
    status: "done",
  },
  {
    id: "G1-T2",
    stream: "G1",
    title: "Valid codegen callbacks",
    why: "onValueChanged = this { ... } — невалидный C++.",
    doList: [
      "Эмитить [this](float val){ ... }",
      "Обновить sample cpp + generator tests",
    ],
    accept: [
      "Сгенерированный setupUI компилируется",
      "Fixture regression остаётся зелёным",
    ],
    dependsOn: ["G1-T1"],
    priority: "P0",
    status: "done",
  },
  {
    id: "G2-T1",
    stream: "G2",
    title: "Widget base + hit-testing",
    why: "Stubs ещё не обрабатывают мышь/клавиатуру.",
    doList: [
      "Widget tree / parent-child",
      "hitTest(x,y) → widget*",
      "mouseDown/Up/Move + keyboard stubs",
    ],
    accept: [
      "Headless тест: клик по bounds вызывает onValueChanged",
    ],
    dependsOn: ["G1-T1"],
    priority: "P0",
    status: "done",
  },
  {
    id: "G2-T2",
    stream: "G2",
    title: "Software / offscreen renderer",
    why: "Нужен видимый UI без DAW host.",
    doList: [
      "RGBA offscreen buffer",
      "Knob/Slider/Button paint()",
      "Snapshot / golden test (best-effort)",
    ],
    accept: [
      "Тест рисует ненулевой framebuffer для knob",
    ],
    dependsOn: ["G2-T1"],
    priority: "P1",
    status: "ready",
  },
  {
    id: "G2-T3",
    stream: "G2",
    title: "Widget ↔ parameter automation-ready",
    why: "Хост и UI должны делить один parameter store.",
    doList: [
      "Gesture begin/end hooks",
      "Listeners на Parameter",
      "UI пишет value → processBlock читает",
    ],
    accept: [
      "Интеграционный тест UI set → layout.value совпадает",
    ],
    dependsOn: ["G2-T1", "D1-T1"],
    priority: "P0",
    status: "depends",
  },
  {
    id: "D1-T1",
    stream: "D1",
    title: "Parameter smoothing + listeners",
    why: "Скачки параметров кликуют; нет подписки UI/DSP.",
    doList: [
      "LinearRamp / SmoothedValue",
      "addListener / removeListener",
      "step quantization на setValue",
    ],
    accept: [
      "Unit-тест: ramp достигает target за N samples",
    ],
    dependsOn: ["G1-T1"],
    priority: "P0",
    status: "ready",
  },
  {
    id: "D1-T2",
    stream: "D1",
    title: "MIDI buffer in ProcessContext",
    why: "Instrument templates без MIDI бесполезны.",
    doList: [
      "MidiMessage / MidiBuffer",
      "ProcessContext.midi",
      "Note on/off helpers",
    ],
    accept: [
      "Тест: buffer round-trip note events",
    ],
    dependsOn: [],
    priority: "P0",
    status: "ready",
  },
  {
    id: "D2-T1",
    stream: "D2",
    title: "DSP: Gain + Filter + Delay + Osc",
    why: "Пользователи не должны писать всё с нуля.",
    doList: [
      "aether::dsp::{Gain,OnePole,DelayLine,Oscillator}",
      "Вынести gain из examples/gain",
      "Deterministic processBlock tests",
    ],
    accept: [
      "ctest / gtest: known input → known output",
      "examples/gain использует dsp::Gain",
    ],
    dependsOn: ["D1-T1"],
    priority: "P0",
    status: "depends",
  },
];

function priorityTone(p: Priority): "deleted" | "warning" | "neutral" {
  if (p === "P0") return "deleted";
  if (p === "P1") return "warning";
  return "neutral";
}

function statusTone(s: TaskStatus): "success" | "warning" | "neutral" {
  if (s === "done") return "success";
  if (s === "ready") return "success";
  return "warning";
}

export default function AetherIdeP2Backlog() {
  const theme = useHostTheme();
  const [stream, setStream] = useCanvasState<StreamId>("p2-stream", "all");
  const [taskId, setTaskId] = useCanvasState<string>("p2-task", "G1-T1");

  const visible = TASKS.filter((t) => stream === "all" || t.stream === stream);
  const selected = TASKS.find((t) => t.id === taskId) ?? TASKS[0]!;
  const readyCount = TASKS.filter((t) => t.status === "ready").length;
  const p0Count = TASKS.filter((t) => t.priority === "P0").length;

  return (
    <Stack gap={16} style={{ padding: 16, color: theme.text }}>
      <Stack gap={6}>
        <H1>AetherIDE · P2 Backlog</H1>
        <Text tone="secondary">
          Aether Core — GUI runtime + DSP/MIDI. Без календарных дат; порядок по
          зависимостям.
        </Text>
      </Stack>

      <Row gap={12} wrap>
        <Stat value={String(TASKS.length)} label="Tasks" />
        <Stat value={String(p0Count)} label="P0 must-have" />
        <Stat value={String(readyCount)} label="Ready now" />
      </Row>

      <Callout tone="info" title="Start here">
        G1-T1/T2 и G2-T1 готовы (widget tree + hit-testing компилируются и
        покрыты widget_host_test). В работу можно брать G2-T2 (offscreen
        renderer) и D1-T1 (parameter smoothing) параллельно — оба
        разблокированы. D1-T2 (MIDI buffer) не имеет зависимостей и тоже
        готов к старту. G2-T3 и D2-T1 ждут D1-T1. Не начинать CLAP/VST3 до
        widget tree — оно уже есть, но GUI runtime ещё не отрисовывает.
      </Callout>

      <Row gap={8} wrap>
        <Pill active={stream === "all"} onClick={() => setStream("all")}>
          All
        </Pill>
        {STREAMS.map((s) => (
          <Pill active={stream === s.id} onClick={() => setStream(s.id)}>
            {`${s.id} · ${s.name}`}
          </Pill>
        ))}
      </Row>

      <Table
        headers={["ID", "Title", "Pri", "Status"]}
        columnAlign={["left", "left", "left", "left"]}
        rows={visible.map((t) => [
          <Pill
            size="sm"
            active={t.id === selected.id}
            onClick={() => setTaskId(t.id)}
          >
            {t.id}
          </Pill>,
          t.title,
          <Pill size="sm" tone={priorityTone(t.priority)}>
            {t.priority}
          </Pill>,
          <Pill size="sm" tone={statusTone(t.status)}>
            {t.status}
          </Pill>,
        ])}
      />

      <Card>
        <CardHeader>
          <H2>{`${selected.id} · ${selected.title}`}</H2>
        </CardHeader>
        <CardBody>
          <Stack gap={10}>
            <Text>{selected.why}</Text>
            <Divider />
            <H3>Do</H3>
            <Stack gap={4}>
              {selected.doList.map((item) => (
                <Text>{`• ${item}`}</Text>
              ))}
            </Stack>
            <H3>Acceptance</H3>
            <Stack gap={4}>
              {selected.accept.map((item) => (
                <Text>{`• ${item}`}</Text>
              ))}
            </Stack>
            {selected.dependsOn.length > 0 ? (
              <>
                <H3>Depends on</H3>
                <Text>{selected.dependsOn.join(", ")}</Text>
              </>
            ) : null}
          </Stack>
        </CardBody>
      </Card>

      <Spacer />
      <Text tone="secondary" size="small">
        Streams: G1 contract → G2 GUI · D1 plumbing → D2 DSP. Out of scope for
        P2: VST3/AU, DAW embedding, marketplace.
      </Text>
    </Stack>
  );
}
