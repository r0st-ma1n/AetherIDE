import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export type EditorLanguage =
  | 'cpp'
  | 'json'
  | 'plaintext'
  | 'typescript'
  | 'javascript'
  | 'html'
  | 'markdown';

function detectLanguage(filePath: string): EditorLanguage {
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

  if (
    filePath.endsWith('.cpp') ||
    filePath.endsWith('.c') ||
    filePath.endsWith('.h')
  ) {
    return 'cpp';
  }

  if (filePath.endsWith('.md')) {
    return 'markdown';
  }

  return 'plaintext';
}

export const useEditorStore = defineStore('editor', () => {
  const activeFilePath = ref<string | null>(null);
  const documentContents = ref<Record<string, string>>({});
  const documentLanguages = ref<Record<string, EditorLanguage>>({});

  const currentContent = computed(() =>
    activeFilePath.value
      ? (documentContents.value[activeFilePath.value] ?? '')
      : ''
  );

  const currentLanguage = computed(() =>
    activeFilePath.value
      ? (documentLanguages.value[activeFilePath.value] ?? 'plaintext')
      : 'plaintext'
  );

  function setActiveFile(filePath: string) {
    activeFilePath.value = filePath;
    documentLanguages.value[filePath] = detectLanguage(filePath);
  }

  function setDocumentContent(filePath: string, content: string) {
    documentContents.value[filePath] = content;
    documentLanguages.value[filePath] = detectLanguage(filePath);
  }

  function getDocumentContent(filePath: string) {
    return documentContents.value[filePath] ?? '';
  }

  function getDocumentLanguage(filePath: string) {
    return documentLanguages.value[filePath] ?? detectLanguage(filePath);
  }

  return {
    activeFilePath,
    currentContent,
    currentLanguage,
    documentContents,
    documentLanguages,
    getDocumentContent,
    getDocumentLanguage,
    setActiveFile,
    setDocumentContent,
  };
});
