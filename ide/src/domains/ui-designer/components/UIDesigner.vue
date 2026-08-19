<template>
  <section class="designer">
    <header class="designer__toolbar">
      <label class="designer__control">
        <span class="designer__control-label">Grid</span>
        <select
          class="designer__select"
          :value="designerStore.gridStep"
          @change="handleGridStepChange"
        >
          <option
            v-for="step in designerStore.gridSteps"
            :key="step"
            :value="step"
          >
            {{ step }}px
          </option>
        </select>
      </label>

      <label class="designer__control">
        <span class="designer__control-label">W</span>
        <input
          class="designer__size-input"
          type="number"
          min="100"
          max="2000"
          step="10"
          :value="designerStore.canvasWidth"
          @change="handleCanvasSizeChange('w', $event)"
        />
      </label>

      <label class="designer__control">
        <span class="designer__control-label">H</span>
        <input
          class="designer__size-input"
          type="number"
          min="100"
          max="2000"
          step="10"
          :value="designerStore.canvasHeight"
          @change="handleCanvasSizeChange('h', $event)"
        />
      </label>

      <label class="designer__toggle">
        <input
          :checked="designerStore.snapToGridEnabled"
          class="designer__toggle-input"
          type="checkbox"
          @change="handleSnapToggle"
        />
        <span class="designer__toggle-ui"></span>
        <span class="designer__toggle-label">
          Snap-to-grid
          <strong>
            {{ designerStore.snapToGridEnabled ? 'On' : 'Off' }}
          </strong>
        </span>
      </label>

      <div
        v-if="designerStore.selectionGroup.length >= 2"
        class="designer__align-group"
      >
        <button
          v-for="btn in ALIGN_BUTTONS"
          :key="btn.type"
          class="designer__align-btn"
          :title="btn.label"
          @click="
            btn.distribute
              ? designerStore.distributeGroup(btn.axis!)
              : designerStore.alignGroup(btn.type!)
          "
        >
          {{ btn.icon }}
        </button>
      </div>
    </header>

    <div class="designer__stage">
      <div
        ref="canvasElement"
        class="designer__canvas"
        :style="canvasStyle"
        @mousedown.self="handleCanvasMouseDown"
        @dragenter.prevent
        @dragover.prevent
        @drop.prevent="handleDrop"
      >
        <div
          v-if="selectionBoxVisible"
          class="designer__selection-box"
          :style="selectionBoxStyle"
        ></div>

        <div
          v-for="component in designerStore.components"
          :key="component.id"
          class="designer__component"
          :class="{
            'designer__component--active':
              component.id === designerStore.selectedComponentId,
            'designer__component--grouped':
              designerStore.selectionGroup.includes(component.id),
          }"
          :style="{
            left: `${component.position.x}px`,
            top: `${component.position.y}px`,
            width: `${component.size.width}px`,
            height: `${component.size.height}px`,
            backgroundColor: component.color ?? '#007acc',
            borderColor: component.color ?? '#005999',
          }"
          @mousedown="startDrag($event, component.id)"
          @click="handleComponentClick($event, component.id)"
        >
          <span class="designer__component-label">{{ component.type }}</span>

          <div
            v-if="component.id === designerStore.selectedComponentId"
            v-for="handle in RESIZE_HANDLES"
            :key="handle.direction"
            class="designer__resize-handle"
            :class="`designer__resize-handle--${handle.direction}`"
            @mousedown.stop.prevent="
              startResize($event, component.id, handle.direction)
            "
          ></div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type {
  AlignType,
  DistributeAxis,
} from '@/domains/ui-designer/lib/alignComponents';
import { registerTabSaveHandler } from '@/domains/workspace/lib/tabSaveRegistry';
import {
  generateLinkedPluginSources,
  buildLinkedPluginPaths,
  readOptionalFile,
} from '@/domains/ui-designer/lib/uiSync';
import {
  clampPositionToCanvas,
  getResizedBounds,
  normalizeBoundsToCanvas,
  snapCoordinate,
  snapPosition,
  type ResizeDirection,
} from '@/domains/ui-designer/lib/resizeBounds';
import { findComponentsInBox } from '@/domains/ui-designer/lib/selectionBox';
import { useUiDesignerStore } from '@/domains/ui-designer/stores/uiDesignerStore';
import { useWorkspaceStore } from '@/domains/workspace/stores/workspaceStore';
import { useTemplateStore } from '@/domains/templates/stores/templateStore';
import {
  basename,
  basenameWithoutExt,
  dirname,
  joinPath,
} from '@/shared/lib/path';
import type {
  DesignerGridStep,
  UiComponentType,
  WorkspaceTab,
} from '@/shared/types';

