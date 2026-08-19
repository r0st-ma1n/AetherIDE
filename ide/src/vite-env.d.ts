/// <reference types="vite/client" />

import type { ProjectFileEntry, RecentProjectEntry } from '@/shared/types';

declare module '*.vue' {
  import type { DefineComponent } from 'vue';

  const component: DefineComponent<
    Record<string, never>,
    Record<string, never>,
    unknown
  >;
  export default component;
}

declare module '*.template?raw' {
  const content: string;
  export default content;
}

declare module '*?raw' {
  const content: string;
  export default content;
}

export type UnsavedDialogChoice = 'save' | 'discard' | 'cancel';

declare global {
  interface Window {
    prototypeIDE: {
      version: string;
      onToggleDebugPanel: (callback: () => void) => () => void;
      onFileChanged: (callback: (relativePath: string) => void) => () => void;
      onProjectRootChanged: (
        callback: (rootPath: string | null) => void
      ) => () => void;
      onQuitRequested: (callback: () => void) => () => void;
      onCloseProjectRequested: (callback: () => void) => () => void;
      onNewProjectRequested: (callback: () => void) => () => void;
      onRecentProjectsChanged: (
        callback: (recent: RecentProjectEntry[]) => void
      ) => () => void;
      onSaveRequested: (callback: () => void) => () => void;
      onSaveAllRequested: (callback: () => void) => () => void;
      onBuildRequested: (callback: () => void) => () => void;
      onBuildStopRequested: (callback: () => void) => () => void;
      onBuildLog: (callback: (chunk: string) => void) => () => void;
      onBuildStatus: (
        callback: (payload: {
          status: 'idle' | 'building' | 'success' | 'failed' | 'cancelled';
          exitCode: number | null;
          message?: string;
        }) => void
      ) => () => void;
      getProjectRoot: () => Promise<string | null>;
      setProjectRoot: (rootPath: string) => Promise<string>;
      clearProjectRoot: () => Promise<null>;
      openProjectDialog: () => Promise<string | null>;
      getRecentProjects: () => Promise<RecentProjectEntry[]>;
      openRecentProject: (projectPath: string) => Promise<string | null>;
      clearRecentProjects: () => Promise<RecentProjectEntry[]>;
      chooseDirectory: (payload?: { title?: string }) => Promise<string | null>;
      scaffoldProject: (payload: {
        parentDir: string;
        folderName: string;
        files: Record<string, string>;
      }) => Promise<string>;
      buildProject: () => Promise<{
        status: 'idle' | 'building' | 'success' | 'failed' | 'cancelled';
        exitCode: number | null;
        message?: string;
      }>;
      stopBuild: () => Promise<boolean>;
      listProjectFiles: () => Promise<ProjectFileEntry[]>;
      readFile: (path: string) => Promise<string>;
      fileExists: (path: string) => Promise<boolean>;
      writeFile: (path: string, content: string) => Promise<{ ok: boolean }>;
      confirmUnsaved: (payload?: {
        title?: string;
        message?: string;
        detail?: string;
      }) => Promise<UnsavedDialogChoice>;
      confirmQuit: () => Promise<boolean>;
      cancelQuit: () => Promise<boolean>;
    };
  }
}

export {};
