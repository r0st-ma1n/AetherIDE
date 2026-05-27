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
        <button
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
          }"
          @mousedown="startDrag($event, component.id)"
          @click="designerStore.selectComponent(component.id)"
        >
          {{ component.type }}
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { generatePluginCode, validateCppSyntax } from '@/domains/ui-designer/lib/codeGenerator';
import { useUiDesignerStore } from '@/domains/ui-designer/stores/uiDesignerStore';
import { useWorkspaceStore } from '@/domains/workspace/stores/workspaceStore';
import { useTemplateStore } from '@/domains/templates/stores/templateStore';
import {
  basename,
  basenameWithoutExt,
  dirname,
  joinPath,
} from '@/shared/lib/path';
import type { UiComponentType, WorkspaceTab } from '@/shared/types';

const props = defineProps<{
  tab: WorkspaceTab;
}>();

const designerStore = useUiDesignerStore();
const workspaceStore = useWorkspaceStore();
const canvasElement = ref<HTMLElement | null>(null);

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

  // Загружаем шаблоны (в реальном приложении пути вычисляются относительно корня)
  const templatesDir = joinPath(dirname(dirname(dirname(baseDir))), 'templates');
  
  let templates = { header: '', cpp: '', components: {} as Record<string, string> };

  if (window.prototypeIDE.readFile) {
    try {
      templates.header = (await window.prototypeIDE.readFile(joinPath(templatesDir, 'plugin/PluginName.h.template'))) || '';
      templates.cpp = (await window.prototypeIDE.readFile(joinPath(templatesDir, 'plugin/PluginName.cpp.template'))) || '';
      
      templates.components['Knob'] = (await window.prototypeIDE.readFile(joinPath(templatesDir, 'components/Knob.template'))) || '';
      templates.components['Slider'] = (await window.prototypeIDE.readFile(joinPath(templatesDir, 'components/Slider.template'))) || '';
      templates.components['Button'] = (await window.prototypeIDE.readFile(joinPath(templatesDir, 'components/Button.template'))) || '';
      templates.components['Label'] = (await window.prototypeIDE.readFile(joinPath(templatesDir, 'components/Label.template'))) || '';
    } catch (e) {
      workspaceStore.showToast('Failed to load templates!');
      console.error(e);
      return;
    }
  }

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
    templates,
    existingHeader,
    existingCpp
  );

  // Базовая проверка синтаксиса перед записью
  const headerValidation = validateCppSyntax(headerCode);
  const cppValidation = validateCppSyntax(cppCode);

  if (!headerValidation.valid || !cppValidation.valid) {
    const errorMsg = headerValidation.error || cppValidation.error;
    workspaceStore.showToast(`Generation Error: ${errorMsg}`);
    console.error(`Syntax Error in generated code:`, errorMsg);
    return;
  }

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
  border: 1px solid #005999;
  border-radius: 4px;
  padding: 8px 16px;
  background-color: #007acc;
  color: white;
  cursor: pointer;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
}

.designer__component--active {
  border: 2px solid #55b3ff;
  box-shadow: 0 0 10px rgba(85, 179, 255, 0.5);
}
</style>
