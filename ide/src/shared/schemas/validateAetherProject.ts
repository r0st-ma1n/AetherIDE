import Ajv from 'ajv';
import type { AetherParameter, AetherProject, UISpec } from '@/shared/types';
import { fromAetherProject, toAetherProject } from '@/shared/lib/uiModel';
import {
  AetherMigrationError,
  CURRENT_AETHER_SCHEMA_VERSION,
  migrateAetherProject,
  type MigrationContext,
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

/** Same tolerance as AudioProcessorParameter in framework/core. */
const STEP_TOLERANCE = 1e-4;

const FIELDS_BY_TYPE: Record<AetherParameter['type'], readonly string[]> = {
  float: ['min', 'max', 'step', 'unit'],
  bool: [],
  choice: ['choices'],
};
const TYPED_FIELDS = ['min', 'max', 'step', 'unit', 'choices'] as const;

/**
 * Checks JSON Schema cannot express. Mirrors the rules the framework enforces when
 * the generated processor creates its parameters, so a bad project fails in the IDE
 * instead of at plugin load.
 */
function checkParameter(
  param: AetherParameter,
  path: string,
  errors: string[]
): void {
  const allowed = FIELDS_BY_TYPE[param.type];
  for (const field of TYPED_FIELDS) {
    if (field in param && !allowed.includes(field)) {
      errors.push(`${path}/${field}: not allowed for ${param.type} parameters`);
    }
  }

  if (param.type === 'choice') {
    if (param.default >= param.choices.length) {
      errors.push(`${path}/default: choice index is out of range`);
    }
    if (new Set(param.choices).size !== param.choices.length) {
      errors.push(`${path}/choices: must be unique`);
    }
    return;
  }

  if (param.type !== 'float') return;

  const { min, max, step = 0 } = param;
  if (!(min < max)) {
    errors.push(`${path}/max: must be greater than min`);
    return;
  }
  if (param.default < min || param.default > max) {
    errors.push(`${path}/default: must be within [min, max]`);
  }
  if (step === 0) return;

  const range = max - min;
  if (step > range) {
    errors.push(`${path}/step: must not exceed max - min`);
    return;
  }
  const steps = range / step;
  if (Math.abs(steps - Math.round(steps)) > STEP_TOLERANCE) {
    errors.push(`${path}/step: max - min must be a multiple of step`);
    return;
  }
  const snapped = min + Math.round((param.default - min) / step) * step;
  if (Math.abs(snapped - param.default) > STEP_TOLERANCE * range) {
    errors.push(`${path}/default: must be on the step grid`);
  }
}

function checkSemantics(project: AetherProject): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  project.parameters.forEach((param, index) => {
    const path = `/parameters/${index}`;
    if (seen.has(param.id)) {
      errors.push(`${path}/id: duplicate parameter id "${param.id}"`);
    }
    seen.add(param.id);
    checkParameter(param, path, errors);
  });
  return errors;
}

export function validateAetherProject(
  data: unknown
): ValidationResult | ValidationFailure {
  if (!_validate(data)) {
    const errors = (_validate.errors ?? []).map(
      (e) => `${e.instancePath || '(root)'}: ${e.message ?? 'unknown error'}`
    );
    return { valid: false, errors };
  }
  const errors = checkSemantics(data as unknown as AetherProject);
  return errors.length === 0 ? { valid: true } : { valid: false, errors };
}

export {
  AetherMigrationError,
  CURRENT_AETHER_SCHEMA_VERSION,
  fromAetherProject,
  migrateAetherProject,
  toAetherProject,
};

/** Convenience: migrate → validate → convert to UISpec. */
export function parseAetherProject(
  data: unknown,
  context: MigrationContext = {}
):
  | ValidationFailure
  | {
      valid: true;
      project: AetherProject;
      spec: UISpec;
    } {
  let migrated: AetherProject;
  try {
    migrated = migrateAetherProject(data, context);
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
