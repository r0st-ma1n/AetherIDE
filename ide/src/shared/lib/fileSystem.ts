export function isUiDefinition(filePath: string) {
  return filePath.endsWith('.aether') || filePath.endsWith('.ui');
}

export function isAetherDocument(filePath: string) {
  return filePath.endsWith('.aether');
}
