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

type StreamId = "all" | "S1" | "S2" | "S3" | "S4" | "S5";
type TaskStatus = "blocked" | "ready" | "depends";
type Priority = "P0" | "P1" | "P2";

type Task = {
  id: string;
  stream: Exclude<StreamId, "all">;
  title: string;
  why: string;
  doList: string[];
  accept: string[];
  dependsOn: string[];
  files: string[];
  priority: Priority;
  status: TaskStatus;
};

const STREAMS: Array<{
  id: Exclude<StreamId, "all">;
  name: string;
  goal: string;
  order: number;
}> = [
  {
    id: "S1",
    name: "Project identity",
    goal: "IDE открывает пользовательский проект, а не весь monorepo",
    order: 1,
  },
  {
    id: "S2",
    name: "Document model",
    goal: "Один канонический формат документа UI + валидация",
    order: 2,
  },
  {
    id: "S3",
    name: "Stable codegen",
    goal: "Один протокол маркеров; round-trip UI ↔ C++ без потери USER CODE",
    order: 3,
  },
  {
    id: "S4",
    name: "New project wizard",
    goal: "Scaffold Effect/Instrument в выбранную папку",
    order: 4,
  },
  {
    id: "S5",
    name: "Build panel",
    goal: "Сборка открытого проекта из IDE с логами",
    order: 5,
  },
];

