import type { FileTreeNode, ProjectFileEntry } from '@/shared/types';

function createDirectoryNode(name: string, path: string): FileTreeNode {
  return {
    id: `dir:${path}`,
    name,
    path,
    isDirectory: true,
    children: [],
  };
}

function createFileNode(entry: ProjectFileEntry): FileTreeNode {
  return {
    id: `file:${entry.path}`,
    name: entry.name,
    path: entry.path,
    isDirectory: false,
    children: [],
  };
}

export function buildFileTree(entries: ProjectFileEntry[]) {
  const root: FileTreeNode[] = [];
  const directories = new Map<string, FileTreeNode>();

  for (const entry of entries) {
    const parts = entry.path.split('/');
    let children = root;
    let currentPath = '';

    for (let index = 0; index < parts.length - 1; index += 1) {
      const part = parts[index];
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      let directory = directories.get(currentPath);

      if (!directory) {
        directory = createDirectoryNode(part, currentPath);
        directories.set(currentPath, directory);
        children.push(directory);
      }

      children = directory.children;
    }

    children.push(createFileNode(entry));
  }

  const sortNodes = (nodes: FileTreeNode[]) => {
    nodes.sort((left, right) => {
      if (left.isDirectory !== right.isDirectory) {
        return left.isDirectory ? -1 : 1;
      }

      return left.name.localeCompare(right.name);
    });

    for (const node of nodes) {
      if (node.isDirectory) {
        sortNodes(node.children);
      }
    }
  };

  sortNodes(root);
  return root;
}
