/// <reference types="vite/client" />

import type { ProjectFileEntry } from '@/shared/types';

declare module '*.vue' {
  import type { DefineComponent } from 'vue';

  const component: DefineComponent<Record<string, never>, Record<string, never>, unknown>;
  export default component;
}

declare global {
  interface Window {
    prototypeIDE: {
      version: string;
      listProjectFiles: () => Promise<ProjectFileEntry[]>;
      readFile: (path: string) => Promise<string>;
      writeFile: (path: string, content: string) => Promise<{ ok: boolean }>;
    };
  }
}

export {};
