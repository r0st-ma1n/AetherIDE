import { describe, expect, it } from 'vitest';
import {
  AetherMigrationError,
  CURRENT_AETHER_SCHEMA_VERSION,
  migrateAetherProject,
} from './migrateAetherProject';
import { validateAetherProject } from './validateAetherProject';
import { defaultProjectMeta } from '@/shared/lib/projectMeta';

describe('migrateAetherProject', () => {
  it('is a no-op for current-version documents', () => {
    const input = {
      version: CURRENT_AETHER_SCHEMA_VERSION,
      ...defaultProjectMeta('Demo'),
      components: [
        {
          type: 'Knob',
          id: 'k1',
          x: 1,
          y: 2,
          width: 3,
          height: 4,
          properties: { min: 0, max: 1, default: 0.5 },
        },
      ],
      canvasWidth: 600,
      canvasHeight: 400,
    };

    const migrated = migrateAetherProject(input);
    expect(migrated.version).toBe(CURRENT_AETHER_SCHEMA_VERSION);
    expect(migrated).toEqual(input);
    expect(validateAetherProject(migrated)).toEqual({ valid: true });
  });

  it('upgrades unversioned legacy documents to current', () => {
    const legacy = {
      components: [
        {
          type: 'Slider',
          id: 's1',
          x: 10,
          y: 20,
          width: 100,
          height: 40,
        },
      ],
      canvasWidth: 500,
      canvasHeight: 300,
    };

    const migrated = migrateAetherProject(legacy);
    expect(migrated.version).toBe(CURRENT_AETHER_SCHEMA_VERSION);
    expect(migrated.components[0]?.properties).toEqual({});
    expect(validateAetherProject(migrated)).toEqual({ valid: true });
  });

  it('coerces numeric string versions', () => {
    const migrated = migrateAetherProject({
      version: '1',
      components: [],
    });
    expect(migrated.version).toBe(CURRENT_AETHER_SCHEMA_VERSION);
    expect(validateAetherProject(migrated)).toEqual({ valid: true });
  });

  it('v1 → v2 adds plugin and parameters named after the file', () => {
    const v1 = {
      version: 1,
      components: [],
      canvasWidth: 600,
      canvasHeight: 400,
    };

    const migrated = migrateAetherProject(v1, { pluginName: 'Gain Pro' });
    expect(migrated.plugin).toEqual({
      name: 'Gain Pro',
      vendor: 'My Company',
      id: 'com.mycompany.gainpro',
      version: '1.0.0',
      category: 'Effect',
    });
    expect(migrated.parameters).toEqual([]);
    expect(migrated.canvasWidth).toBe(600);
    expect(validateAetherProject(migrated)).toEqual({ valid: true });
  });

  it('v1 → v2 moves pluginType into plugin.category', () => {
    const migrated = migrateAetherProject({
      version: 1,
      components: [],
      pluginType: 'Instrument',
    });
    expect(migrated.plugin.category).toBe('Instrument');
    expect(migrated).not.toHaveProperty('pluginType');
    expect(validateAetherProject(migrated)).toEqual({ valid: true });
  });

  it('v1 → v2 without a name falls back to "Plugin"', () => {
    const migrated = migrateAetherProject({ version: 1, components: [] });
    expect(migrated.plugin.name).toBe('Plugin');
    expect(migrated.plugin.id).toBe('com.mycompany.plugin');
  });

  it('does not mutate the input', () => {
    const v1 = { version: 1, components: [], pluginType: 'Effect' };
    migrateAetherProject(v1);
    expect(v1).toEqual({ version: 1, components: [], pluginType: 'Effect' });
  });

  it('rejects unsupported future versions', () => {
    expect(() =>
      migrateAetherProject({
        version: CURRENT_AETHER_SCHEMA_VERSION + 1,
        components: [],
      })
    ).toThrow(AetherMigrationError);
    expect(() =>
      migrateAetherProject({
        version: CURRENT_AETHER_SCHEMA_VERSION + 1,
        components: [],
      })
    ).toThrow(/Unsupported/);
  });

  it('rejects non-objects', () => {
    expect(() => migrateAetherProject([])).toThrow(AetherMigrationError);
    expect(() => migrateAetherProject(null)).toThrow(AetherMigrationError);
  });
});
