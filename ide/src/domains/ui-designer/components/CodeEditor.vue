<template>
  <div class="code-editor-container" ref="editorContainer"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import * as monaco from 'monaco-editor';
import { useWorkspaceStore } from '@/domains/workspace/stores/workspaceStore';
import { basename } from '@/shared/lib/path';
import type { WorkspaceTab } from '@/shared/types';

const props = defineProps<{
  tab: WorkspaceTab;
}>();

const workspaceStore = useWorkspaceStore();
const editorContainer = ref<HTMLElement | null>(null);
let editor: monaco.editor.IStandaloneCodeEditor | null = null;

async function loadFile() {
  let code = '';
  if (window.prototypeIDE.readFile) {
    try {
      code = (await window.prototypeIDE.readFile(props.tab.filePath)) || '';
    } catch (e) {
      console.error('Failed to read file', e);
    }
  }
  return code;
}

async function saveFile() {
  if (!editor || !window.prototypeIDE.writeFile) return;

  const code = editor.getValue();
  try {
    await window.prototypeIDE.writeFile(props.tab.filePath, code);
    workspaceStore.markDirty(props.tab.id, false);
    workspaceStore.showToast(`Saved ${basename(props.tab.filePath)}`);
  } catch (e) {
    console.error('Failed to save file', e);
    workspaceStore.showToast('Failed to save file');
  }
}

function handleSaveShortcut(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
    if (workspaceStore.activeTabId === props.tab.id) {
      event.preventDefault();
      void saveFile();
    }
  }
}

onMounted(async () => {
  if (!editorContainer.value) return;

  const code = await loadFile();

  // Определяем язык по расширению файла
  const extension = props.tab.filePath.split('.').pop()?.toLowerCase();
  const language = ['cpp', 'h', 'c'].includes(extension || '')
    ? 'cpp'
    : extension === 'json'
      ? 'json'
      : ['ts', 'js'].includes(extension || '')
        ? 'typescript'
        : 'plaintext';

  editor = monaco.editor.create(editorContainer.value, {
    value: code,
    language: language,
    theme: 'vs-dark',
    automaticLayout: true,
    minimap: { enabled: false },
    fontSize: 14,
  });

  editor.onDidChangeModelContent(() => {
    if (workspaceStore.activeTabId === props.tab.id) {
      workspaceStore.markDirty(props.tab.id, true);
    }
  });

  window.addEventListener('keydown', handleSaveShortcut);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleSaveShortcut);
  if (editor) {
    editor.dispose();
  }
});
</script>

<style scoped>
.code-editor-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex: 1;
  background-color: #1e1e1e;
}
</style>
