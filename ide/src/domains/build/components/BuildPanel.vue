<template>
  <section
    class="build-panel"
    :class="{ 'build-panel--collapsed': store.isCollapsed }"
  >
    <header class="build-panel__header">
      <button
        class="build-panel__toggle"
        type="button"
        @click="store.toggleCollapsed()"
      >
        {{ store.isCollapsed ? '▸' : '▾' }} Build
      </button>

      <span
        class="build-panel__status"
        :class="`build-panel__status--${store.status}`"
      >
        {{ store.statusLabel }}
      </span>

      <div class="build-panel__actions">
        <button
          class="build-panel__button"
          type="button"
          :disabled="store.isBuilding || !projectStore.hasProject"
          @click="onBuild"
        >
          Build
        </button>
        <button
          class="build-panel__button"
          type="button"
          :disabled="!store.isBuilding"
          @click="onStop"
        >
          Stop
        </button>
        <button
          class="build-panel__button"
          type="button"
          :disabled="!store.logText"
          @click="store.clearLog()"
        >
          Clear
        </button>
      </div>
    </header>

    <pre v-show="!store.isCollapsed" ref="logEl" class="build-panel__log">{{
      store.logText || 'Build output will appear here.'
    }}</pre>
  </section>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useBuildStore } from '@/domains/build/stores/buildStore';
import { useProjectStore } from '@/domains/workspace/stores/projectStore';
import { useWorkspaceStore } from '@/domains/workspace/stores/workspaceStore';

const store = useBuildStore();
const projectStore = useProjectStore();
const workspaceStore = useWorkspaceStore();
const logEl = ref<HTMLElement | null>(null);

async function scrollToBottom() {
  await nextTick();
  if (logEl.value) {
    logEl.value.scrollTop = logEl.value.scrollHeight;
  }
}

watch(
  () => store.logText,
  () => {
    void scrollToBottom();
  }
);

async function onBuild() {
  const result = await store.startBuild();
  if (result.status === 'success') {
    workspaceStore.showToast('Build succeeded.');
  } else if (result.status === 'failed') {
    workspaceStore.showToast(result.message ?? 'Build failed.');
  } else if (result.status === 'cancelled') {
    workspaceStore.showToast('Build cancelled.');
  }
}

async function onStop() {
  const stopped = await store.stopBuild();
  if (!stopped) {
    workspaceStore.showToast('No build is running.');
  }
}

onMounted(() => {
  store.ensureListeners();
});

onBeforeUnmount(() => {
  store.disposeListeners();
});
</script>

<style scoped>
.build-panel {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  height: 220px;
  border-top: 1px solid #2c3340;
  background: #1a1d23;
}

.build-panel--collapsed {
  height: auto;
}

.build-panel__header {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  padding: 6px 10px;
  border-bottom: 1px solid #2c3340;
  background: #22262e;
}

.build-panel__toggle {
  border: none;
  background: transparent;
  color: #d7dde8;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
}

.build-panel__status {
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 11px;
  background: #2c3340;
  color: #aab4c3;
}

.build-panel__status--building {
  background: #3a3a18;
  color: #e6d36a;
}

.build-panel__status--success {
  background: #1f3a28;
  color: #8fd19e;
}

.build-panel__status--failed {
  background: #3a1f1f;
  color: #f0a0a0;
}

.build-panel__status--cancelled {
  background: #2f2a3a;
  color: #c4b6e6;
}

.build-panel__actions {
  margin-left: auto;
  display: flex;
  gap: 6px;
}

.build-panel__button {
  border: 1px solid #3a4150;
  background: #1c212b;
  color: #d7dde8;
  border-radius: 4px;
  padding: 3px 8px;
  font-size: 12px;
  cursor: pointer;
}

.build-panel__button:hover:not(:disabled) {
  background: #252b36;
}

.build-panel__button:disabled {
  opacity: 0.45;
  cursor: default;
}

.build-panel__log {
  flex: 1;
  margin: 0;
  padding: 8px 10px;
  overflow: auto;
  font-family: Consolas, 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.45;
  color: #c8d0dc;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
