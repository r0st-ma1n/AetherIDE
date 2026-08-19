import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { RecentProjectEntry } from '@/shared/types';

export const useProjectStore = defineStore('project', () => {
  const rootPath = ref<string | null>(null);
  const isReady = ref(false);
  const recentProjects = ref<RecentProjectEntry[]>([]);

  const hasProject = computed(() => rootPath.value != null);
  const projectName = computed(() => {
    if (!rootPath.value) {
      return null;
    }
    const normalized = rootPath.value.replace(/\\/g, '/');
    const segments = normalized.split('/').filter(Boolean);
    return segments[segments.length - 1] ?? null;
  });

  async function syncRecentFromMain() {
    recentProjects.value = await window.prototypeIDE.getRecentProjects();
  }

  function applyRecent(next: RecentProjectEntry[]) {
    recentProjects.value = next;
  }

  async function syncFromMain() {
    rootPath.value = await window.prototypeIDE.getProjectRoot();
    await syncRecentFromMain();
    isReady.value = true;
  }

  function applyRoot(nextRoot: string | null) {
    rootPath.value = nextRoot;
    isReady.value = true;
  }

  async function setRoot(absolutePath: string) {
    rootPath.value = await window.prototypeIDE.setProjectRoot(absolutePath);
    await syncRecentFromMain();
    isReady.value = true;
  }

  async function clearRoot() {
    rootPath.value = await window.prototypeIDE.clearProjectRoot();
    isReady.value = true;
  }

  async function openProject() {
    const nextRoot = await window.prototypeIDE.openProjectDialog();
    if (nextRoot != null) {
      rootPath.value = nextRoot;
      await syncRecentFromMain();
    }
    isReady.value = true;
    return nextRoot;
  }

  async function openRecent(projectPath: string) {
    const nextRoot = await window.prototypeIDE.openRecentProject(projectPath);
    if (nextRoot != null) {
      rootPath.value = nextRoot;
    }
    await syncRecentFromMain();
    isReady.value = true;
    return nextRoot;
  }

  async function clearRecent() {
    recentProjects.value = await window.prototypeIDE.clearRecentProjects();
  }

  return {
    applyRecent,
    applyRoot,
    clearRecent,
    clearRoot,
    hasProject,
    isReady,
    openProject,
    openRecent,
    projectName,
    recentProjects,
    rootPath,
    setRoot,
    syncFromMain,
    syncRecentFromMain,
  };
});
