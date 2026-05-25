<template>
  <section class="code-editor">
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
  await window.prototypeIDE.writeFile(props.tab.filePath, editor.value.getValue());
  workspaceStore.markDirty(props.tab.id, false);
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
  display: flex;
  flex: 1;
  height: 100%;
}

.code-editor__body {
  width: 100%;
  height: 100%;
}
</style>
