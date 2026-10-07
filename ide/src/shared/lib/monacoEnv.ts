import editorWorker from 'monaco-editor/editor/editor.worker?worker';

interface MonacoEnv {
  getWorker: (_moduleId: string, _label: string) => Worker;
}

(self as unknown as { MonacoEnvironment: MonacoEnv }).MonacoEnvironment = {
  getWorker() {
    return new editorWorker();
  },
};