const TASKS: Task[] = [
  {
    id: "S1-T1",
    stream: "S1",
    title: "Project root вместо hard-coded monorepo",
    why: "Сейчас electron/main всегда смотрит на корень AetherIDE — Explorer = весь репозиторий.",
    doList: [
      "Ввести activeProjectRoot в main process (память + persist)",
      "IPC: project:get-root / project:set-root",
      "resolveProjectPath и listProjectFiles относительно active root",
      "Fallback: если root не задан — empty state, не monorepo",
    ],
    accept: [
      "После set-root Explorer показывает только дерево этого каталога",
      "file:read/write отклоняют пути вне root (path traversal safe)",
      "Перезапуск IDE восстанавливает последний root",
    ],
    dependsOn: [],
    files: [
      "ide/electron/main/index.cjs",
      "ide/electron/preload/index.cjs",
      "ide/src/vite-env.d.ts",
      "ide/src/domains/files/stores/fileExplorerStore.ts",
    ],
    priority: "P0",
    status: "ready",
  },
  {
    id: "S1-T2",
    stream: "S1",
    title: "Open Project (диалог + File menu)",
    why: "Нет dialog.showOpenDialog и пунктов меню New/Open/Save.",
    doList: [
      "File → Open Project… → directory picker",
      "Валидация: папка содержит .aether или согласованный маркер проекта",
      "После open: set-root → reload explorer → закрыть чужие вкладки / предложить reopen",
      "Window title: AetherIDE — <projectName>",
    ],
    accept: [
      "Можно открыть samples/GainPlugin (после появления .aether) без показа framework/ide",
      "Пункт меню Open Project работает с клавиатурным shortcut",
      "Отмена диалога ничего не меняет",
    ],
    dependsOn: ["S1-T1"],
    files: [
      "ide/electron/main/index.cjs",
      "ide/src/app/AppShell.vue",
      "ide/src/domains/workspace/stores/workspaceStore.ts",
    ],
    priority: "P0",
    status: "depends",
  },
  {
    id: "S1-T3",
    stream: "S1",
    title: "Recent projects",
    why: "Повторный open через filesystem каждый раз — лишний friction.",
    doList: [
      "Persist список { path, name, openedAt } (localStorage или electron-store file)",
      "File → Open Recent → submenu / welcome list",
      "Проверка exists при клике; битые пути — remove + toast",
      "Лимит 8–10 записей, MRU порядок",
    ],
    accept: [
      "После Open путь появляется в Recent",
      "Клик по Recent открывает тот же root без диалога",
      "Удалённая папка не крашит IDE",
    ],
    dependsOn: ["S1-T2"],
    files: [
      "ide/electron/main/index.cjs",
      "ide/src/domains/workspace/stores/workspaceStore.ts",
    ],
    priority: "P1",
    status: "depends",
  },
  {
    id: "S1-T4",
    stream: "S1",
    title: "Dirty close / quit guards",
    why: "closeTab и quit сейчас молча теряют несохранённое.",
    doList: [
      "Confirm при close dirty tab",
      "Confirm при Close Project / Quit если есть dirty tabs",
      "Save / Don't Save / Cancel",
      "Не персистить isDirty=true в localStorage без буфера (или сбрасывать при restore)",
    ],
    accept: [
      "Закрытие dirty-вкладки без Save не пишет файл и спрашивает пользователя",
      "Quit с dirty tabs блокируется до ответа",
      "После рестарта вкладки не помечены dirty без реальных несохранённых правок",
    ],
    dependsOn: ["S1-T1"],
    files: [
      "ide/src/domains/workspace/stores/workspaceStore.ts",
      "ide/src/domains/workspace/components/TabBar.vue",
      "ide/electron/main/index.cjs",
    ],
    priority: "P0",
    status: "depends",
  },
  {
    id: "S1-T5",
    stream: "S1",
    title: "Save Project + optional autosave",
    why: "Есть только per-file Ctrl+S; project-level Save и autosave отсутствуют.",
    doList: [
      "File → Save / Save All: сохранить все dirty tabs активного проекта",
      "Опционально: autosave interval (выключаемый) только для .aether/.ui",
      "Единый toast об успехе/ошибке",
    ],
    accept: [
      "Save All сбрасывает dirty на всех сохранённых вкладках",
      "Ошибка записи на одном файле не помечает остальные как сохранённые",
      "Autosave (если включён) не затирает USER CODE при корректном codegen path",
    ],
    dependsOn: ["S1-T2", "S2-T2", "S3-T2"],
    files: [
      "ide/src/domains/workspace/stores/workspaceStore.ts",
      "ide/src/domains/ui-designer/stores/uiDesignerStore.ts",
      "ide/src/domains/editor/stores/editorStore.ts",
    ],
    priority: "P1",
    status: "depends",
  },
  {
    id: "S2-T1",
    stream: "S2",
    title: "Каноническая in-memory модель",
    why: "Параллельно живут UiComponent, UISpecComponent, AetherProjectComponent и мёртвый ide/types.ts.",
    doList: [
      "Выбрать канон: UISpec / UISpecComponent (уже в codegen)",
      "Адаптеры: UiComponent ↔ UISpec, AetherProject ↔ UISpec",
      "Designer store работает только с каноном",
      "Удалить или пометить dead code: ide/types.ts, unused CodeEditor.vue",
    ],
    accept: [
      "В runtime Vue-коде один primary тип для компонентов UI",
      "Typecheck зелёный; старые тесты обновлены под адаптеры",
      "Нет импортов из мёртвого ide/types.ts в app code",
    ],
    dependsOn: [],
    files: [
      "ide/src/shared/types/index.ts",
      "ide/types.ts",
      "ide/src/domains/ui-designer/stores/uiDesignerStore.ts",
      "ide/src/shared/schemas/validateAetherProject.ts",
    ],
    priority: "P0",
    status: "ready",
  },
  {
    id: "S2-T2",
    stream: "S2",
    title: ".aether как project UI document",
    why: "README/schema обещают .aether; фактически дизайнер пишет .ui JSON.",
    doList: [
      "Решить: .aether = UI layout (+ version), project meta отдельно ИЛИ .aether = весь project manifest",
      "Рекомендация: project.json/.aetherproj meta + ui.aether layout; либо один .aether с versioned schema",
      "Save designer → validateAetherProject → write",
      "Open → validate → fromAetherProject → store",
      "Миграция samples/GainPlugin/*.ui → *.aether (+ fixture test)",
      "ALLOW .aether в explorer extensions",
    ],
    accept: [
      "Round-trip: save → reload → идентичный component set (id/type/pos/size/params/color)",
      "Невалидный файл → понятная ошибка, store не портится",
      "Vitest: load/save fixture через validate + converters",
    ],
    dependsOn: ["S2-T1"],
    files: [
      "ide/src/shared/schemas/aetherProject.schema.json",
      "ide/src/shared/schemas/validateAetherProject.ts",
      "ide/src/domains/ui-designer/lib/uiDocument.ts",
      "samples/GainPlugin/",
    ],
    priority: "P0",
    status: "depends",
  },
  {
    id: "S2-T3",
    stream: "S2",
    title: "Schema version + миграция",
    why: "Без version поле любые изменения формата сломают старые проекты.",
    doList: [
      "Обязательное version в schema",
      "migrate(raw) → current version перед validate",
      "Тест: v1 fixture → current",
    ],
    accept: [
      "Файл без/со старым version открывается через migrate или даёт явный unsupported",
      "Новые сохранения всегда пишут current version",
    ],
    dependsOn: ["S2-T2"],
    files: [
      "ide/src/shared/schemas/aetherProject.schema.json",
      "ide/src/shared/schemas/validateAetherProject.ts",
    ],
    priority: "P1",
    status: "depends",
  },
  {
    id: "S3-T1",
    stream: "S3",
    title: "Один протокол маркеров AETHER",
    why: "Тесты покрывают // --- AETHER UI BEGIN/END ---, а UI save идёт через generatePluginCode без них; reverse parse ждёт // COMPONENT:.",
    doList: [
      "Сделать AETHER markers единственным machine-owned блоком в .cpp/.h",
      "generatePluginCode (или patch) эмитит BEGIN/END + // AETHER id=... строки",
      "Удалить/заменить parseGeneratedCode на parseUIFromCpp",
      "Сохранить USER CODE BEGIN/END как human-owned зоны",
    ],
    accept: [
      "Designer save пишет AETHER markers в sample plugin sources",
      "parseUIFromCpp(savedCpp).components ≈ UISpec из дизайнера",
      "Старый // COMPONENT: путь не используется в production code",
    ],
    dependsOn: ["S2-T1"],
    files: [
      "ide/src/domains/ui-designer/lib/codeGenerator.ts",
      "ide/src/domains/ui-designer/lib/codeParser.ts",
      "ide/src/domains/ui-designer/components/UIDesigner.vue",
      "ide/src/domains/editor/components/CodeEditor.vue",
    ],
    priority: "P0",
    status: "depends",
  },
  {
    id: "S3-T2",
    stream: "S3",
    title: "Wire round-trip в UI",
    why: "generateCppFromUI/parseUIFromCpp покрыты тестами, но не вызываются из Vue.",
    doList: [
      "Designer Save → update markers in linked .cpp/.h",
      "Code Save / external file change → если markers валидны → обновить canvas",
      "Конфликт: dirty designer + dirty code → явная политика (P1: last-save-wins + toast)",
      "Починить template paths: templateStore + DefaultPlugin.* assets",
    ],
    accept: [
      "Изменение позиции knob в дизайнере → после Save markers в cpp обновлены",
      "Правка x= в AETHER-комментарии → Save code → knob сдвинулся на canvas",
      "Правка внутри USER CODE SetupUI переживает последующий Designer Save",
      "Сломанный путь templates больше не молча no-op",
    ],
    dependsOn: ["S3-T1"],
    files: [
      "ide/src/domains/ui-designer/components/UIDesigner.vue",
      "ide/src/domains/templates/stores/templateStore.ts",
      "ide/src/domains/editor/components/CodeEditor.vue",
      "samples/GainPlugin/GainPlugin.cpp",
    ],
    priority: "P0",
    status: "depends",
  },
  {
    id: "S3-T3",
    stream: "S3",
    title: "Regression suite для GainPlugin",
    why: "Нужен якорь, что sample остаётся round-tripable.",
    doList: [
      "Fixture test: parse sample cpp ↔ generate ↔ parse equals",
      "Fixture test: .aether ↔ store ↔ .aether",
      "CI уже через make test / vitest — убедиться что suite в нём",
    ],
    accept: [
      "Новые тесты зелёные локально через npm test в ide/",
      "Ломающий изменение маркеров падает в CI-эквиваленте",
    ],
    dependsOn: ["S3-T2", "S2-T2"],
    files: [
      "ide/src/domains/ui-designer/lib/codeGeneration.test.ts",
      "ide/src/shared/schemas/validateAetherProject.test.ts",
      "samples/GainPlugin/",
    ],
    priority: "P1",
    status: "depends",
  },
  {
    id: "S4-T1",
    stream: "S4",
    title: "Scaffold из templates",
    why: "CMakeLists.txt.template и DefaultPlugin.* есть, но New Project не создаёт дерево файлов.",
    doList: [
      "Сервис scaffoldProject({ name, type, targetDir })",
      "Копировать/подставлять: CMakeLists, .h, .cpp, .aether, README stub",
      "Подстановка {{PluginName}} / type-specific defines",
      "Effect vs Instrument: разные template sets или хотя бы разные entry points/params",
    ],
    accept: [
      "После scaffold папка собирается cmake-ом вручную (без IDE build panel ещё ок)",
      "Открытый .aether показывает пустой/стартовый UI",
      "Имена файлов соответствуют PluginName",
    ],
    dependsOn: ["S2-T2", "S3-T1"],
    files: [
      "ide/src/domains/templates/stores/templateStore.ts",
      "ide/src/domains/templates/assets/",
      "ide/electron/main/index.cjs",
    ],
    priority: "P0",
    status: "depends",
  },
  {
    id: "S4-T2",
    stream: "S4",
    title: "New Project wizard UI",
    why: "PluginType есть в store, UI wizard и setPluginType не используются.",
    doList: [
      "Модалка: Name, Type (Effect|Instrument), Location",
      "File → New Project…",
      "По успеху: Open Project на новую папку + открыть .aether tab",
      "Валидация имени (C++ identifier safe)",
    ],
    accept: [
      "Пользователь создаёт проект без ручного копирования samples/",
      "Отмена wizard ничего не создаёт на диске",
      "Conflict: непустая папка → ошибка или confirm overwrite policy",
    ],
    dependsOn: ["S4-T1", "S1-T2"],
    files: [
      "ide/src/app/AppShell.vue",
      "ide/src/domains/templates/",
    ],
    priority: "P0",
    status: "depends",
  },
  {
    id: "S5-T1",
    stream: "S5",
    title: "Build IPC + log streaming",
    why: "ide/native умеет cmake --build, но нет preload API и UI.",
    doList: [
      "preload: buildProject() → main spawn cmake/ide_backend",
      "Stream stdout/stderr через IPC events",
      "Build dir = <projectRoot>/build (configure once if missing)",
      "Не использовать dead IBackendAPI из ide/types.ts вслепую — либо реализовать, либо удалить",
    ],
    accept: [
      "Из DevTools/временной кнопки build открытого GainPlugin возвращает exit code + лог",
      "Второй concurrent build отклоняется или ставится в очередь",
    ],
    dependsOn: ["S1-T1"],
    files: [
      "ide/electron/main/index.cjs",
      "ide/electron/preload/index.cjs",
      "ide/native/main.cpp",
      "ide/src/vite-env.d.ts",
    ],
    priority: "P1",
    status: "depends",
  },
  {
    id: "S5-T2",
    stream: "S5",
    title: "Build panel UI",
    why: "Нужен видимый фидбек ошибок компиляции в AppShell.",
    doList: [
      "Bottom panel: Build output (collapsible)",
      "Toolbar: Build / Stop",
      "Status pill: Idle | Building | Success | Failed",
      "Опционально: клик по path:line в логе → open tab (best-effort)",
    ],
    accept: [
      "Успешная сборка sample видна в panel без терминала",
      "Намеренно сломанный cpp → Failed + текст ошибки в panel",
      "Stop прерывает child process",
    ],
    dependsOn: ["S5-T1"],
    files: [
      "ide/src/app/AppShell.vue",
      "ide/src/domains/workspace/",
    ],
    priority: "P1",
    status: "depends",
  },
];

