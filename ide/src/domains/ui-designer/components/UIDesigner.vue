<template>
  <section class="designer">
    <div class="designer__stage">
      <div
        ref="canvasElement"
        class="designer__canvas"
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
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
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

function handleDrop(event: DragEvent) {
  const type =
    (event.dataTransfer?.getData('text/plain') as UiComponentType | '') ||
    designerStore.draggingPaletteType ||
    '';

  if (!type || !canvasElement.value) {
    return;
  }

  const rect = canvasElement.value.getBoundingClientRect();
  designerStore.placeComponent(type, {
    x: Math.max(0, Math.round(event.clientX - rect.left - 50)),
    y: Math.max(0, Math.round(event.clientY - rect.top - 20)),
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
      x: Math.max(0, Math.round(moveEvent.clientX - rect.left - offsetX)),
      y: Math.max(0, Math.round(moveEvent.clientY - rect.top - offsetY)),
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
      getResizedBounds(initialBounds, direction, dx, dy, moveEvent.shiftKey),
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

function normalizeBoundsToCanvas(
  bounds: Pick<UiComponent, 'position' | 'size'>,
  canvasWidth: number,
  canvasHeight: number
) {
  const maxWidth = Math.max(MIN_COMPONENT_WIDTH, Math.round(canvasWidth));
  const maxHeight = Math.max(MIN_COMPONENT_HEIGHT, Math.round(canvasHeight));

  let left = Math.round(bounds.position.x);
  let top = Math.round(bounds.position.y);
  let right = Math.round(bounds.position.x + bounds.size.width);
  let bottom = Math.round(bounds.position.y + bounds.size.height);

  if (left < 0) {
    left = 0;
  }

  if (top < 0) {
    top = 0;
  }

  if (right > maxWidth) {
    right = maxWidth;
  }

  if (bottom > maxHeight) {
    bottom = maxHeight;
  }

  if (right - left < MIN_COMPONENT_WIDTH) {
    if (bounds.position.x < 0) {
      right = Math.min(maxWidth, MIN_COMPONENT_WIDTH);
      left = 0;
    } else {
      left = Math.max(0, right - MIN_COMPONENT_WIDTH);
      right = left + MIN_COMPONENT_WIDTH;
    }
  }

  if (bottom - top < MIN_COMPONENT_HEIGHT) {
    if (bounds.position.y < 0) {
      bottom = Math.min(maxHeight, MIN_COMPONENT_HEIGHT);
      top = 0;
    } else {
      top = Math.max(0, bottom - MIN_COMPONENT_HEIGHT);
      bottom = top + MIN_COMPONENT_HEIGHT;
    }
  }

  return {
    position: {
      x: left,
      y: top,
    },
    size: {
      width: Math.min(maxWidth, right - left),
      height: Math.min(maxHeight, bottom - top),
    },
  };
}

function getResizedBounds(
  initialBounds: Pick<UiComponent, 'position' | 'size'>,
  direction: ResizeDirection,
  dx: number,
  dy: number,
  preserveAspectRatio: boolean
) {
  if (preserveAspectRatio) {
    return getAspectRatioBounds(initialBounds, direction, dx, dy);
  }

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

  return nextBounds;
}

function getAspectRatioBounds(
  initialBounds: Pick<UiComponent, 'position' | 'size'>,
  direction: ResizeDirection,
  dx: number,
  dy: number
) {
  const initialWidth = initialBounds.size.width;
  const initialHeight = initialBounds.size.height;
  const aspectRatio = initialWidth / initialHeight;
  const minScale = Math.max(
    MIN_COMPONENT_WIDTH / initialWidth,
    MIN_COMPONENT_HEIGHT / initialHeight
  );

  let scale = 1;

  if (direction === 'e' || direction === 'w') {
    const signedWidthDelta = direction === 'e' ? dx : -dx;
    scale = (initialWidth + signedWidthDelta) / initialWidth;
  } else if (direction === 'n' || direction === 's') {
    const signedHeightDelta = direction === 's' ? dy : -dy;
    scale = (initialHeight + signedHeightDelta) / initialHeight;
  } else {
    const signedWidthDelta = direction.includes('e') ? dx : -dx;
    const signedHeightDelta = direction.includes('s') ? dy : -dy;
    const widthScale = (initialWidth + signedWidthDelta) / initialWidth;
    const heightScale = (initialHeight + signedHeightDelta) / initialHeight;

    scale =
      Math.abs(widthScale - 1) >= Math.abs(heightScale - 1)
        ? widthScale
        : heightScale;
  }

  const normalizedScale = Math.max(minScale, scale);
  const width = Math.max(
    MIN_COMPONENT_WIDTH,
    Math.round(initialWidth * normalizedScale)
  );
  const height = Math.max(
    MIN_COMPONENT_HEIGHT,
    Math.round(width / aspectRatio)
  );

  return buildBoundsFromAnchor(initialBounds, direction, {
    width,
    height: Math.max(MIN_COMPONENT_HEIGHT, height),
  });
}

function buildBoundsFromAnchor(
  initialBounds: Pick<UiComponent, 'position' | 'size'>,
  direction: ResizeDirection,
  size: UiComponent['size']
) {
  const left = initialBounds.position.x;
  const top = initialBounds.position.y;
  const right = left + initialBounds.size.width;
  const bottom = top + initialBounds.size.height;
  const centerX = left + initialBounds.size.width / 2;
  const centerY = top + initialBounds.size.height / 2;

  let nextX = left;
  let nextY = top;

  if (direction.includes('w')) {
    nextX = Math.round(right - size.width);
  } else if (!direction.includes('e')) {
    nextX = Math.round(centerX - size.width / 2);
  }

  if (direction.includes('n')) {
    nextY = Math.round(bottom - size.height);
  } else if (!direction.includes('s')) {
    nextY = Math.round(centerY - size.height / 2);
  }

  return {
    position: {
      x: nextX,
      y: nextY,
    },
    size,
  };
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
  height: 100%;
  background-color: #1a1a1a;
}

.designer__stage {
  display: flex;
  flex: 1;
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
