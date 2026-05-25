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
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr) 280px;
  min-height: 100vh;
  background:
    radial-gradient(circle at top, rgba(62, 78, 109, 0.25), transparent 36%),
    linear-gradient(180deg, #16181d 0%, #101114 100%);
}

.ide-shell__left,
.ide-shell__right {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: rgba(23, 25, 31, 0.96);
}

.ide-shell__left {
  border-right: 1px solid #2c3340;
}

.ide-shell__right {
  border-left: 1px solid #2c3340;
}

.ide-shell__main {
  min-width: 0;
}
</style>
