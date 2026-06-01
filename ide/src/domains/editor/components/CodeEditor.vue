<template>
  <section class="code-editor">
    <header class="code-editor__header">
      <div class="code-editor__file">
        <strong>{{ fileName }}</strong>
        <span>{{ props.tab.filePath }}</span>
      </div>
      <span class="code-editor__language">{{ languageLabel }}</span>
    </header>

    <div ref="containerRef" class="code-editor__surface"></div>

    <footer class="code-editor__status">
      <span>Lines: {{ lineCount }}</span>
      <span>Line: {{ currentLine }}, Col: {{ currentCol }}</span>
      <span>UTF-8</span>
      <span>{{ languageLabel }}</span>
    </footer>
  </section>
</template>

<script setup lang="ts">
import * as monaco from 'monaco-editor';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useEditorStore } from '@/domains/editor/stores/editorStore';
import { parseGeneratedCode } from '@/domains/ui-designer/lib/codeParser';
import {
  parseUiDocument,
  serializeUiDocument,
} from '@/domains/ui-designer/lib/uiDocument';
import { useWorkspaceStore } from '@/domains/workspace/stores/workspaceStore';
import {
  basename,
  basenameWithoutExt,
  dirname,
  joinPath,
} from '@/shared/lib/path';
import type { WorkspaceTab } from '@/shared/types';

const props = defineProps<{
  tab: WorkspaceTab;
}>();

const editorStore = useEditorStore();
const workspaceStore = useWorkspaceStore();
const containerRef = ref<HTMLElement | null>(null);
const currentLine = ref(1);
const currentCol = ref(1);
const lineCount = ref(1);

let editor: monaco.editor.IStandaloneCodeEditor | null = null;

const fileName = computed(() => basename(props.tab.filePath));
const languageLabel = computed(() =>
  editorStore.getDocumentLanguage(props.tab.filePath).toUpperCase()
);

function getMonacoLanguage(filePath: string): string {
  const lang = editorStore.getDocumentLanguage(filePath);
  if (lang === 'cpp') return 'cpp';
  if (lang === 'typescript') return 'typescript';
  if (lang === 'javascript') return 'javascript';
  if (lang === 'json') return 'json';
  if (lang === 'html') return 'html';
  if (lang === 'markdown') return 'markdown';
  return 'plaintext';
}

async function loadFile() {
  const content = await window.prototypeIDE.readFile(props.tab.filePath);
  editorStore.setActiveFile(props.tab.filePath);
  editorStore.setDocumentContent(props.tab.filePath, content);
  workspaceStore.markDirty(props.tab.id, false);

  if (editor) {
    const model = editor.getModel();
    if (model) {
      model.setValue(content);
      monaco.editor.setModelLanguage(
        model,
        getMonacoLanguage(props.tab.filePath)
      );
    }
    updateStatus();
  }
}

async function saveFile() {
  if (!editor) return;
  const content = editor.getValue();
  editorStore.setDocumentContent(props.tab.filePath, content);
  await window.prototypeIDE.writeFile(props.tab.filePath, content);

  if (props.tab.filePath.endsWith('.h')) {
    const baseDir = dirname(props.tab.filePath);
    const baseName = basenameWithoutExt(props.tab.filePath);
    const uiPath = joinPath(baseDir, `${baseName}.ui`);
    const uiExists = await window.prototypeIDE.fileExists(uiPath);

    if (uiExists) {
      const components = parseGeneratedCode(content);
      if (components.length > 0) {
        const existingDoc = parseUiDocument(
          await window.prototypeIDE.readFile(uiPath)
        );
        await window.prototypeIDE.writeFile(
          uiPath,
          serializeUiDocument(
            components,
            existingDoc.canvasWidth,
            existingDoc.canvasHeight
          )
        );
      }
    }
  }

  workspaceStore.markDirty(props.tab.id, false);
  workspaceStore.showToast(`Saved ${basename(props.tab.filePath)}`);
}

function updateStatus() {
  if (!editor) return;
  const pos = editor.getPosition();
  const model = editor.getModel();
  currentLine.value = pos?.lineNumber ?? 1;
  currentCol.value = pos?.column ?? 1;
  lineCount.value = model?.getLineCount() ?? 1;
}

function onKeyDown(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
    event.preventDefault();
    if (workspaceStore.activeTabId === props.tab.id) {
      void saveFile();
    }
  }
}

onMounted(async () => {
  if (!containerRef.value) return;

  editor = monaco.editor.create(containerRef.value, {
    value: '',
    language: getMonacoLanguage(props.tab.filePath),
    theme: 'vs-dark',
    fontSize: 14,
    fontFamily: "'Consolas', 'IBM Plex Mono', monospace",
    lineHeight: 21,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    automaticLayout: true,
    tabSize: 2,
    insertSpaces: true,
    wordWrap: 'off',
    renderWhitespace: 'none',
    smoothScrolling: true,
  });

  editor.onDidChangeModelContent(() => {
    if (!editor) return;
    const content = editor.getValue();
    editorStore.setDocumentContent(props.tab.filePath, content);
    workspaceStore.markDirty(props.tab.id, true);
    updateStatus();
  });

  editor.onDidChangeCursorPosition(() => updateStatus());

  await loadFile();
  window.addEventListener('keydown', onKeyDown);
});

watch(
  () => props.tab.filePath,
  async () => {
    await loadFile();
  }
);

const unsubscribeFileWatch = window.prototypeIDE.onFileChanged(
  async (changedPath: string) => {
    // Reload only if this tab's file was changed externally (not by our own save)
    if (
      changedPath === props.tab.filePath &&
      !workspaceStore.activeTab?.isDirty
    ) {
      await loadFile();
    }
  }
);

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown);
  unsubscribeFileWatch();
  editor?.dispose();
  editor = null;
});
</script>

<style scoped>
.code-editor {
  display: grid;
  flex: 1;
  grid-template-rows: auto minmax(0, 1fr) auto;
  min-width: 0;
  min-height: 0;
  background: linear-gradient(180deg, #20242b 0%, #1a1d22 100%);
}

.code-editor__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #2b313a;
  padding: 10px 14px;
  background-color: rgba(20, 22, 27, 0.92);
}

.code-editor__file {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.code-editor__file strong {
  color: #eef2f7;
  font-size: 13px;
}

.code-editor__file span {
  overflow: hidden;
  color: #7f8a99;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.code-editor__language {
  border: 1px solid #334155;
  border-radius: 999px;
  padding: 4px 10px;
  background-color: #18212c;
  color: #8bd5ff;
  font-size: 11px;
  letter-spacing: 0.08em;
}

.code-editor__surface {
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.code-editor__status {
  display: flex;
  gap: 18px;
  align-items: center;
  border-top: 1px solid #2b313a;
  padding: 7px 14px;
  background-color: #12161b;
  color: #8b95a5;
  font-size: 11px;
}
</style>
