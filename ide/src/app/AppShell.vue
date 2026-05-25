<template>
  <div class="ide-shell">
    <aside class="ide-shell__left">
      <FileExplorer />
      <ComponentPalette />
    </aside>

    <main class="ide-shell__main">
      <WorkspaceView />
    </main>

    <aside class="ide-shell__right">
      <PropertiesPanel />
    </aside>
  </div>
</template>

<script setup lang="ts">
import FileExplorer from '@/domains/files/components/FileExplorer.vue';
import ComponentPalette from '@/domains/ui-designer/components/ComponentPalette.vue';
import PropertiesPanel from '@/domains/ui-designer/components/PropertiesPanel.vue';
import WorkspaceView from '@/domains/workspace/components/WorkspaceView.vue';
</script>

<style scoped>
.ide-shell {
  display: flex;
  min-height: 100vh;
  background-color: #1e1e1e;
}

.ide-shell__left,
.ide-shell__right {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
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
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}
</style>