const props = defineProps<{
  tab: WorkspaceTab;
}>();

const designerStore = useUiDesignerStore();
const workspaceStore = useWorkspaceStore();
const templateStore = useTemplateStore();
const canvasElement = ref<HTMLElement | null>(null);
let stopActivePointerInteraction: (() => void) | null = null;
let unregisterSaveHandler: (() => void) | null = null;

type SelectionBoxState = {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
};
const selectionBox = ref<SelectionBoxState | null>(null);
const selectionBoxVisible = computed(() => {
  if (!selectionBox.value) return false;
  const { startX, startY, endX, endY } = selectionBox.value;
  return Math.abs(endX - startX) >= 2 || Math.abs(endY - startY) >= 2;
});
const selectionBoxStyle = computed(() => {
  if (!selectionBox.value) return {};
  const { startX, startY, endX, endY } = selectionBox.value;
  return {
    left: `${Math.min(startX, endX)}px`,
    top: `${Math.min(startY, endY)}px`,
    width: `${Math.abs(endX - startX)}px`,
    height: `${Math.abs(endY - startY)}px`,
  };
});
const canvasStyle = computed(
  () =>
    ({
      '--designer-grid-step': `${designerStore.gridStep}px`,
      width: `${designerStore.canvasWidth}px`,
      height: `${designerStore.canvasHeight}px`,
    }) as Record<string, string>
);

const RESIZE_HANDLES: Array<{ direction: ResizeDirection }> = [
  { direction: 'nw' },
  { direction: 'n' },
  { direction: 'ne' },
  { direction: 'e' },
  { direction: 'se' },
  { direction: 's' },
  { direction: 'sw' },
  { direction: 'w' },
];

const ALIGN_BUTTONS: Array<{
  icon: string;
  label: string;
  type?: AlignType;
  distribute?: true;
  axis?: DistributeAxis;
}> = [
  { icon: '⬤←', label: 'Align left', type: 'left' },
  { icon: '⬤→', label: 'Align right', type: 'right' },
  { icon: '⬤↔', label: 'Align center (H)', type: 'center' },
  { icon: '⬤↑', label: 'Align top', type: 'top' },
  { icon: '⬤↓', label: 'Align bottom', type: 'bottom' },
  { icon: '⬤↕', label: 'Align middle (V)', type: 'middle' },
  { icon: '↔…', label: 'Distribute horizontally', distribute: true, axis: 'x' },
  { icon: '↕…', label: 'Distribute vertically', distribute: true, axis: 'y' },
];
const snapConfig = computed(() => ({
  enabled: designerStore.snapToGridEnabled,
  step: designerStore.gridStep,
}));
const DEFAULT_COMPONENT_SIZE = {
  width: 100,
  height: 40,
};

async function loadDocument() {
  try {
    await designerStore.loadDocument(props.tab.filePath);
    workspaceStore.markDirty(props.tab.id, false);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to load document.';
    workspaceStore.showToast(message);
  }
}

