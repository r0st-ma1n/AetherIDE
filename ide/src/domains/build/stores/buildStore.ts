import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export type BuildStatus =
  | 'idle'
  | 'building'
  | 'success'
  | 'failed'
  | 'cancelled';

const MAX_LOG_CHARS = 200_000;

export const useBuildStore = defineStore('build', () => {
  const status = ref<BuildStatus>('idle');
  const logText = ref('');
  const exitCode = ref<number | null>(null);
  const lastMessage = ref<string | null>(null);
  const isCollapsed = ref(false);
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

  function applyStatus(payload: {
    status: BuildStatus;
    exitCode: number | null;
    message?: string;
  }) {
    status.value = payload.status;
    exitCode.value = payload.exitCode;
    if (payload.message) {
      lastMessage.value = payload.message;
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

    try {
      const result = await window.prototypeIDE.buildProject();
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
    clearLog,
    disposeListeners,
    ensureListeners,
    exitCode,
    isBuilding,
    isCollapsed,
    lastMessage,
    logText,
    startBuild,
    status,
    statusLabel,
    stopBuild,
    toggleCollapsed,
  };
});
