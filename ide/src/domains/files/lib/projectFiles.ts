import type { ProjectFileEntry, WorkspaceTab } from '@/shared/types';

function inferTabKind(filePath: string): WorkspaceTab['kind'] {
  return filePath.endsWith('.ui') ? 'designer' : 'code';
}

export function toWorkspaceTab(entry: ProjectFileEntry): WorkspaceTab {
  return {
    id: entry.path,
    title: entry.name,
    filePath: entry.path,
    kind: inferTabKind(entry.path),
    isDirty: false,
  };
}
