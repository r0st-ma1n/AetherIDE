<template>
  <section class="code-editor">
    <div ref="editorElement" class="code-editor__body"></div>
  </section>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { monaco } from '@/domains/editor/lib/monaco';
import { useEditorStore } from '@/domains/editor/stores/editorStore';
import { parseGeneratedCode } from '@/domains/ui-designer/lib/codeParser';
import { serializeUiDocument } from '@/domains/ui-designer/lib/uiDocument';
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
const editorElement = ref<HTMLElement | null>(null);
const editor = ref<monaco.editor.IStandaloneCodeEditor | null>(null);

async function loadFile() {
  const content = await window.prototypeIDE.readFile(props.tab.filePath);
  editorStore.setActiveFile(props.tab.filePath);
  editorStore.setDocumentContent(props.tab.filePath, content);

  if (editor.value) {
    const model = editor.value.getModel();
    const language = editorStore.getDocumentLanguage(props.tab.filePath);

    if (model) {
      model.setValue(content);
      monaco.editor.setModelLanguage(model, language);
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

  const content = editor.value.getValue();
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
        await window.prototypeIDE.writeFile(
          uiPath,
          serializeUiDocument(components)
        );
      }
    }
  }

  workspaceStore.markDirty(props.tab.id, false);
  workspaceStore.showToast(`Saved ${basename(props.tab.filePath)}`);
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
    language: editorStore.getDocumentLanguage(props.tab.filePath),
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
    editorStore.setDocumentContent(
      props.tab.filePath,
      editor.value?.getValue() ?? ''
    );
    workspaceStore.markDirty(props.tab.id, true);
  });

  await loadFile();
  window.addEventListener('keydown', bindSaveShortcut);
});

watch(
  () => props.tab.filePath,
  async () => {
    await loadFile();
  }
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
