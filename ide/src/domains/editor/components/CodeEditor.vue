<template>
  <section class="code-editor">
    <header class="code-editor__header">
      <span>{{ tab.title }}</span>
      <button class="code-editor__action" :disabled="isSaving" @click="saveFile">
        {{ isSaving ? 'Saving...' : 'Save' }}
      </button>
    </header>

    <div ref="editorElement" class="code-editor__body"></div>
  </section>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { monaco } from '@/domains/editor/lib/monaco';
import { useWorkspaceStore } from '@/domains/workspace/stores/workspaceStore';
import type { WorkspaceTab } from '@/shared/types';

const props = defineProps<{
  tab: WorkspaceTab;
}>();

const workspaceStore = useWorkspaceStore();
const editorElement = ref<HTMLElement | null>(null);
const editor = ref<monaco.editor.IStandaloneCodeEditor | null>(null);
const isSaving = ref(false);

function detectLanguage(filePath: string) {
  if (filePath.endsWith('.json')) {
    return 'json';
  }

  if (filePath.endsWith('.ts')) {
    return 'typescript';
  }

  if (filePath.endsWith('.js')) {
    return 'javascript';
  }

  if (filePath.endsWith('.vue')) {
    return 'html';
  }

  if (filePath.endsWith('.cpp') || filePath.endsWith('.c') || filePath.endsWith('.h')) {
    return 'cpp';
  }

  if (filePath.endsWith('.md')) {
    return 'markdown';
  }

  return 'plaintext';
}

async function loadFile() {
  const content = await window.prototypeIDE.readFile(props.tab.filePath);

  if (editor.value) {
    const model = editor.value.getModel();

    if (model) {
      model.setValue(content);
      monaco.editor.setModelLanguage(model, detectLanguage(props.tab.filePath));
    } else {
      editor.value.setValue(content);
    }
  }

  workspaceStore.markDirty(props.tab.id, false);
}

async function saveFile() {
  if (!editor.value) {
    return;
  }

  isSaving.value = true;

  try {
    await window.prototypeIDE.writeFile(props.tab.filePath, editor.value.getValue());
    workspaceStore.markDirty(props.tab.id, false);
  } finally {
    isSaving.value = false;
  }
}

function bindSaveShortcut(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
    event.preventDefault();

    if (workspaceStore.activeTabId === props.tab.id) {
      void saveFile();
    }
  }
}

onMounted(async () => {
  if (!editorElement.value) {
    return;
  }

  editor.value = monaco.editor.create(editorElement.value, {
    value: '',
    language: detectLanguage(props.tab.filePath),
    automaticLayout: true,
    minimap: {
      enabled: false,
    },
    theme: 'vs-dark',
    fontSize: 14,
    roundedSelection: false,
    scrollBeyondLastLine: false,
  });

  editor.value.onDidChangeModelContent(() => {
    workspaceStore.markDirty(props.tab.id, true);
  });

  await loadFile();
  window.addEventListener('keydown', bindSaveShortcut);
});

watch(
  () => props.tab.filePath,
  async () => {
    await loadFile();
  },
);

onBeforeUnmount(() => {
  window.removeEventListener('keydown', bindSaveShortcut);
  editor.value?.dispose();
});
</script>

<style scoped>
.code-editor {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  height: 100%;
  border: 1px solid #2f3541;
  border-radius: 20px;
  overflow: hidden;
  background-color: rgba(17, 19, 24, 0.95);
}

.code-editor__header {
  display: flex;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid #2f3541;
  color: #dce3ee;
}

.code-editor__action {
  border: 1px solid #3a4352;
  border-radius: 999px;
  background-color: transparent;
  color: #9fb0c8;
  padding: 6px 10px;
}

.code-editor__body {
  min-height: 420px;
}
</style>
