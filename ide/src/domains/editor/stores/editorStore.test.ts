import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { useEditorStore } from './editorStore';

describe('editorStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('setActiveFile updates activeFilePath', () => {
    const store = useEditorStore();
    store.setActiveFile('src/main.ts');
    expect(store.activeFilePath).toBe('src/main.ts');
  });

  it('setDocumentContent stores content and language', () => {
    const store = useEditorStore();
    store.setDocumentContent('foo.cpp', '#include <stdio.h>');
    expect(store.getDocumentContent('foo.cpp')).toBe('#include <stdio.h>');
    expect(store.getDocumentLanguage('foo.cpp')).toBe('cpp');
  });

  it('currentContent reflects active file content', () => {
    const store = useEditorStore();
    store.setDocumentContent('a.ts', 'const x = 1;');
    store.setActiveFile('a.ts');
    expect(store.currentContent).toBe('const x = 1;');
  });

  it('currentLanguage defaults to plaintext for unknown extensions', () => {
    const store = useEditorStore();
    store.setActiveFile('file.xyz');
    expect(store.currentLanguage).toBe('plaintext');
  });

  it('detects language correctly for common extensions', () => {
    const store = useEditorStore();
    const cases: [string, string][] = [
      ['file.ts', 'typescript'],
      ['file.js', 'javascript'],
      ['file.json', 'json'],
      ['file.vue', 'html'],
      ['file.cpp', 'cpp'],
      ['file.h', 'cpp'],
      ['file.md', 'markdown'],
    ];

    for (const [filePath, expectedLang] of cases) {
      store.setDocumentContent(filePath, '');
      expect(store.getDocumentLanguage(filePath)).toBe(expectedLang);
    }
  });

  it('getDocumentContent returns empty string for unknown file', () => {
    const store = useEditorStore();
    expect(store.getDocumentContent('nonexistent.ts')).toBe('');
  });
});