function priorityTone(p: Priority): "deleted" | "warning" | "neutral" {
  if (p === "P0") return "deleted";
  if (p === "P1") return "warning";
  return "neutral";
}

function statusLabel(s: TaskStatus): string {
  if (s === "ready") return "Ready";
  if (s === "depends") return "Waiting deps";
  return "Blocked";
}

function statusTone(s: TaskStatus): "success" | "warning" | "neutral" {
  if (s === "ready") return "success";
  if (s === "depends") return "warning";
  return "neutral";
}

export default function AetherIdeP1Backlog() {
  const theme = useHostTheme();
  const [stream, setStream] = useCanvasState<StreamId>("p1-stream", "all");
  const [taskId, setTaskId] = useCanvasState<string>("p1-task", "S1-T1");
  const [view, setView] = useCanvasState<"board" | "accept" | "order">(
    "p1-view",
    "board"
  );

  const filtered =
    stream === "all" ? TASKS : TASKS.filter((t) => t.stream === stream);

  const selected =
    TASKS.find((t) => t.id === taskId) ?? filtered[0] ?? TASKS[0];

  const readyCount = TASKS.filter((t) => t.status === "ready").length;
  const p0Count = TASKS.filter((t) => t.priority === "P0").length;

  return (
    <Stack gap={20} style={{ padding: 20 }}>
      <Stack gap={6}>
        <H1>AetherIDE · P1 Product Shell</H1>
        <Text tone="secondary">
          Подробный backlog без дат. Цель фазы: из прототипа над monorepo —
          IDE с Open/New/Save, единым документом, стабильным codegen и сборкой
          из UI.
        </Text>
      </Stack>

      <Grid columns={4} gap={12}>
        <Stat value={`${TASKS.length}`} label="Tasks in P1" />
        <Stat value={`${STREAMS.length}`} label="Workstreams" tone="info" />
        <Stat value={`${p0Count}`} label="Must-have (P0)" tone="warning" />
        <Stat value={`${readyCount}`} label="Ready now" tone="success" />
      </Grid>

      <Callout tone="info" title="Правило порядка">
        Не начинать S4/S5 раньше стабильного root + document model. Wizard и
        Build panel на гнилом Open/codegen только закрепят долг. S2 и S3 можно
        частично параллелить с S1 после S1-T1.
      </Callout>

      <Row gap={8} wrap>
        <Text size="small" tone="tertiary" weight="semibold">
          View
        </Text>
        <Pill active={view === "board"} onClick={() => setView("board")}>
          Board
        </Pill>
        <Pill active={view === "order"} onClick={() => setView("order")}>
          Order
        </Pill>
        <Pill active={view === "accept"} onClick={() => setView("accept")}>
          Definition of Done
        </Pill>
      </Row>

      <Row gap={8} wrap>
        <Text size="small" tone="tertiary" weight="semibold">
          Stream
        </Text>
        <Pill active={stream === "all"} onClick={() => setStream("all")}>
          All
        </Pill>
        {STREAMS.map((s) => (
          <Pill active={stream === s.id} onClick={() => setStream(s.id)}>
            {`${s.id} · ${s.name}`}
          </Pill>
        ))}
      </Row>

      {view === "order" ? (
        <Stack gap={12}>
          <H2>Рекомендуемый порядок</H2>
          <Table
            headers={["Step", "Task", "Why this next"]}
            rows={[
              [
                "1",
                "S1-T1 Project root",
                "Без root всё остальное пишет не туда",
              ],
              [
                "2",
                "S2-T1 Canonical model",
                "Иначе converters размножатся",
              ],
              [
                "3",
                "S1-T2 Open + S2-T2 .aether",
                "Появляется настоящий project document",
              ],
              [
                "4",
                "S3-T1 → S3-T2 markers + wire",
                "Save начинает быть безопасным",
              ],
              [
                "5",
                "S1-T4 dirty guards",
                "Не терять работу пользователя",
              ],
              [
                "6",
                "S4-T1 → S4-T2 wizard",
                "Create flow на готовом scaffold/format",
              ],
              [
                "7",
                "S1-T3 Recent + S1-T5 Save All",
                "Удобство ежедневного цикла",
              ],
              [
                "8",
                "S5-T1 → S5-T2 Build panel",
                "Сборка после того, как project root стабилен",
              ],
              [
                "9",
                "S2-T3 migrate + S3-T3 fixtures",
                "Закрепить контракты тестами",
              ],
            ]}
            striped
          />
          <H3>Параллелизация</H3>
          <Text size="small" tone="secondary">
            После S1-T1: S2-T1∥S5-T1. После S2-T1: S2-T2∥S3-T1. Wizard (S4)
            только после Open + .aether + markers.
          </Text>
        </Stack>
      ) : null}

      {view === "accept" ? (
        <Stack gap={12}>
          <H2>Definition of Done — вся фаза P1</H2>
          <Table
            headers={["#", "Criterion"]}
            rows={[
              [
                "1",
                "Open Project показывает только дерево плагина, не monorepo IDE",
              ],
              [
                "2",
                "New Project создаёт собираемый scaffold Effect или Instrument",
              ],
              [
                "3",
                ".aether round-trip через validateAetherProject без ручного JSON",
              ],
              [
                "4",
                "Designer ↔ C++ через AETHER markers; USER CODE сохраняется",
              ],
              [
                "5",
                "Dirty tab/quit требуют confirm; Save All сбрасывает dirty",
              ],
              [
                "6",
                "Recent projects открывает root без file picker",
              ],
              [
                "7",
                "Build panel собирает открытый sample и показывает ошибки",
              ],
              [
                "8",
                "Vitest: schema + marker round-trip + хотя бы один sample fixture",
              ],
            ]}
            striped
          />
          <Callout tone="warning" title="Out of scope для P1">
            VST3/CLAP/AU, live preview/audio I/O, Clang AST codegen, Label и
            новые виджеты, multi-root workspace, real-time sync на каждый
            keystroke, дистрибутив/installer, рефакторинг framework/core DSP.
          </Callout>
        </Stack>
      ) : null}

      {view === "board" ? (
        <Grid columns="1.15fr 1fr" gap={16}>
          <Stack gap={10}>
            <H2>Tasks</H2>
            {stream === "all" ? (
              <Table
                headers={["ID", "Stream", "Task", "Pri", "Deps"]}
                rows={filtered.map((t) => [
                  t.id,
                  t.stream,
                  t.title,
                  t.priority,
                  t.dependsOn.length ? t.dependsOn.join(", ") : "—",
                ])}
                rowTone={filtered.map((t) =>
                  t.status === "ready"
                    ? "success"
                    : t.priority === "P0"
                      ? "warning"
                      : "neutral"
                )}
                striped
                stickyHeader
              />
            ) : (
              <Text size="small" tone="secondary">
                {STREAMS.find((s) => s.id === stream)?.goal}
              </Text>
            )}

            {filtered.map((t) => {
              const active = selected?.id === t.id;
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
                        <Pill size="sm" tone={priorityTone(t.priority)}>
                          {t.priority}
                        </Pill>
                        <Pill size="sm" tone={statusTone(t.status)}>
                          {statusLabel(t.status)}
                        </Pill>
                        <Button
                          variant={active ? "primary" : "secondary"}
                          onClick={() => setTaskId(t.id)}
                        >
                          {active ? "Selected" : "Open"}
                        </Button>
                      </Row>
                    }
                  >
                    {`${t.id} · ${t.title}`}
                  </CardHeader>
                  <CardBody>
                    <Text tone="secondary" size="small">
                      {t.why}
                    </Text>
                  </CardBody>
                </Card>
              );
            })}
          </Stack>

          <Stack gap={12}>
            <H2>Детали</H2>
            {selected ? (
              <Card>
                <CardHeader
                  trailing={
                    <Pill size="sm" tone={priorityTone(selected.priority)}>
                      {selected.priority}
                    </Pill>
                  }
                >
                  {selected.title}
                </CardHeader>
                <CardBody>
                  <Stack gap={12}>
                    <Row gap={8} wrap>
                      <Pill size="sm" active>
                        {selected.id}
                      </Pill>
                      <Pill size="sm">{selected.stream}</Pill>
                      <Pill size="sm" tone={statusTone(selected.status)}>
                        {statusLabel(selected.status)}
                      </Pill>
                    </Row>

                    <Text>{selected.why}</Text>

                    {selected.dependsOn.length > 0 ? (
                      <Stack gap={6}>
                        <H3>Depends on</H3>
                        <Row gap={6} wrap>
                          {selected.dependsOn.map((d) => (
                            <Pill
                              size="sm"
                              active={taskId === d}
                              onClick={() => setTaskId(d)}
                            >
                              {d}
                            </Pill>
                          ))}
                        </Row>
                      </Stack>
                    ) : (
                      <Text size="small" tone="tertiary">
                        Нет зависимостей — можно брать первым.
                      </Text>
                    )}

                    <H3>Do</H3>
                    <Stack gap={4}>
                      {selected.doList.map((item) => (
                        <Text size="small">– {item}</Text>
                      ))}
                    </Stack>

                    <H3>Acceptance</H3>
                    <Stack gap={4}>
                      {selected.accept.map((item) => (
                        <Text size="small">– {item}</Text>
                      ))}
                    </Stack>

                    <H3>Touch files</H3>
                    <Stack gap={4}>
                      {selected.files.map((f) => (
                        <Text size="small" tone="secondary">
                          {f}
                        </Text>
                      ))}
                    </Stack>
                  </Stack>
                </CardBody>
              </Card>
            ) : null}

            <Card>
              <CardHeader>Стартовый набор (без дат)</CardHeader>
              <CardBody>
                <Stack gap={8}>
                  <Text weight="semibold">Сейчас Ready</Text>
                  <Text size="small" tone="secondary">
                    S1-T1 Project root · S2-T1 Canonical model
                  </Text>
                  <Text weight="semibold">Сразу после них</Text>
                  <Text size="small" tone="secondary">
                    S1-T2 Open Project · S2-T2 .aether · S3-T1 markers
                  </Text>
                  <Text weight="semibold">Закрытие фазы</Text>
                  <Text size="small" tone="secondary">
                    Wizard + Build panel + fixture regression
                  </Text>
                </Stack>
              </CardBody>
            </Card>

            <Callout tone="danger" title="Главный долг прямо сейчас">
              Два codegen-пути и два формата (.ui vs .aether). Пока не сведены
              к одному протоколу маркеров и одному document format — Save будет
              оставаться хрупким.
            </Callout>
          </Stack>
        </Grid>
      ) : null}

      <Divider />

      <Stack gap={8}>
        <H2>Workstreams</H2>
        <Table
          headers={["#", "Stream", "Goal"]}
          rows={STREAMS.map((s) => [String(s.order), `${s.id} ${s.name}`, s.goal])}
          striped
        />
      </Stack>

      <Row>
        <Text size="small" tone="tertiary">
          Основано на inventory текущего кода: electron hard-coded root, .ui
          persistence, schema-only .aether, dual codegen, native build stub
        </Text>
        <Spacer />
        <Text size="small" tone="tertiary">
          Без дат · P1 only
        </Text>
      </Row>
    </Stack>
  );
}
