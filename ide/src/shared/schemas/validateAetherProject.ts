import Ajv from 'ajv';
import type {
  AetherProject,
  AetherProjectComponent,
  UISpecComponent,
} from '@/shared/types';
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

export function toAetherProject(
  components: UISpecComponent[],
  version = 1
): AetherProject {
  return {
    version,
    components: components.map(
      (c): AetherProjectComponent => ({
        type: c.type,
        id: c.id,
        x: c.position.x,
        y: c.position.y,
        width: c.size.width,
        height: c.size.height,
        properties: {
          ...(c.params !== undefined && {
            min: c.params.min,
            max: c.params.max,
            default: c.params.default,
          }),
          ...(c.color !== undefined && { color: c.color }),
        },
      })
    ),
  };
}
