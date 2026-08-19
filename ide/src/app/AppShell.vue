<template>
  <div class="ide-shell">
    <aside class="ide-shell__left">
      <FileExplorer @new-project="showNewProject = true" />
      <ComponentPalette />
    </aside>

    <main class="ide-shell__main">
      <div class="ide-shell__workspace">
        <WorkspaceView />
      </div>
      <BuildPanel />
    </main>

    <aside class="ide-shell__right">
      <PropertiesPanel />
    </aside>

    <NewProjectWizard
      :open="showNewProject"
      @cancel="showNewProject = false"
      @created="onProjectCreated"
    />

    <div v-if="workspaceStore.toastMessage" class="ide-shell__toast">
      {{ workspaceStore.toastMessage }}
    </div>

    <aside
      v-if="isDebugVisible"
      class="ide-debug"
      :style="{
        left: `${debugPanelPosition.x}px`,
        top: `${debugPanelPosition.y}px`,
      }"
    >
      <div class="ide-debug__header" @mousedown="startDebugDrag">
        <div class="ide-debug__title">Debug</div>
        <button
          class="ide-debug__close"
          type="button"
          @click="isDebugVisible = false"
        >
          x
        </button>
      </div>
      <div class="ide-debug__row">
        <span>Active tab</span>
        <strong>{{ workspaceStore.activeTabId ?? 'none' }}</strong>
      </div>
      <div class="ide-debug__row">
        <span>Pointer</span>
        <strong>{{ debugState.pointer.x }}, {{ debugState.pointer.y }}</strong>
      </div>
      <div class="ide-debug__row">
        <span>Hover</span>
        <strong>{{ debugState.hoverTarget }}</strong>
      </div>
      <div class="ide-debug__row">
        <span>Last down</span>
        <strong>{{ debugState.lastPointerDown }}</strong>
      </div>
      <div class="ide-debug__row">
        <span>Last click</span>
        <strong>{{ debugState.lastClick }}</strong>
      </div>
      <div class="ide-debug__row">
        <span>Error</span>
        <strong>{{ debugState.lastError ?? 'none' }}</strong>
      </div>
      <div class="ide-debug__events">
        <div
          v-for="event in debugState.events"
          :key="event.id"
          class="ide-debug__event"
        >
          {{ event.message }}
        </div>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import FileExplorer from '@/domains/files/components/FileExplorer.vue';
import BuildPanel from '@/domains/build/components/BuildPanel.vue';
import NewProjectWizard from '@/domains/templates/components/NewProjectWizard.vue';
import ComponentPalette from '@/domains/ui-designer/components/ComponentPalette.vue';
import PropertiesPanel from '@/domains/ui-designer/components/PropertiesPanel.vue';
import WorkspaceView from '@/domains/workspace/components/WorkspaceView.vue';
import { useBuildStore } from '@/domains/build/stores/buildStore';
import {
  requestCloseProject,
  requestQuitApp,
  saveActiveTab,
  saveAllDirtyTabs,
} from '@/domains/workspace/lib/unsavedGuard';
import { useWorkspaceStore } from '@/domains/workspace/stores/workspaceStore';

const workspaceStore = useWorkspaceStore();
const buildStore = useBuildStore();
const showNewProject = ref(false);
const isDebugVisible = ref(false);
const debugPanelPosition = reactive({
  x: 20,
  y: 20,
});
let dragOffsetX = 0;
let dragOffsetY = 0;
let isDraggingDebug = false;
let removeDebugToggleListener: (() => void) | null = null;
let removeQuitListener: (() => void) | null = null;
let removeCloseProjectListener: (() => void) | null = null;
let removeNewProjectListener: (() => void) | null = null;
let removeSaveListener: (() => void) | null = null;
let removeSaveAllListener: (() => void) | null = null;
let removeBuildListener: (() => void) | null = null;
let removeBuildStopListener: (() => void) | null = null;

const debugState = reactive({
  pointer: {
    x: 0,
    y: 0,
  },
  hoverTarget: 'none',
  lastPointerDown: 'none',
  lastClick: 'none',
  lastError: null as string | null,
  events: [] as Array<{
    id: string;
    message: string;
  }>,
});

function formatElement(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return 'non-html-target';
  }

  const parts = [target.tagName.toLowerCase()];

  if (target.id) {
    parts.push(`#${target.id}`);
  }

  const className =
    typeof target.className === 'string' ? target.className.trim() : '';

  if (className) {
    parts.push(
      ...className
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 3)
        .map((item) => `.${item}`)
    );
  }

  return parts.join('');
}

function pushDebugEvent(message: string) {
  debugState.events.unshift({
    id: `${Date.now()}-${Math.random()}`,
    message,
  });

  if (debugState.events.length > 8) {
    debugState.events.splice(8);
  }
}

function startDebugDrag(event: MouseEvent) {
  isDraggingDebug = true;
  dragOffsetX = event.clientX - debugPanelPosition.x;
  dragOffsetY = event.clientY - debugPanelPosition.y;
}

function handleDebugDrag(event: MouseEvent) {
  if (!isDraggingDebug) {
    return;
  }

  debugPanelPosition.x = Math.max(12, event.clientX - dragOffsetX);
  debugPanelPosition.y = Math.max(12, event.clientY - dragOffsetY);
}

function stopDebugDrag() {
  isDraggingDebug = false;
}

function handlePointerMove(event: PointerEvent) {
  debugState.pointer.x = Math.round(event.clientX);
  debugState.pointer.y = Math.round(event.clientY);
  debugState.hoverTarget = formatElement(
    document.elementFromPoint(event.clientX, event.clientY)
  );
}

