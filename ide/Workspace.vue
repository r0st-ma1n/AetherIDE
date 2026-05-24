<template>
  <div class="workspace-container">
    <!-- Панель вкладок -->
    <div class="tabs-header">
      <button
        v-for="tab in store.tabs"
        :key="tab.id"
        class="tab-btn"
        :class="{ active: tab.id === store.activeTabId }"
        @click="store.setActiveTab(tab.id)"
      >
        {{ tab.name }}
        <span v-if="tab.isDirty" class="dirty-indicator">*</span>
        <span class="close-btn" @click.stop="store.closeTab(tab.id)"
          >&times;</span
        >
      </button>
    </div>

    <!-- Рабочая область -->
    <div class="tab-content" v-if="activeTab">
      <!-- Используем KeepAlive (опционально), чтобы сохранять состояние компонентов при переключении -->
      <KeepAlive>
        <component
          :is="activeTab.type === 'code' ? CodeEditor : FormDesigner"
          :key="activeTab.id"
          :fileId="activeTab.id"
        />
      </KeepAlive>
    </div>

    <!-- Пустое состояние -->
    <div class="empty-state" v-else>Open a file to start editing</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useEditorStore, type Tab } from './editorStore';

// Импортируем моковые компоненты для разных типов вкладок
import CodeEditor from './CodeEditor.vue';
import FormDesigner from './FormDesigner.vue';

const store = useEditorStore();

// Вычисляемое свойство для быстрого доступа к данным активной вкладки
const activeTab = computed(() =>
  store.tabs.find((tab: Tab) => tab.id === store.activeTabId)
);
</script>

<style scoped>
.workspace-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
}
/* Остальные стили для .tabs-header, .tab-btn, и т.д. */
</style>
