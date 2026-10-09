import type { AetherPluginCategory, AetherProjectMeta } from '@/shared/types';

export const DEFAULT_PLUGIN_NAME = 'Plugin';
export const DEFAULT_PLUGIN_VENDOR = 'My Company';
export const DEFAULT_PLUGIN_VERSION = '1.0.0';

function slug(value: string, fallback: string): string {
  const result = value.toLowerCase().replace(/[^a-z0-9]/g, '');
  return result || fallback;
}

/** Reverse-DNS id from vendor and plugin name, e.g. "com.mycompany.gain". */
export function defaultPluginId(vendor: string, name: string): string {
  return `com.${slug(vendor, 'vendor')}.${slug(name, 'plugin')}`;
}

/** Plugin name from a project file path: "C:\\p\\Gain.aether" → "Gain". */
export function pluginNameFromPath(filePath: string): string {
  const base = filePath.split(/[\\/]/).pop() ?? '';
  return base.replace(/\.[^.]*$/, '') || DEFAULT_PLUGIN_NAME;
}

/** Metadata for a new project or for a file migrated from schema v1. */
export function defaultProjectMeta(
  name = DEFAULT_PLUGIN_NAME,
  category: AetherPluginCategory = 'Effect'
): AetherProjectMeta {
  return {
    plugin: {
      name,
      vendor: DEFAULT_PLUGIN_VENDOR,
      id: defaultPluginId(DEFAULT_PLUGIN_VENDOR, name),
      version: DEFAULT_PLUGIN_VERSION,
      category,
    },
    parameters: [],
  };
}