async function saveDocument() {
  try {
    await designerStore.saveDocument(props.tab.filePath);

    const paths = buildLinkedPluginPaths(
      props.tab.filePath,
      joinPath,
      dirname,
      basenameWithoutExt
    );

    const templates = await templateStore.loadTemplateForType(
      templateStore.currentPluginType
    );

    const existingHeader = await readOptionalFile(
      paths.headerPath,
      (path) => window.prototypeIDE.readFile(path),
      (path) => window.prototypeIDE.fileExists(path)
    );
    const existingCpp = await readOptionalFile(
      paths.cppPath,
      (path) => window.prototypeIDE.readFile(path),
      (path) => window.prototypeIDE.fileExists(path)
    );

    const { headerCode, cppCode } = generateLinkedPluginSources({
      components: designerStore.components,
      className: paths.className,
      templates,
      existingHeader,
      existingCpp,
    });

    await window.prototypeIDE.writeFile(paths.headerPath, headerCode);
    await window.prototypeIDE.writeFile(paths.cppPath, cppCode);

    for (const linkedPath of [paths.headerPath, paths.cppPath]) {
      const linkedTab = workspaceStore.tabs.find(
        (tab) => tab.filePath === linkedPath
      );
      if (linkedTab?.isDirty) {
        workspaceStore.showToast(
          `Unsaved edits in ${linkedTab.title} were overwritten (last-save-wins)`
        );
        workspaceStore.markDirty(linkedTab.id, false);
      }
    }

    workspaceStore.markDirty(props.tab.id, false);
    workspaceStore.showToast(`Saved ${basename(props.tab.filePath)}`);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to save document.';
    workspaceStore.showToast(message);
    console.error(error);
  }
}

function handleSaveShortcut(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
    event.preventDefault();

    if (workspaceStore.activeTabId === props.tab.id) {
      void saveDocument();
    }
  }
}

function handleUndoRedo(event: KeyboardEvent) {
  if (workspaceStore.activeTabId !== props.tab.id) return;
  if (!(event.ctrlKey || event.metaKey)) return;

  const key = event.key.toLowerCase();
  if (key === 'z' && !event.shiftKey) {
    event.preventDefault();
    designerStore.undo();
  } else if (key === 'y' || (key === 'z' && event.shiftKey)) {
    event.preventDefault();
    designerStore.redo();
  }
}

function handleClipboard(event: KeyboardEvent) {
  if (workspaceStore.activeTabId !== props.tab.id) return;
  if (!(event.ctrlKey || event.metaKey)) return;

  const key = event.key.toLowerCase();
  if (key === 'c') {
    event.preventDefault();
    designerStore.copySelection();
  } else if (key === 'v') {
    event.preventDefault();
    designerStore.pasteClipboard();
  } else if (key === 'd') {
    event.preventDefault();
    designerStore.duplicateSelection();
  } else if (key === 'a') {
    event.preventDefault();
    designerStore.selectAll();
  }
}

function handleGridStepChange(event: Event) {
  const step = Number(
    (event.target as HTMLSelectElement).value
  ) as DesignerGridStep;
  designerStore.setGridStep(step);
}

function handleSnapToggle(event: Event) {
  designerStore.setSnapToGridEnabled(
    (event.target as HTMLInputElement).checked
  );
}

function handleCanvasSizeChange(axis: 'w' | 'h', event: Event) {
  const value = Number((event.target as HTMLInputElement).value);
  if (axis === 'w') {
    designerStore.setCanvasSize(value, designerStore.canvasHeight);
  } else {
    designerStore.setCanvasSize(designerStore.canvasWidth, value);
  }
}

function handleCanvasMouseDown(event: MouseEvent) {
  if (event.button !== 0 || !canvasElement.value) return;

  const rect = canvasElement.value.getBoundingClientRect();
  const startX = event.clientX - rect.left;
  const startY = event.clientY - rect.top;
  let moved = false;

  selectionBox.value = { startX, startY, endX: startX, endY: startY };

  const onMouseMove = (e: MouseEvent) => {
    const endX = e.clientX - rect.left;
    const endY = e.clientY - rect.top;
    selectionBox.value = { startX, startY, endX, endY };
    moved = Math.abs(endX - startX) >= 1 || Math.abs(endY - startY) >= 1;
  };

  const onMouseUp = () => {
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);

    if (!moved) {
      designerStore.clearSelection();
    } else if (selectionBox.value) {
      const { startX: sx, startY: sy, endX: ex, endY: ey } = selectionBox.value;
      const found = findComponentsInBox(designerStore.components, {
        x: Math.min(sx, ex),
        y: Math.min(sy, ey),
        width: Math.abs(ex - sx),
        height: Math.abs(ey - sy),
      });
      if (found.length > 0) {
        designerStore.setSelectionGroup(found);
      } else {
        designerStore.clearSelection();
      }
    }

    selectionBox.value = null;
  };

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
}

