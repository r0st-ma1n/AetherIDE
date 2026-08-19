import Ajv from 'ajv';
import type { AetherProject, UISpec } from '@/shared/types';
import { fromAetherProject, toAetherProject } from '@/shared/lib/uiModel';
import {
  AetherMigrationError,
  CURRENT_AETHER_SCHEMA_VERSION,
  migrateAetherProject,
} from './migrateAetherProject';
import schemaJson from './aetherProject.schema.json';

const ajv = new Ajv({ allErrors: true, strict: false });
const _validate = ajv.compile(schemaJson);

export interface ValidationResult {
  valid: true;
}

export interface ValidationFailure {
  valid: false;
  errors: string[];
}

export function validateAetherProject(
  data: unknown
): ValidationResult | ValidationFailure {
  if (_validate(data)) return { valid: true };
  const errors = (_validate.errors ?? []).map(
    (e) => `${e.instancePath || '(root)'}: ${e.message ?? 'unknown error'}`
  );
  return { valid: false, errors };
}

export {
  AetherMigrationError,
  CURRENT_AETHER_SCHEMA_VERSION,
  fromAetherProject,
  migrateAetherProject,
  toAetherProject,
};

/** Convenience: migrate → validate → convert to UISpec. */
export function parseAetherProject(data: unknown):
  | ValidationFailure
  | {
      valid: true;
      project: AetherProject;
      spec: UISpec;
    } {
  let migrated: AetherProject;
  try {
    migrated = migrateAetherProject(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Migration failed.';
    return { valid: false, errors: [message] };
  }

  const result = validateAetherProject(migrated);
  if (!result.valid) {
    return result;
  }

  return {
    valid: true as const,
    project: migrated,
    spec: fromAetherProject(migrated),
  };
}
