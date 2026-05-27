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
    </header>

    <div class="designer__stage">
      <div
        ref="canvasElement"
        class="designer__canvas"
        :style="canvasGridStyle"
        @dragenter.prevent
        @dragover.prevent
        @drop.prevent="handleDrop"
      >
        <div
          v-for="component in designerStore.components"
          :key="component.id"
          class="designer__component"
          :class="{
            'designer__component--active':
              component.id === designerStore.selectedComponentId,
          }"
          :style="{
            left: `${component.position.x}px`,
            top: `${component.position.y}px`,
            width: `${component.size.width}px`,
            height: `${component.size.height}px`,
          }"
          @mousedown="startDrag($event, component.id)"
          @click="designerStore.selectComponent(component.id)"
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
import { generatePluginCode } from '@/domains/ui-designer/lib/codeGenerator';
import { useUiDesignerStore } from '@/domains/ui-designer/stores/uiDesignerStore';
import { useWorkspaceStore } from '@/domains/workspace/stores/workspaceStore';
import {
  basename,
  basenameWithoutExt,
  dirname,
  joinPath,
} from '@/shared/lib/path';
import type {
  DesignerGridStep,
  UiComponent,
  UiComponentType,
  WorkspaceTab,
} from '@/shared/types';

const props = defineProps<{
  tab: WorkspaceTab;
}>();

const designerStore = useUiDesignerStore();
const workspaceStore = useWorkspaceStore();
const canvasElement = ref<HTMLElement | null>(null);
const canvasGridStyle = computed(
  () =>
    ({
      '--designer-grid-step': `${designerStore.gridStep}px`,
    }) as Record<string, string>
);

type ResizeDirection = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';

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

const MIN_COMPONENT_WIDTH = 40;
const MIN_COMPONENT_HEIGHT = 24;

async function loadDocument() {
  await designerStore.loadDocument(props.tab.filePath);
  workspaceStore.markDirty(props.tab.id, false);
}

async function saveDocument() {
  await designerStore.saveDocument(props.tab.filePath);

  const baseDir = dirname(props.tab.filePath);
  const baseName = basenameWithoutExt(props.tab.filePath);
  const headerPath = joinPath(baseDir, `${baseName}.h`);
  const cppPath = joinPath(baseDir, `${baseName}.cpp`);

  let existingHeader = '';
  let existingCpp = '';

  // Пытаемся прочитать существующие файлы, чтобы сохранить код пользователя
  try {
    if (window.prototypeIDE.readFile) {
      existingHeader = (await window.prototypeIDE.readFile(headerPath)) || '';
      existingCpp = (await window.prototypeIDE.readFile(cppPath)) || '';
    }
  } catch (err) {
    // Игнорируем ошибку (например, если файлы генерируются впервые)
  }

  const { headerCode, cppCode } = generatePluginCode(
    designerStore.components,
    baseName,
    existingHeader,
    existingCpp
  );

  await window.prototypeIDE.writeFile(headerPath, headerCode);
  await window.prototypeIDE.writeFile(cppPath, cppCode);
  workspaceStore.markDirty(props.tab.id, false);
  workspaceStore.showToast(`Saved ${basename(props.tab.filePath)}`);
}

