import type { AetherProject } from '@/shared/types';

/** Bump when introducing a breaking .aether format change + a migrator step. */
export const CURRENT_AETHER_SCHEMA_VERSION = 1;

export class AetherMigrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AetherMigrationError';
  }
}

function readSchemaVersion(raw: Record<string, unknown>): number {
  if (raw.version === undefined || raw.version === null) {
    // Legacy documents written before version was required.
    return 0;
  }

  if (typeof raw.version === 'number' && Number.isFinite(raw.version)) {
    return raw.version;
  }

  if (typeof raw.version === 'string' && /^\d+$/.test(raw.version.trim())) {
    return Number.parseInt(raw.version.trim(), 10);
  }

  throw new AetherMigrationError(
    'Invalid .aether schema version: expected a finite integer.'
  );
}

/**
 * Legacy / unversioned documents → v1.
 * Ensures `components` is an array and every component has a `properties` object.
 */
function migrateV0ToV1(draft: Record<string, unknown>): void {
  if (!Array.isArray(draft.components)) {
    draft.components = [];
  }

  const components = draft.components as unknown[];
  draft.components = components.map((entry: unknown) => {
    if (entry == null || typeof entry !== 'object' || Array.isArray(entry)) {
      return entry;
    }

    const component = { ...(entry as Record<string, unknown>) };
    if (
      component.properties == null ||
      typeof component.properties !== 'object' ||
      Array.isArray(component.properties)
    ) {
      component.properties = {};
    }
    return component;
  });
}

/**
 * Normalize unknown JSON into the current on-disk .aether shape (before AJV).
 * Throws {@link AetherMigrationError} for unsupported or corrupt versions.
 */
export function migrateAetherProject(raw: unknown): AetherProject {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new AetherMigrationError('.aether file must contain a JSON object.');
  }

  const draft = structuredClone(raw) as Record<string, unknown>;
  const fromVersion = readSchemaVersion(draft);

  if (fromVersion > CURRENT_AETHER_SCHEMA_VERSION) {
    throw new AetherMigrationError(
      `Unsupported .aether schema version ${fromVersion}. This IDE supports up to ${CURRENT_AETHER_SCHEMA_VERSION}.`
    );
  }

  if (fromVersion < 0) {
    throw new AetherMigrationError(
      `Invalid .aether schema version ${fromVersion}.`
    );
  }

  if (fromVersion < 1) {
    migrateV0ToV1(draft);
  }

  // Future: if (fromVersion < 2) migrateV1ToV2(draft);

  draft.version = CURRENT_AETHER_SCHEMA_VERSION;
  return draft as unknown as AetherProject;
}
