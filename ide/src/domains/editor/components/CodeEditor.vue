<template>
  <section class="code-editor">
    <textarea
      v-model="content"
      class="code-editor__textarea"
      spellcheck="false"
      @input="handleInput"
    ></textarea>
  </section>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
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
const content = ref('');

async function loadFile() {
  const nextContent = await window.prototypeIDE.readFile(props.tab.filePath);
  editorStore.setActiveFile(props.tab.filePath);
  editorStore.setDocumentContent(props.tab.filePath, nextContent);
  content.value = nextContent;
  workspaceStore.markDirty(props.tab.id, false);
}

async function saveFile() {
  const currentContent = content.value;
  editorStore.setDocumentContent(props.tab.filePath, currentContent);
  await window.prototypeIDE.writeFile(props.tab.filePath, currentContent);

  if (props.tab.filePath.endsWith('.h')) {
    const baseDir = dirname(props.tab.filePath);
    const baseName = basenameWithoutExt(props.tab.filePath);
    const uiPath = joinPath(baseDir, `${baseName}.ui`);
    const uiExists = await window.prototypeIDE.fileExists(uiPath);

    if (uiExists) {
      const components = parseGeneratedCode(currentContent);

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

function handleInput() {
  editorStore.setDocumentContent(props.tab.filePath, content.value);
  workspaceStore.markDirty(props.tab.id, true);
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
});
</script>

<style scoped>
.code-editor {
  display: flex;
  flex: 1;
  min-width: 0;
  min-height: 0;
  background-color: #1e1e1e;
}

.code-editor__textarea {
  width: 100%;
  height: 100%;
  border: none;
  padding: 16px 18px;
  background-color: #1e1e1e;
  color: #d4d4d4;
  resize: none;
  outline: none;
  font-family: 'Consolas', 'IBM Plex Mono', monospace;
  font-size: 14px;
  line-height: 1.5;
  white-space: pre;
  tab-size: 2;
}
</style>
