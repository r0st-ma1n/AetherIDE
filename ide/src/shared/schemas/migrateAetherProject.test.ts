import { describe, expect, it } from 'vitest';
import {
  AetherMigrationError,
  CURRENT_AETHER_SCHEMA_VERSION,
  migrateAetherProject,
} from './migrateAetherProject';
import { validateAetherProject } from './validateAetherProject';

describe('migrateAetherProject', () => {
  it('is a no-op for current-version documents', () => {
    const input = {
      version: CURRENT_AETHER_SCHEMA_VERSION,
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
    expect(migrated.components).toHaveLength(1);
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
    expect(migrated.version).toBe(1);
    expect(validateAetherProject(migrated)).toEqual({ valid: true });
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
