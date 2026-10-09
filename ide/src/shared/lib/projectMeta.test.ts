import { describe, expect, it } from 'vitest';
import {
  defaultPluginId,
  defaultProjectMeta,
  pluginNameFromPath,
} from './projectMeta';
import { validateAetherProject } from '@/shared/schemas/validateAetherProject';

describe('projectMeta', () => {
  it('builds a reverse-DNS id from vendor and name', () => {
    expect(defaultPluginId('My Company', 'Gain')).toBe('com.mycompany.gain');
    expect(defaultPluginId('!!!', 'Синт')).toBe('com.vendor.plugin');
  });

  it.each([
    ['C:\\projects\\Gain.aether', 'Gain'],
    ['/home/u/Reverb.aether', 'Reverb'],
    ['Delay', 'Delay'],
    ['', 'Plugin'],
  ])('takes the plugin name from %j', (path, name) => {
    expect(pluginNameFromPath(path)).toBe(name);
  });

  it('default meta passes validation for any name', () => {
    for (const name of ['Gain', 'Синт', 'a b']) {
      const meta = defaultProjectMeta(name, 'Instrument');
      expect(meta.plugin.category).toBe('Instrument');
      expect(
        validateAetherProject({ version: 2, ...meta, components: [] })
      ).toEqual({ valid: true });
    }
  });
});
