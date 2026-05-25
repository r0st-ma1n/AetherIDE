function splitPath(filePath: string) {
  return filePath.split('/');
}

export function dirname(filePath: string) {
  const parts = splitPath(filePath);

  if (parts.length <= 1) {
    return '';
  }

  return parts.slice(0, -1).join('/');
}

export function basename(filePath: string) {
  const parts = splitPath(filePath);
  return parts[parts.length - 1] ?? filePath;
}

export function extname(filePath: string) {
  const name = basename(filePath);
  const dotIndex = name.lastIndexOf('.');

  if (dotIndex <= 0) {
    return '';
  }

  return name.slice(dotIndex);
}

export function basenameWithoutExt(filePath: string) {
  const name = basename(filePath);
  const extension = extname(name);

  if (!extension) {
    return name;
  }

  return name.slice(0, -extension.length);
}

export function joinPath(...parts: string[]) {
  return parts.filter(Boolean).join('/');
}
