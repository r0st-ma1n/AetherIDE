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
import {
  buildAetherDocumentFromCpp,
  buildLinkedPluginPaths,
  loadExistingAetherCanvas,
  serializeAetherFromSpec,
} from '@/domains/ui-designer/lib/uiSync';
import { useUiDesignerStore } from '@/domains/ui-designer/stores/uiDesignerStore';
import { registerTabSaveHandler } from '@/domains/workspace/lib/tabSaveRegistry';
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
const designerStore = useUiDesignerStore();
const containerRef = ref<HTMLElement | null>(null);
const currentLine = ref(1);
const currentCol = ref(1);
const lineCount = ref(1);

let editor: monaco.editor.IStandaloneCodeEditor | null = null;
let unregisterSaveHandler: (() => void) | null = null;

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

async function syncDesignerFromCppSource(cppSource: string) {
  const paths = buildLinkedPluginPaths(
    props.tab.filePath,
    joinPath,
    dirname,
    basenameWithoutExt
  );

  const aetherExists = await window.prototypeIDE.fileExists(paths.aetherPath);
  if (!aetherExists) {
    return;
  }

  const canvas = await loadExistingAetherCanvas(
    paths.aetherPath,
    (path) => window.prototypeIDE.readFile(path),
    (path) => window.prototypeIDE.fileExists(path)
  );
  const doc = buildAetherDocumentFromCpp(cppSource, canvas);
  if (!doc) {
    return;
  }

  await window.prototypeIDE.writeFile(
    paths.aetherPath,
    serializeAetherFromSpec(
      paths.aetherPath,
      { components: doc.components },
      doc.canvasWidth,
      doc.canvasHeight
    )
  );

  const designerTab = workspaceStore.tabs.find(
    (tab) => tab.filePath === paths.aetherPath && tab.kind === 'designer'
  );

  if (!designerTab) {
    return;
  }

  if (designerTab.isDirty) {
    workspaceStore.showToast(
      'Code save overwrote unsaved designer changes (last-save-wins)'
    );
  }

  if (
    designerStore.currentDocumentPath === paths.aetherPath ||
    designerTab.id === workspaceStore.activeTabId
  ) {
    designerStore.applyDocument(doc, paths.aetherPath);
  }

  workspaceStore.markDirty(designerTab.id, false);
}

async function saveFile() {
  if (!editor) return;
  const content = editor.getValue();
  editorStore.setDocumentContent(props.tab.filePath, content);
  await window.prototypeIDE.writeFile(props.tab.filePath, content);

  const isCpp = props.tab.filePath.endsWith('.cpp');
  const isHeader = props.tab.filePath.endsWith('.h');

  if (isCpp || isHeader) {
    try {
      let cppSource = content;
      if (isHeader) {
        const paths = buildLinkedPluginPaths(
          props.tab.filePath,
          joinPath,
          dirname,
          basenameWithoutExt
        );
        cppSource = await window.prototypeIDE.readFile(paths.cppPath);
      }
      await syncDesignerFromCppSource(cppSource);
    } catch (error) {
      console.error('Failed to sync designer from code:', error);
      workspaceStore.showToast(
        error instanceof Error
          ? error.message
          : 'Failed to sync designer from code.'
      );
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

  unregisterSaveHandler = registerTabSaveHandler(props.tab.id, saveFile);

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

watch(
  () => props.tab.id,
  (tabId) => {
    unregisterSaveHandler?.();
    unregisterSaveHandler = registerTabSaveHandler(tabId, saveFile);
  }
);

const unsubscribeFileWatch = window.prototypeIDE.onFileChanged(
  async (changedPath: string) => {
    if (
      changedPath === props.tab.filePath &&
      !workspaceStore.tabs.find((tab) => tab.id === props.tab.id)?.isDirty
    ) {
      await loadFile();
    }
  }
);

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown);
  unsubscribeFileWatch();
  unregisterSaveHandler?.();
  unregisterSaveHandler = null;
  editor?.dispose();
  editor = null;
});
</script>

<style scoped>
.code-editor {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  background: #1e1e1e;
}

.code-editor__header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  padding: 10px 14px;
  border-bottom: 1px solid #2c323a;
  color: #c8d1dc;
  font-size: 12px;
}

.code-editor__file {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.code-editor__file strong {
  color: #e8eef7;
}

.code-editor__file span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #8b949e;
}

.code-editor__language {
  flex-shrink: 0;
  color: #8b949e;
}

.code-editor__surface {
  flex: 1;
  min-height: 0;
}

.code-editor__status {
  display: flex;
  gap: 16px;
  padding: 6px 14px;
  border-top: 1px solid #2c323a;
  color: #8b949e;
  font-size: 11px;
}
</style>