function handlePointerDown(event: PointerEvent) {
  const target = formatElement(event.target);
  debugState.lastPointerDown = target;
  pushDebugEvent(
    `down ${Math.round(event.clientX)},${Math.round(event.clientY)} ${target}`
  );
}

function handleClick(event: MouseEvent) {
  const target = formatElement(event.target);
  debugState.lastClick = target;
  pushDebugEvent(
    `click ${Math.round(event.clientX)},${Math.round(event.clientY)} ${target}`
  );
}

function handleWindowError(event: ErrorEvent) {
  debugState.lastError = event.message || 'window error';
  pushDebugEvent(`error ${debugState.lastError}`);
}

function handleUnhandledRejection(event: PromiseRejectionEvent) {
  const reason =
    event.reason instanceof Error
      ? event.reason.message
      : String(event.reason ?? 'promise rejection');
  debugState.lastError = reason;
  pushDebugEvent(`reject ${reason}`);
}

function toggleDebugPanel() {
  isDebugVisible.value = !isDebugVisible.value;
}

function onProjectCreated(payload: {
  projectRoot: string;
  aetherPath: string;
}) {
  showNewProject.value = false;
  workspaceStore.showToast(
    `Created ${payload.aetherPath} in ${payload.projectRoot}`
  );
}

onMounted(() => {
  window.addEventListener('pointermove', handlePointerMove, true);
  window.addEventListener('pointerdown', handlePointerDown, true);
  window.addEventListener('click', handleClick, true);
  window.addEventListener('mousemove', handleDebugDrag);
  window.addEventListener('mouseup', stopDebugDrag);
  window.addEventListener('error', handleWindowError);
  window.addEventListener('unhandledrejection', handleUnhandledRejection);
  removeDebugToggleListener =
    window.prototypeIDE.onToggleDebugPanel(toggleDebugPanel);
  removeQuitListener = window.prototypeIDE.onQuitRequested(() => {
    void requestQuitApp();
  });
  removeCloseProjectListener = window.prototypeIDE.onCloseProjectRequested(
    () => {
      void requestCloseProject();
    }
  );
  removeNewProjectListener = window.prototypeIDE.onNewProjectRequested(() => {
    showNewProject.value = true;
  });
  removeSaveListener = window.prototypeIDE.onSaveRequested(() => {
    void saveActiveTab();
  });
  removeSaveAllListener = window.prototypeIDE.onSaveAllRequested(() => {
    void saveAllDirtyTabs();
  });
  removeBuildListener = window.prototypeIDE.onBuildRequested(() => {
    void buildStore.startBuild();
  });
  removeBuildStopListener = window.prototypeIDE.onBuildStopRequested(() => {
    void buildStore.stopBuild();
  });
});

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', handlePointerMove, true);
  window.removeEventListener('pointerdown', handlePointerDown, true);
  window.removeEventListener('click', handleClick, true);
  window.removeEventListener('mousemove', handleDebugDrag);
  window.removeEventListener('mouseup', stopDebugDrag);
  window.removeEventListener('error', handleWindowError);
  window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  removeDebugToggleListener?.();
  removeDebugToggleListener = null;
  removeQuitListener?.();
  removeQuitListener = null;
  removeCloseProjectListener?.();
  removeCloseProjectListener = null;
  removeNewProjectListener?.();
  removeNewProjectListener = null;
  removeSaveListener?.();
  removeSaveListener = null;
  removeSaveAllListener?.();
  removeSaveAllListener = null;
  removeBuildListener?.();
  removeBuildListener = null;
  removeBuildStopListener?.();
  removeBuildStopListener = null;
});
</script>

<style scoped>
.ide-shell {
  display: flex;
  height: 100vh;
  min-height: 100vh;
  min-width: 0;
  overflow: hidden;
  background-color: #1e1e1e;
}

.ide-shell__left,
.ide-shell__right {
  position: relative;
  z-index: 2000;
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  min-height: 0;
  background-color: #252526;
}

.ide-shell__left {
  width: 280px;
  min-width: 200px;
  border-right: 1px solid #2c3340;
}

.ide-shell__right {
  width: 250px;
  min-width: 200px;
  border-left: 1px solid #2c3340;
}

.ide-shell__main {
  position: relative;
  z-index: 1;
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.ide-shell__workspace {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.ide-shell__toast {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 5000;
  border: 1px solid #3a3d41;
  border-radius: 6px;
  padding: 10px 14px;
  background-color: #252526;
  color: #fff;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
}

.ide-debug {
  position: fixed;
  z-index: 5000;
  width: 360px;
  max-height: 280px;
  overflow: auto;
  border: 1px solid #3a3d41;
  border-radius: 8px;
  padding: 10px;
  background-color: rgba(20, 21, 24, 0.95);
  color: #d6d8dd;
  font-size: 11px;
  line-height: 1.4;
}

.ide-debug__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: -10px -10px 8px;
  border-bottom: 1px solid #2f3338;
  padding: 8px 10px;
  cursor: move;
}

.ide-debug__title {
  font-weight: 700;
  color: #ffffff;
}

.ide-debug__close {
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: #c9ced6;
  cursor: pointer;
}

.ide-debug__close:hover {
  background-color: #3a3d41;
  color: #ffffff;
}

.ide-debug__row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 4px;
}

.ide-debug__row strong {
  max-width: 220px;
  overflow: hidden;
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #8bd5ff;
}

.ide-debug__events {
  margin-top: 10px;
  border-top: 1px solid #2f3338;
  padding-top: 8px;
}

.ide-debug__event {
  margin-bottom: 4px;
  color: #b7bec8;
  word-break: break-word;
}
</style>
