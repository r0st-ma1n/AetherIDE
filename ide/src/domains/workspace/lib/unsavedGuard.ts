import { nextTick } from 'vue';
import {
  getTabSaveHandler,
  waitForTabSaveHandler,
} from '@/domains/workspace/lib/tabSaveRegistry';
import { useWorkspaceStore } from '@/domains/workspace/stores/workspaceStore';
import type { WorkspaceTab } from '@/shared/types';

export type UnsavedChoice = 'save' | 'discard' | 'cancel';

function tabLabel(tab: WorkspaceTab): string {
  return tab.title || tab.filePath;
}

async function confirmUnsaved(
  message: string,
  detail?: string
): Promise<UnsavedChoice> {
  return window.prototypeIDE.confirmUnsaved({
    message,
    detail,
  });
}

async function saveTab(tab: WorkspaceTab): Promise<void> {
  const workspace = useWorkspaceStore();

  if (workspace.activeTabId !== tab.id) {
    workspace.setActiveTab(tab.id);
    await nextTick();
  }

  const handler =
    getTabSaveHandler(tab.id) ?? (await waitForTabSaveHandler(tab.id));

  if (!handler) {
    throw new Error(`No save handler registered for ${tabLabel(tab)}.`);
  }

  await handler();
}

export async function saveActiveTab(): Promise<boolean> {
  const workspace = useWorkspaceStore();
  const tab = workspace.activeTab;
  if (!tab) {
    workspace.showToast('No active file to save.');
    return false;
  }

  if (!tab.isDirty) {
    workspace.showToast('No unsaved changes.');
    return true;
  }

  try {
    await saveTab(tab);
    workspace.showToast(`Saved ${tabLabel(tab)}.`);
    return true;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to save file.';
    workspace.showToast(message);
    return false;
  }
}

export async function saveAllDirtyTabs(): Promise<boolean> {
  const workspace = useWorkspaceStore();
  const dirtyTabs = workspace.tabs.filter((tab) => tab.isDirty);

  if (dirtyTabs.length === 0) {
    workspace.showToast('Nothing to save.');
    return true;
  }

  let savedCount = 0;
  for (const tab of dirtyTabs) {
    try {
      await saveTab(tab);
      savedCount += 1;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to save file.';
      workspace.showToast(
        savedCount > 0
          ? `Saved ${savedCount} file(s), then failed on ${tabLabel(tab)}: ${message}`
          : message
      );
      return false;
    }
  }

  workspace.showToast(
    savedCount === 1 ? 'Saved 1 file.' : `Saved ${savedCount} files.`
  );
  return true;
}

export async function requestCloseTab(tabId: string): Promise<boolean> {
  const workspace = useWorkspaceStore();
  const tab = workspace.tabs.find((item) => item.id === tabId);
  if (!tab) {
    return false;
  }

  if (!tab.isDirty) {
    workspace.closeTab(tabId);
    return true;
  }

  const choice = await confirmUnsaved(
    `Do you want to save changes to ${tabLabel(tab)}?`,
    "Your changes will be lost if you don't save them."
  );

  if (choice === 'cancel') {
    return false;
  }

  if (choice === 'save') {
    try {
      await saveTab(tab);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to save tab.';
      workspace.showToast(message);
      return false;
    }
  }

  workspace.closeTab(tabId);
  return true;
}

export async function requestCloseAllDirty(
  reason: 'project' | 'quit'
): Promise<boolean> {
  const workspace = useWorkspaceStore();
  const dirtyTabs = workspace.tabs.filter((tab) => tab.isDirty);

  if (dirtyTabs.length === 0) {
    return true;
  }

  const subject =
    reason === 'quit' ? 'quit AetherIDE' : 'close the current project';
  const names = dirtyTabs.map((tab) => tabLabel(tab)).join(', ');
  const choice = await confirmUnsaved(
    `Save changes before you ${subject}?`,
    dirtyTabs.length === 1
      ? `${names} has unsaved changes.`
      : `Unsaved files: ${names}`
  );

  if (choice === 'cancel') {
    return false;
  }

  if (choice === 'save') {
    for (const tab of dirtyTabs) {
      try {
        await saveTab(tab);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to save tab.';
        workspace.showToast(message);
        return false;
      }
    }
  }

  return true;
}

export async function requestCloseProject(): Promise<boolean> {
  const allowed = await requestCloseAllDirty('project');
  if (!allowed) {
    return false;
  }

  await window.prototypeIDE.clearProjectRoot();
  return true;
}

export async function requestQuitApp(): Promise<boolean> {
  const allowed = await requestCloseAllDirty('quit');
  if (!allowed) {
    await window.prototypeIDE.cancelQuit();
    return false;
  }

  await window.prototypeIDE.confirmQuit();
  return true;
}
