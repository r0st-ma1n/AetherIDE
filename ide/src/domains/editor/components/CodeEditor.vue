<template>
  <section class="code-editor">
    <header class="code-editor__header">
      <div class="code-editor__file">
        <strong>{{ fileName }}</strong>
        <span>{{ props.tab.filePath }}</span>
      </div>
      <span class="code-editor__language">{{ languageLabel }}</span>
    </header>

    <div class="code-editor__surface">
      <div class="code-editor__gutter" aria-hidden="true">
        <div
          class="code-editor__gutter-spacer"
          :style="{ height: `${gutterScrollOffset}px` }"
        ></div>
        <div
          v-for="line in lineNumbers"
          :key="line"
          class="code-editor__line-number"
          :class="{
            'code-editor__line-number--active': line === currentLine,
          }"
        >
          {{ line }}
        </div>
      </div>

      <textarea
        ref="textareaElement"
        v-model="content"
        class="code-editor__textarea"
        spellcheck="false"
        wrap="off"
        @input="handleInput"
        @scroll="syncScroll"
        @click="updateCaretState"
        @keyup="updateCaretState"
      ></textarea>
    </div>

    <footer class="code-editor__status">
      <span>Lines: {{ lineCount }}</span>
      <span>Line: {{ currentLine }}</span>
      <span>UTF-8</span>
      <span>{{ languageLabel }}</span>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
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
const textareaElement = ref<HTMLTextAreaElement | null>(null);
const gutterScrollOffset = ref(0);
const currentLine = ref(1);

const fileName = computed(() => basename(props.tab.filePath));
const languageLabel = computed(() =>
  editorStore.getDocumentLanguage(props.tab.filePath).toUpperCase()
);
const lineCount = computed(() => content.value.split('\n').length);
const lineNumbers = computed(() =>
  Array.from({ length: lineCount.value }, (_, index) => index + 1)
);

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
  updateCaretState();
}

function syncScroll() {
  gutterScrollOffset.value = textareaElement.value?.scrollTop ?? 0;
}

function updateCaretState() {
  const textarea = textareaElement.value;

  if (!textarea) {
    return;
  }

  currentLine.value =
    textarea.value.slice(0, textarea.selectionStart).split('\n').length || 1;
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
  updateCaretState();
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
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.code-editor__gutter {
  overflow: hidden;
  border-right: 1px solid #2b313a;
  padding: 14px 10px 14px 14px;
  background-color: #161a1f;
  user-select: none;
}

.code-editor__gutter-spacer {
  width: 1px;
}

.code-editor__line-number {
  height: 21px;
  color: #586273;
  font-family: 'Consolas', 'IBM Plex Mono', monospace;
  font-size: 13px;
  line-height: 21px;
  text-align: right;
}

.code-editor__line-number--active {
  color: #d7dde7;
}

.code-editor__textarea {
  width: 100%;
  height: 100%;
  border: none;
  padding: 14px 18px;
  background-color: transparent;
  color: #d4d4d4;
  resize: none;
  outline: none;
  font-family: 'Consolas', 'IBM Plex Mono', monospace;
  font-size: 14px;
  line-height: 1.5;
  caret-color: #8bd5ff;
  white-space: pre;
  tab-size: 2;
  overflow: auto;
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