function handleDrop(event: DragEvent) {
  const type =
    (event.dataTransfer?.getData('text/plain') as UiComponentType | '') ||
    designerStore.draggingPaletteType ||
    '';

  if (!type || !canvasElement.value) {
    return;
  }

  const rect = canvasElement.value.getBoundingClientRect();
  const droppedPosition = snapPosition(
    {
      x: Math.max(0, Math.round(event.clientX - rect.left - 50)),
      y: Math.max(0, Math.round(event.clientY - rect.top - 20)),
    },
    snapConfig.value
  );
  const clampedPosition = clampPositionToCanvas(
    droppedPosition,
    DEFAULT_COMPONENT_SIZE,
    rect.width,
    rect.height
  );

  designerStore.placeComponent(type, {
    x: clampedPosition.x,
    y: clampedPosition.y,
  });
  designerStore.finishPaletteDrag();
}

function startDrag(event: MouseEvent, componentId: string) {
  if (event.button !== 0 || !canvasElement.value) {
    return;
  }

  const rect = canvasElement.value.getBoundingClientRect();
  const component = designerStore.components.find(
    (item) => item.id === componentId
  );

  if (!component) {
    return;
  }

  if (!event.shiftKey) {
    designerStore.selectComponent(componentId);
  }
  stopPointerInteraction();

  const initialPosition = { ...component.position };
  const offsetX = event.clientX - rect.left - component.position.x;
  const offsetY = event.clientY - rect.top - component.position.y;

  let rafId = 0;
  let lastMoveEvent: MouseEvent | null = null;

  const onMouseMove = (moveEvent: MouseEvent) => {
    lastMoveEvent = moveEvent;
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = 0;
      if (!lastMoveEvent) return;
      const e = lastMoveEvent;
      const nextPosition = {
        x: snapCoordinate(
          Math.max(0, Math.round(e.clientX - rect.left - offsetX)),
          snapConfig.value
        ),
        y: snapCoordinate(
          Math.max(0, Math.round(e.clientY - rect.top - offsetY)),
          snapConfig.value
        ),
      };

      designerStore.moveComponent(
        componentId,
        clampPositionToCanvas(
          nextPosition,
          component.size,
          rect.width,
          rect.height
        )
      );
    });
  };

  const onMouseUp = () => {
    const finalPosition = component.position;
    if (
      finalPosition.x !== initialPosition.x ||
      finalPosition.y !== initialPosition.y
    ) {
      designerStore.recordMoveCommand(componentId, initialPosition, {
        ...finalPosition,
      });
    }
    stopPointerInteraction();
  };

  stopActivePointerInteraction = () => {
    cancelAnimationFrame(rafId);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
    stopActivePointerInteraction = null;
  };

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
}

function startResize(
  event: MouseEvent,
  componentId: string,
  direction: ResizeDirection
) {
  if (event.button !== 0 || !canvasElement.value) {
    return;
  }

  const rect = canvasElement.value.getBoundingClientRect();
  const component = designerStore.components.find(
    (item) => item.id === componentId
  );

  if (!component) {
    return;
  }

  designerStore.selectComponent(componentId);
  stopPointerInteraction();

  const initialPointer = {
    x: event.clientX,
    y: event.clientY,
  };
  const initialBounds = {
    position: { ...component.position },
    size: { ...component.size },
  };

  let rafId = 0;
  let lastMoveEvent: MouseEvent | null = null;

  const onMouseMove = (moveEvent: MouseEvent) => {
    lastMoveEvent = moveEvent;
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = 0;
      if (!lastMoveEvent) return;
      const e = lastMoveEvent;
      const dx = e.clientX - initialPointer.x;
      const dy = e.clientY - initialPointer.y;
      const nextBounds = normalizeBoundsToCanvas(
        getResizedBounds(
          initialBounds,
          direction,
          dx,
          dy,
          snapConfig.value,
          e.shiftKey
        ),
        rect.width,
        rect.height
      );

      designerStore.resizeComponent(componentId, nextBounds);
    });
  };

  const onMouseUpResize = () => {
    const finalBounds = {
      position: { ...component.position },
      size: { ...component.size },
    };
    if (
      finalBounds.position.x !== initialBounds.position.x ||
      finalBounds.position.y !== initialBounds.position.y ||
      finalBounds.size.width !== initialBounds.size.width ||
      finalBounds.size.height !== initialBounds.size.height
    ) {
      designerStore.recordResizeCommand(
        componentId,
        initialBounds,
        finalBounds
      );
    }
    stopPointerInteraction();
  };

  stopActivePointerInteraction = () => {
    cancelAnimationFrame(rafId);
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUpResize);
    stopActivePointerInteraction = null;
  };

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUpResize);
}