function handleSaveShortcut(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
    event.preventDefault();

    if (workspaceStore.activeTabId === props.tab.id) {
      void saveDocument();
    }
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

function handleDrop(event: DragEvent) {
  const type =
    (event.dataTransfer?.getData('text/plain') as UiComponentType | '') ||
    designerStore.draggingPaletteType ||
    '';

  if (!type || !canvasElement.value) {
    return;
  }

  const rect = canvasElement.value.getBoundingClientRect();
  const droppedPosition = snapPosition({
    x: Math.max(0, Math.round(event.clientX - rect.left - 50)),
    y: Math.max(0, Math.round(event.clientY - rect.top - 20)),
  });

  designerStore.placeComponent(type, {
    x: droppedPosition.x,
    y: droppedPosition.y,
  });
  designerStore.finishPaletteDrag();
}

function startDrag(event: MouseEvent, componentId: string) {
  if (!canvasElement.value) {
    return;
  }

  const rect = canvasElement.value.getBoundingClientRect();
  const component = designerStore.components.find(
    (item) => item.id === componentId
  );

  if (!component) {
    return;
  }

  const offsetX = event.clientX - rect.left - component.position.x;
  const offsetY = event.clientY - rect.top - component.position.y;

  const onMouseMove = (moveEvent: MouseEvent) => {
    designerStore.moveComponent(componentId, {
      x: snapCoordinate(
        Math.max(0, Math.round(moveEvent.clientX - rect.left - offsetX))
      ),
      y: snapCoordinate(
        Math.max(0, Math.round(moveEvent.clientY - rect.top - offsetY))
      ),
    });
  };

  const onMouseUp = () => {
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  };

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
}

function startResize(
  event: MouseEvent,
  componentId: string,
  direction: ResizeDirection
) {
  if (!canvasElement.value) {
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

  const initialPointer = {
    x: event.clientX,
    y: event.clientY,
  };
  const initialBounds = {
    position: { ...component.position },
    size: { ...component.size },
  };

  const onMouseMove = (moveEvent: MouseEvent) => {
    const dx = moveEvent.clientX - initialPointer.x;
    const dy = moveEvent.clientY - initialPointer.y;
    const nextBounds = normalizeBoundsToCanvas(
      getResizedBounds(initialBounds, direction, dx, dy),
      rect.width,
      rect.height
    );

    designerStore.resizeComponent(componentId, nextBounds);
  };

  const onMouseUp = () => {
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  };

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
}

function getResizedBounds(
  initialBounds: Pick<UiComponent, 'position' | 'size'>,
  direction: ResizeDirection,
  dx: number,
  dy: number
) {
  const nextBounds = {
    position: { ...initialBounds.position },
    size: { ...initialBounds.size },
  };

  if (direction.includes('e')) {
    nextBounds.size.width = Math.max(
      MIN_COMPONENT_WIDTH,
      Math.round(initialBounds.size.width + dx)
    );
  }

  if (direction.includes('s')) {
    nextBounds.size.height = Math.max(
      MIN_COMPONENT_HEIGHT,
      Math.round(initialBounds.size.height + dy)
    );
  }

  if (direction.includes('w')) {
    const width = Math.max(
      MIN_COMPONENT_WIDTH,
      Math.round(initialBounds.size.width - dx)
    );
    nextBounds.position.x =
      initialBounds.position.x + initialBounds.size.width - width;
    nextBounds.size.width = width;
  }

  if (direction.includes('n')) {
    const height = Math.max(
      MIN_COMPONENT_HEIGHT,
      Math.round(initialBounds.size.height - dy)
    );
    nextBounds.position.y =
      initialBounds.position.y + initialBounds.size.height - height;
    nextBounds.size.height = height;
  }

  if (designerStore.snapToGridEnabled) {
    if (direction.includes('w')) {
      const snappedLeft = snapCoordinate(nextBounds.position.x);
      const preservedRight =
        initialBounds.position.x + initialBounds.size.width;
      nextBounds.position.x = snappedLeft;
      nextBounds.size.width = Math.max(
        MIN_COMPONENT_WIDTH,
        preservedRight - snappedLeft
      );
    } else {
      nextBounds.size.width = snapSize(nextBounds.size.width);
    }

    if (direction.includes('n')) {
      const snappedTop = snapCoordinate(nextBounds.position.y);
      const preservedBottom =
        initialBounds.position.y + initialBounds.size.height;
      nextBounds.position.y = snappedTop;
      nextBounds.size.height = Math.max(
        MIN_COMPONENT_HEIGHT,
        preservedBottom - snappedTop
      );
    } else {
      nextBounds.size.height = snapSize(nextBounds.size.height);
    }
  }

  return nextBounds;
}

function normalizeBoundsToCanvas(
  bounds: Pick<UiComponent, 'position' | 'size'>,
  canvasWidth: number,
  canvasHeight: number
) {
  const maxWidth = Math.round(canvasWidth);
  const maxHeight = Math.round(canvasHeight);
  const left = Math.max(0, Math.round(bounds.position.x));
  const top = Math.max(0, Math.round(bounds.position.y));

  return {
    position: {
      x: left,
      y: top,
    },
    size: {
      width: Math.max(
        MIN_COMPONENT_WIDTH,
        Math.min(Math.round(bounds.size.width), maxWidth - left)
      ),
      height: Math.max(
        MIN_COMPONENT_HEIGHT,
        Math.min(Math.round(bounds.size.height), maxHeight - top)
      ),
    },
  };
}

function snapPosition(position: UiComponent['position']) {
  return {
    x: snapCoordinate(position.x),
    y: snapCoordinate(position.y),
  };
}

function snapCoordinate(value: number) {
  if (!designerStore.snapToGridEnabled) {
    return value;
  }

  const step = designerStore.gridStep;
  return Math.max(0, Math.round(value / step) * step);
}

function snapSize(value: number) {
  if (!designerStore.snapToGridEnabled) {
    return value;
  }

  const step = designerStore.gridStep;
  return Math.max(step, Math.round(value / step) * step);
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

onMounted(async () => {
  await loadDocument();
  window.addEventListener('keydown', handleSaveShortcut);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleSaveShortcut);
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
  width: 600px;
  height: 400px;
  background-color: #252526;
  background-image:
    linear-gradient(to right, rgba(117, 152, 182, 0.16) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(117, 152, 182, 0.16) 1px, transparent 1px);
  background-size:
    var(--designer-grid-step, 10px) var(--designer-grid-step, 10px),
    var(--designer-grid-step, 10px) var(--designer-grid-step, 10px);
  border: 1px solid #3c3c3c;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.designer__component {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #005999;
  border-radius: 4px;
  background-color: #007acc;
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
</style>
