<template>
  <section class="designer">
    <header class="designer__header">
      <span>{{ tab.title }}</span>
      <div class="designer__actions">
        <span>{{ generatedPreview }}</span>
        <button class="designer__save" :disabled="isSaving" @click="saveDocument">
          {{ isSaving ? 'Saving...' : 'Save' }}
        </button>
      </div>
    </header>

    <div class="designer__canvas">
      <button
        v-for="component in designerStore.components"
        :key="component.id"
        class="designer__component"
        :class="{ 'designer__component--active': component.id === designerStore.selectedComponentId }"
        @click="designerStore.selectComponent(component.id)"
      >
        {{ component.type }}
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { generateCodePreview } from '@/domains/ui-designer/lib/codeGenerator';
import { useUiDesignerStore } from '@/domains/ui-designer/stores/uiDesignerStore';
import { useWorkspaceStore } from '@/domains/workspace/stores/workspaceStore';
import type { WorkspaceTab } from '@/shared/types';

const props = defineProps<{
  tab: WorkspaceTab;
}>();

const designerStore = useUiDesignerStore();
const workspaceStore = useWorkspaceStore();
const isSaving = ref(false);

const generatedPreview = computed(() => generateCodePreview(designerStore.components));

async function loadDocument() {
  await designerStore.loadDocument(props.tab.filePath);
  workspaceStore.markDirty(props.tab.id, false);
}

async function saveDocument() {
  isSaving.value = true;

  try {
    await designerStore.saveDocument(props.tab.filePath);
    workspaceStore.markDirty(props.tab.id, false);
  } finally {
    isSaving.value = false;
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

watch(
  () => designerStore.components,
  () => {
    if (workspaceStore.activeTabId === props.tab.id) {
      workspaceStore.markDirty(props.tab.id, true);
    }
  },
  {
    deep: true,
  },
);

watch(
  () => props.tab.filePath,
  async () => {
    await loadDocument();
  },
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
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  height: 100%;
  border: 1px solid #2f3541;
  border-radius: 20px;
  overflow: hidden;
  background-color: rgba(17, 19, 24, 0.95);
}

.designer__header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 18px;
  border-bottom: 1px solid #2f3541;
  color: #dce3ee;
}

.designer__actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.designer__save {
  border: 1px solid #3a4352;
  border-radius: 999px;
  background-color: transparent;
  color: #9fb0c8;
  padding: 6px 10px;
}

.designer__canvas {
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: 12px;
  padding: 18px;
  background-image: radial-gradient(circle, rgba(95, 110, 132, 0.22) 1px, transparent 1px);
  background-size: 18px 18px;
}

.designer__component {
  border: 1px solid #36567f;
  border-radius: 14px;
  padding: 12px 16px;
  background-color: #21456c;
  color: #eff7ff;
  cursor: pointer;
}

.designer__component--active {
  outline: 2px solid #8dd0ff;
}
</style>