function handleComponentClick(event: MouseEvent, componentId: string) {
  if (event.shiftKey) {
    designerStore.toggleGroupSelection(componentId);
  } else {
    designerStore.selectComponent(componentId);
  }
}

function stopPointerInteraction() {
  stopActivePointerInteraction?.();
}

watch(
  () => designerStore.components,
  () => {
    if (workspaceStore.activeTabId === props.tab.id) {
      workspaceStore.markDirty(props.tab.id, true);
    }
  },
  {
    deep: true,
  }
);

watch(
  () => props.tab.filePath,
  async () => {
    await loadDocument();
  }
);

const unsubscribeFileWatch = window.prototypeIDE.onFileChanged(
  async (changedPath: string) => {
    if (changedPath !== props.tab.filePath) {
      return;
    }
    if (workspaceStore.activeTab?.id === props.tab.id && props.tab.isDirty) {
      return;
    }
    const tab = workspaceStore.tabs.find((item) => item.id === props.tab.id);
    if (tab?.isDirty) {
      return;
    }
    await loadDocument();
  }
);

watch(
  () => props.tab.id,
  (tabId) => {
    unregisterSaveHandler?.();
    unregisterSaveHandler = registerTabSaveHandler(tabId, saveDocument);
  }
);

onMounted(async () => {
  unregisterSaveHandler = registerTabSaveHandler(props.tab.id, saveDocument);
  await loadDocument();
  window.addEventListener('keydown', handleSaveShortcut);
  window.addEventListener('keydown', handleUndoRedo);
  window.addEventListener('keydown', handleClipboard);
});

onBeforeUnmount(() => {
  stopPointerInteraction();
  unsubscribeFileWatch();
  unregisterSaveHandler?.();
  unregisterSaveHandler = null;
  window.removeEventListener('keydown', handleSaveShortcut);
  window.removeEventListener('keydown', handleUndoRedo);
  window.removeEventListener('keydown', handleClipboard);
});
</script>

<style scoped>
.designer {
  display: flex;
  flex: 1;
  flex-direction: column;
  height: 100%;
  background: linear-gradient(180deg, #191c20 0%, #14171b 100%);
}

.designer__toolbar {
  display: flex;
  gap: 18px;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #2c323a;
  padding: 12px 18px;
  background-color: rgba(15, 18, 22, 0.94);
}

.designer__control,
.designer__toggle {
  display: flex;
  gap: 10px;
  align-items: center;
}

.designer__control-label,
.designer__toggle-label {
  color: #c8d1dc;
  font-size: 12px;
}

.designer__toggle-label strong {
  color: #8bd5ff;
  font-weight: 600;
}

.designer__size-input {
  width: 56px;
  background: #161d26;
  border: 1px solid #334155;
  border-radius: 10px;
  padding: 6px 8px;
  color: #eef2f7;
  font-size: 12px;
  text-align: right;
  outline: none;
}

.designer__size-input:focus {
  border-color: #5ebeff;
}

.designer__size-input::-webkit-inner-spin-button,
.designer__size-input::-webkit-outer-spin-button {
  opacity: 0.4;
}

.designer__select {
  min-width: 84px;
  border: 1px solid #334155;
  border-radius: 10px;
  padding: 6px 10px;
  background-color: #161d26;
  color: #eef2f7;
  font-size: 12px;
  outline: none;
}

.designer__select:focus {
  border-color: #5ebeff;
}

.designer__toggle-input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.designer__toggle-ui {
  position: relative;
  width: 38px;
  height: 22px;
  border-radius: 999px;
  background-color: #39414a;
  transition:
    background-color 0.2s ease,
    box-shadow 0.2s ease;
}

.designer__toggle-ui::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: #f5f7fa;
  transition: transform 0.2s ease;
}

