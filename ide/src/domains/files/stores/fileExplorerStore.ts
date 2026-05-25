import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { WorkspaceTab } from '@/shared/types';

const DEFAULT_ENTRIES: WorkspaceTab[] = [
  {
    id: 'designer:gain',
    title: 'GainPlugin.ui',
    filePath: 'ide/GainPlugin.ui',
    kind: 'designer',
    isDirty: false,
  },
  {
    id: 'code:main',
    title: 'main.ts',
    filePath: 'ide/src/main.ts',
    kind: 'code',
    isDirty: false,
  },
  {
    id: 'code:app-shell',
    title: 'AppShell.vue',
    filePath: 'ide/src/app/AppShell.vue',
    kind: 'code',
    isDirty: false,
  },
];

export const useFileExplorerStore = defineStore('file-explorer', () => {
  const entries = ref(DEFAULT_ENTRIES);

  return {
    entries,
  };
});
