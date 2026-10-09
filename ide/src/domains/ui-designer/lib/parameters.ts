import { defaultProjectMeta } from '@/shared/lib/projectMeta';
import {
  CURRENT_AETHER_SCHEMA_VERSION,
  validateAetherProject,
} from '@/shared/schemas/validateAetherProject';
import type { AetherParameter, UiComponentType } from '@/shared/types';

export type ParameterType = AetherParameter['type'];

export const PARAMETER_TYPES: { type: ParameterType; label: string }[] = [
  { type: 'float', label: 'Float' },
  { type: 'bool', label: 'Bool' },
  { type: 'choice', label: 'Choice' },
];

/** First free id of the form "param<N>". */
export function nextParameterId(existingIds: readonly string[]): string {
  const taken = new Set(existingIds);
  let n = existingIds.length + 1;
  while (taken.has(`param${n}`)) n += 1;
  return `param${n}`;
}

/** New continuous float parameter in [0, 1] with a free id. */
export function createParameter(
  existingIds: readonly string[]
): AetherParameter {
  const id = nextParameterId(existingIds);
  return {
    id,
    name: `Param ${id.slice('param'.length)}`,
    type: 'float',
    min: 0,
    max: 1,
    default: 0,
  };
}

/** Same id and name, type-specific fields reset to defaults of @p type. */
export function convertParameterType(
  param: AetherParameter,
  type: ParameterType
): AetherParameter {
  const { id, name } = param;
  switch (type) {
    case 'float':
      return { id, name, type, min: 0, max: 1, default: 0 };
    case 'bool':
      return { id, name, type, default: false };
    case 'choice':
      return { id, name, type, choices: ['Off', 'On'], default: 0 };
  }
}

/**
 * Validation errors of `parameters[index]` in the context of the whole list
 * (duplicate ids), with the "/parameters/<index>/" prefix stripped.
 */
export function parameterErrors(
  parameters: readonly AetherParameter[],
  index: number
): string[] {
  const result = validateAetherProject({
    version: CURRENT_AETHER_SCHEMA_VERSION,
    plugin: defaultProjectMeta().plugin,
    parameters,
    components: [],
  });
  if (result.valid) return [];
  // "/parameters/0/min: ..." for a field, "/parameters/0: ..." for the whole entry.
  const path = `/parameters/${index}`;
  return result.errors
    .filter(
      (error) => error.startsWith(`${path}/`) || error.startsWith(`${path}:`)
    )
    .map((error) => error.slice(path.length + 1).trimStart());
}

/** Widget kinds a parameter type can drive: buttons toggle, knobs and sliders sweep. */
export function canBindParameter(
  componentType: UiComponentType,
  parameterType: ParameterType
): boolean {
  return componentType === 'Button'
    ? parameterType === 'bool'
    : parameterType !== 'bool';
}