.designer__toggle-input:checked + .designer__toggle-ui {
  background-color: #0b7cc4;
  box-shadow: 0 0 0 1px rgba(139, 213, 255, 0.35);
}

.designer__toggle-input:checked + .designer__toggle-ui::after {
  transform: translateX(16px);
}

.designer__stage {
  display: flex;
  flex: 1;
  min-height: 0;
  align-items: center;
  justify-content: center;
  background-color: #1a1a1a;
  background-image: radial-gradient(#2a2a2a 1px, transparent 0);
  background-size: 20px 20px;
}

.designer__canvas {
  position: relative;
  background-color: #252526;
  background-image:
    linear-gradient(to right, rgba(117, 152, 182, 0.16) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(117, 152, 182, 0.16) 1px, transparent 1px);
  background-size:
    var(--designer-grid-step, 10px) var(--designer-grid-step, 10px),
    var(--designer-grid-step, 10px) var(--designer-grid-step, 10px);
  box-shadow:
    0 0 0 1px #3c3c3c,
    0 10px 30px rgba(0, 0, 0, 0.3);
}

.designer__component {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid;
  border-radius: 4px;
  color: white;
  cursor: pointer;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  user-select: none;
}

.designer__component-label {
  pointer-events: none;
}

.designer__component--active {
  border: 2px solid #55b3ff;
  box-shadow: 0 0 10px rgba(85, 179, 255, 0.5);
}

.designer__component--grouped {
  outline: 2px dashed #f0a040;
  outline-offset: 2px;
}

.designer__align-group {
  display: flex;
  gap: 4px;
  align-items: center;
}

.designer__align-btn {
  background: #2a2d33;
  border: 1px solid #3c3f47;
  border-radius: 4px;
  color: #ccc;
  font-size: 11px;
  padding: 2px 6px;
  cursor: pointer;
  transition: background 0.1s;
}

.designer__align-btn:hover {
  background: #3a3d45;
  color: #fff;
}

.designer__resize-handle {
  position: absolute;
  width: 10px;
  height: 10px;
  border: 1px solid #d9f1ff;
  border-radius: 2px;
  background-color: #55b3ff;
  box-shadow: 0 0 0 1px rgba(10, 15, 20, 0.35);
}

.designer__resize-handle--n,
.designer__resize-handle--s {
  left: 50%;
  transform: translateX(-50%);
}

.designer__resize-handle--e,
.designer__resize-handle--w {
  top: 50%;
  transform: translateY(-50%);
}

.designer__resize-handle--nw {
  top: -5px;
  left: -5px;
  cursor: nwse-resize;
}

.designer__resize-handle--n {
  top: -5px;
  cursor: ns-resize;
}

.designer__resize-handle--ne {
  top: -5px;
  right: -5px;
  cursor: nesw-resize;
}

.designer__resize-handle--e {
  right: -5px;
  cursor: ew-resize;
}

.designer__resize-handle--se {
  right: -5px;
  bottom: -5px;
  cursor: nwse-resize;
}

.designer__resize-handle--s {
  bottom: -5px;
  cursor: ns-resize;
}

.designer__resize-handle--sw {
  bottom: -5px;
  left: -5px;
  cursor: nesw-resize;
}

.designer__resize-handle--w {
  left: -5px;
  cursor: ew-resize;
}

.designer__selection-box {
  position: absolute;
  border: 1px dashed #55b3ff;
  background-color: rgba(85, 179, 255, 0.08);
  pointer-events: none;
}
</style>
