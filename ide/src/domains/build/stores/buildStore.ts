import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export type BuildStatus =
  | 'idle'
  | 'building'
  | 'success'
  | 'failed'
  | 'cancelled';

export type BuildConfig = 'Debug' | 'Release';

const MAX_LOG_CHARS = 200_000;
const CONFIG_STORAGE_KEY = 'aether.build.config';

function readStoredConfig(): BuildConfig {
  try {
    return localStorage.getItem(CONFIG_STORAGE_KEY) === 'Debug'
      ? 'Debug'
      : 'Release';
  } catch {
    return 'Release';
  }
}

export const useBuildStore = defineStore('build', () => {
  const status = ref<BuildStatus>('idle');
  const logText = ref('');
  const exitCode = ref<number | null>(null);
  const lastMessage = ref<string | null>(null);
  const isCollapsed = ref(false);
  /** Configuration of the next build; remembered per user. */
  const config = ref<BuildConfig>(readStoredConfig());
  /** Plugin bundles (.vst3) of the last successful build. */
  const artifacts = ref<string[]>([]);
  let removeLogListener: (() => void) | null = null;
  let removeStatusListener: (() => void) | null = null;

  const isBuilding = computed(() => status.value === 'building');
  const statusLabel = computed(() => {
    switch (status.value) {
      case 'building':
        return 'Building';
      case 'success':
        return 'Success';
      case 'failed':
        return 'Failed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Idle';
    }
  });

  function appendLog(chunk: string) {
    logText.value += chunk;
    if (logText.value.length > MAX_LOG_CHARS) {
      logText.value = logText.value.slice(logText.value.length - MAX_LOG_CHARS);
    }
  }

  function clearLog() {
    logText.value = '';
    exitCode.value = null;
    lastMessage.value = null;
  }

  function setConfig(next: BuildConfig) {
    config.value = next;
    try {
      localStorage.setItem(CONFIG_STORAGE_KEY, next);
    } catch {
      // Storage unavailable: the choice lasts for this session only.
    }
  }

  function applyStatus(payload: {
    status: BuildStatus;
    exitCode: number | null;
    message?: string;
    artifacts?: string[];
  }) {
    status.value = payload.status;
    exitCode.value = payload.exitCode;
    if (payload.message) {
      lastMessage.value = payload.message;
    }
    if (payload.artifacts) {
      artifacts.value = [...payload.artifacts];
    }
  }

  function ensureListeners() {
    if (!removeLogListener) {
      removeLogListener = window.prototypeIDE.onBuildLog((chunk) => {
        appendLog(chunk);
      });
    }
    if (!removeStatusListener) {
      removeStatusListener = window.prototypeIDE.onBuildStatus((payload) => {
        applyStatus(payload);
      });
    }
  }

  async function startBuild() {
    ensureListeners();
    isCollapsed.value = false;
    clearLog();
    status.value = 'building';
    lastMessage.value = null;
    exitCode.value = null;
    artifacts.value = [];

    try {
      const result = await window.prototypeIDE.buildProject({
        config: config.value,
      });
      applyStatus(result);
      return result;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Build failed to start.';
      appendLog(`${message}\n`);
      applyStatus({ status: 'failed', exitCode: null, message });
      return { status: 'failed' as const, exitCode: null, message };
    }
  }

  async function stopBuild() {
    return window.prototypeIDE.stopBuild();
  }

  /** Shows the first built bundle in the system file manager. */
  async function revealArtifact() {
    const bundle = artifacts.value[0];
    return bundle ? window.prototypeIDE.showInFolder(bundle) : false;
  }

  function toggleCollapsed() {
    isCollapsed.value = !isCollapsed.value;
  }

  function disposeListeners() {
    removeLogListener?.();
    removeLogListener = null;
    removeStatusListener?.();
    removeStatusListener = null;
  }

  return {
    appendLog,
    applyStatus,
    artifacts,
    clearLog,
    config,
    disposeListeners,
    ensureListeners,
    exitCode,
    isBuilding,
    isCollapsed,
    lastMessage,
    logText,
    revealArtifact,
    setConfig,
    startBuild,
    status,
    statusLabel,
    stopBuild,
    toggleCollapsed,
  };
});
