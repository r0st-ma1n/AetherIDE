import { describe, it, expect } from 'vitest';
import type {
  AetherProject,
  AetherProjectComponent,
  UISpecComponent,
} from '@/shared/types';
import { defaultProjectMeta } from '@/shared/lib/projectMeta';
import {
  CURRENT_AETHER_SCHEMA_VERSION,
  validateAetherProject,
  toAetherProject,
  fromAetherProject,
  parseAetherProject,
} from './validateAetherProject';

const meta = defaultProjectMeta('Test');
const base = { version: CURRENT_AETHER_SCHEMA_VERSION, ...meta };

const validComponent: AetherProjectComponent = {
  type: 'Knob',
  id: 'knob1',
  x: 0,
  y: 0,
  width: 80,
  height: 80,
  properties: {},
};

const validProject: AetherProject = {
  ...base,
  components: [validComponent],
};

// ─── valid files ──────────────────────────────────────────────────────────────

describe('validateAetherProject — valid files', () => {
  it('accepts a minimal valid project', () => {
    expect(validateAetherProject(validProject)).toEqual({ valid: true });
  });

  it('accepts empty components array', () => {
    expect(validateAetherProject({ ...base, components: [] })).toEqual({
      valid: true,
    });
  });

  it('accepts all three component types', () => {
    const project: AetherProject = {
      ...base,
      components: [
        { ...validComponent, type: 'Knob' },
        { ...validComponent, id: 's1', type: 'Slider' },
        { ...validComponent, id: 'b1', type: 'Button' },
      ],
    };
    expect(validateAetherProject(project).valid).toBe(true);
  });

  it('accepts properties with arbitrary keys', () => {
    const project = {
      ...base,
      components: [
        {
          ...validComponent,
          properties: { min: 0, max: 1, default: 0.5, color: '#ff0000' },
        },
      ],
    };
    expect(validateAetherProject(project).valid).toBe(true);
  });

  it('rejects versions above the current schema maximum', () => {
    expect(validateAetherProject({ version: 42, components: [] }).valid).toBe(
      false
    );
  });
});

// ─── invalid files — error must name the failing field ────────────────────────

describe('validateAetherProject — invalid files report the failing field', () => {
  it('missing version → error mentions "version"', () => {
    const result = validateAetherProject({ components: [] });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.join(' ')).toContain('version');
  });

  it('missing components → error mentions "components"', () => {
    const result = validateAetherProject({ ...base });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.join(' ')).toContain('components');
  });

  it('version = 0 → error (minimum is 1) mentioning /version', () => {
    const result = validateAetherProject({ version: 0, components: [] });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.join(' ')).toMatch(/version/);
  });

  it('version is a string → error mentioning /version', () => {
    const result = validateAetherProject({ version: '1', components: [] });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.join(' ')).toMatch(/version/);
  });

  it('components is not an array → error mentioning "components"', () => {
    const result = validateAetherProject({ ...base, components: {} });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.join(' ')).toContain('components');
  });

  it('returns a non-empty errors array on failure', () => {
    const result = validateAetherProject({});
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(Array.isArray(result.errors)).toBe(true);
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });

  it.each(['type', 'id', 'x', 'y', 'width', 'height', 'properties'] as const)(
    'component missing "%s" → error mentions the field',
    (field) => {
      const component = { ...validComponent } as Record<string, unknown>;
      delete component[field];
      const result = validateAetherProject({
        ...base,
        components: [component],
      });
      expect(result.valid).toBe(false);
      if (!result.valid) expect(result.errors.join(' ')).toContain(field);
    }
  );

  it('component with invalid type → error mentions path to type', () => {
    const result = validateAetherProject({
      ...base,
      components: [{ ...validComponent, type: 'LED' }],
    });
    expect(result.valid).toBe(false);
    if (!result.valid)
      expect(result.errors.join(' ')).toMatch(/\/components\/0\/type|type/);
  });

  it('component width = 0 → error mentions /components/0/width', () => {
    const result = validateAetherProject({
      ...base,
      components: [{ ...validComponent, width: 0 }],
    });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.join(' ')).toMatch(/width/);
  });

  it('component id = "" → error mentions /components/0/id', () => {
    const result = validateAetherProject({
      ...base,
      components: [{ ...validComponent, id: '' }],
    });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.join(' ')).toMatch(/id/);
  });
});

// ─── toAetherProject — generated files pass validation ────────────────────────

describe('toAetherProject — generated files pass validation', () => {
  it('converts UISpecComponent[] to a valid AetherProject', () => {
    const components: UISpecComponent[] = [
      {
        id: 'knob1',
        type: 'Knob',
        position: { x: 10, y: 20 },
        size: { width: 80, height: 80 },
        params: { min: 0, max: 1, default: 0.5 },
        color: '#ff0000',
      },
      {
        id: 'slider1',
        type: 'Slider',
        position: { x: 0, y: 100 },
        size: { width: 200, height: 40 },
        params: { min: -12, max: 12, default: 0 },
      },
      {
        id: 'btn1',
        type: 'Button',
        position: { x: 0, y: 200 },
        size: { width: 100, height: 30 },
      },
    ];
    expect(validateAetherProject(toAetherProject(components, meta))).toEqual({
      valid: true,
    });
  });

  it('writes the current schema version and the given meta', () => {
    const project = toAetherProject([], meta);
    expect(project.version).toBe(CURRENT_AETHER_SCHEMA_VERSION);
    expect(project.plugin).toEqual(meta.plugin);
    expect(project.parameters).toEqual([]);
  });

  it('10 knob + 3 slider + 2 button — all 15 components pass validation', () => {
    const components: UISpecComponent[] = [
      ...Array.from(
        { length: 10 },
        (_, i): UISpecComponent => ({
          id: `knob${i + 1}`,
          type: 'Knob',
          position: { x: i * 90, y: 0 },
          size: { width: 80, height: 80 },
          params: { min: 0, max: 1, default: 0.5 },
          color: '#aabbcc',
        })
      ),
      ...Array.from(
        { length: 3 },
        (_, i): UISpecComponent => ({
          id: `slider${i + 1}`,
          type: 'Slider',
          position: { x: i * 210, y: 100 },
          size: { width: 200, height: 40 },
          params: { min: -12, max: 12, default: 0 },
        })
      ),
      ...Array.from(
        { length: 2 },
        (_, i): UISpecComponent => ({
          id: `button${i + 1}`,
          type: 'Button',
          position: { x: i * 110, y: 200 },
          size: { width: 100, height: 30 },
        })
      ),
    ];
    const project = toAetherProject(components, meta);
    expect(validateAetherProject(project)).toEqual({ valid: true });
    expect(project.components).toHaveLength(15);
  });

  it('component without params/color has empty properties', () => {
    const project = toAetherProject(
      [
        {
          id: 'btn1',
          type: 'Button',
          position: { x: 0, y: 0 },
          size: { width: 100, height: 30 },
        },
      ],
      meta
    );
    expect(project.components[0].properties).toEqual({});
    expect(validateAetherProject(project)).toEqual({ valid: true });
  });
});

describe('fromAetherProject — on-disk to canonical UISpec', () => {
  it('round-trips geometry, params, step and color', () => {
    const components: UISpecComponent[] = [
      {
        id: 'knob1',
        type: 'Knob',
        position: { x: 10, y: 20 },
        size: { width: 80, height: 80 },
        params: { min: 0, max: 1, default: 0.5, step: 0.01 },
        color: '#ff0000',
      },
      {
        id: 'btn1',
        type: 'Button',
        position: { x: 0, y: 200 },
        size: { width: 100, height: 30 },
      },
    ];

    const restored = fromAetherProject(toAetherProject(components, meta));
    expect(restored.components).toEqual(components);
  });

  it('drops incomplete params from properties bag', () => {
    const project: AetherProject = {
      ...base,
      components: [
        {
          type: 'Knob',
          id: 'knob1',
          x: 0,
          y: 0,
          width: 80,
          height: 80,
          properties: { min: 0, max: 1 },
        },
      ],
    };

    expect(fromAetherProject(project).components[0]?.params).toBeUndefined();
  });
});

describe('parseAetherProject', () => {
  it('returns UISpec for valid documents', () => {
    const result = parseAetherProject({
      ...base,
      components: [validComponent],
    });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.spec.components[0]?.id).toBe('knob1');
    }
  });

  it('migrates legacy documents missing version', () => {
    const result = parseAetherProject({
      components: [validComponent],
    });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.project.version).toBe(CURRENT_AETHER_SCHEMA_VERSION);
      expect(result.spec.components[0]?.id).toBe('knob1');
    }
  });

  it('returns validation errors for unsupported schema versions', () => {
    const result = parseAetherProject({ version: 99, components: [] });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.join(' ')).toMatch(/Unsupported/);
    }
  });

  it('returns validation errors for invalid documents', () => {
    const result = parseAetherProject({
      ...base,
      components: [{ type: 'Knob' }],
    });
    expect(result.valid).toBe(false);
  });
});

// ─── plugin section ───────────────────────────────────────────────────────────

describe('validateAetherProject — plugin', () => {
  function withPlugin(patch: Record<string, unknown>) {
    return { ...base, plugin: { ...meta.plugin, ...patch }, components: [] };
  }

  function errorsOf(data: unknown): string {
    const result = validateAetherProject(data);
    return result.valid ? '' : result.errors.join(' ');
  }

  it('accepts optional url and email', () => {
    expect(
      validateAetherProject(
        withPlugin({ url: 'https://example.com', email: 'a@b.c' })
      )
    ).toEqual({ valid: true });
  });

  it('requires the plugin section', () => {
    expect(errorsOf({ version: 2, parameters: [], components: [] })).toMatch(
      /plugin/
    );
  });

  it.each(['name', 'vendor', 'id', 'version', 'category'])(
    'requires plugin.%s',
    (field) => {
      const plugin: Record<string, unknown> = { ...meta.plugin };
      delete plugin[field];
      expect(errorsOf({ ...base, plugin, components: [] })).toContain(field);
    }
  );

  it.each(['com.acme gain', 'com/acme', ''])('rejects plugin id %j', (id) => {
    expect(errorsOf(withPlugin({ id }))).toMatch(/\/plugin\/id/);
  });

  it.each(['1.0', '1.0.0-beta', '01.0.0', 'v1.0.0'])(
    'rejects plugin version %j',
    (version) => {
      expect(errorsOf(withPlugin({ version }))).toMatch(/\/plugin\/version/);
    }
  );

  it('rejects an unknown category', () => {
    expect(errorsOf(withPlugin({ category: 'Midi' }))).toMatch(
      /\/plugin\/category/
    );
  });

  it('rejects the v1 pluginType field', () => {
    expect(errorsOf({ ...base, components: [], pluginType: 'Effect' })).toMatch(
      /additional properties/
    );
  });
});

// ─── parameters section ───────────────────────────────────────────────────────

describe('validateAetherProject — parameters', () => {
  const gain = {
    id: 'gain',
    name: 'Gain',
    type: 'float',
    min: -60,
    max: 12,
    default: 0,
    step: 0.5,
    unit: 'dB',
  };
  const bypass = { id: 'bypass', name: 'Bypass', type: 'bool', default: false };
  const mode = {
    id: 'mode',
    name: 'Mode',
    type: 'choice',
    choices: ['Soft', 'Hard'],
    default: 1,
  };

  function withParams(...parameters: unknown[]) {
    return { ...base, parameters, components: [] };
  }

  function errorsOf(data: unknown): string {
    const result = validateAetherProject(data);
    return result.valid ? '' : result.errors.join(' ');
  }

  it('accepts float, bool and choice parameters', () => {
    expect(validateAetherProject(withParams(gain, bypass, mode))).toEqual({
      valid: true,
    });
  });

  it('accepts a continuous float without step and unit', () => {
    expect(
      validateAetherProject(
        withParams({
          id: 'mix',
          name: 'Mix',
          type: 'float',
          min: 0,
          max: 1,
          default: 1,
        })
      )
    ).toEqual({ valid: true });
  });

  it('rejects duplicate ids', () => {
    expect(errorsOf(withParams(gain, { ...bypass, id: 'gain' }))).toMatch(
      /\/parameters\/1\/id: duplicate parameter id "gain"/
    );
  });

  it.each(['', '1gain', 'my gain', 'gain"'])('rejects id %j', (id) => {
    expect(errorsOf(withParams({ ...gain, id }))).toMatch(
      /\/parameters\/0\/id/
    );
  });

  it.each(['id', 'name', 'type', 'default'])('requires %s', (field) => {
    const param: Record<string, unknown> = { ...gain };
    delete param[field];
    expect(errorsOf(withParams(param))).toContain(field);
  });

  it('requires min and max for float', () => {
    const param: Record<string, unknown> = { ...gain };
    delete param.min;
    delete param.max;
    const errors = errorsOf(withParams(param));
    expect(errors).toContain('min');
    expect(errors).toContain('max');
  });

  it('rejects min >= max', () => {
    expect(errorsOf(withParams({ ...gain, min: 12, max: 12 }))).toMatch(
      /\/parameters\/0\/max: must be greater than min/
    );
  });

  it('rejects a default outside [min, max]', () => {
    expect(errorsOf(withParams({ ...gain, default: 13 }))).toMatch(
      /\/parameters\/0\/default: must be within/
    );
  });

  it('rejects a step larger than the range', () => {
    expect(errorsOf(withParams({ ...gain, step: 100 }))).toMatch(
      /\/parameters\/0\/step: must not exceed/
    );
  });

  it('rejects a range that is not a multiple of step', () => {
    expect(errorsOf(withParams({ ...gain, step: 0.7 }))).toMatch(
      /multiple of step/
    );
  });

  it('rejects a default off the step grid', () => {
    expect(errorsOf(withParams({ ...gain, default: 0.25 }))).toMatch(
      /\/parameters\/0\/default: must be on the step grid/
    );
  });

  it('rejects a negative step', () => {
    expect(errorsOf(withParams({ ...gain, step: -1 }))).toMatch(
      /\/parameters\/0\/step/
    );
  });

  it('rejects a numeric default for bool', () => {
    expect(errorsOf(withParams({ ...bypass, default: 1 }))).toMatch(
      /\/parameters\/0\/default/
    );
  });

  it.each(['min', 'max', 'step', 'unit'])('rejects %s on bool', (field) => {
    expect(
      errorsOf(withParams({ ...bypass, [field]: field === 'unit' ? 'x' : 1 }))
    ).toMatch(new RegExp(`/parameters/0/${field}: not allowed for bool`));
  });

  it('rejects choices on float', () => {
    expect(errorsOf(withParams({ ...gain, choices: ['a', 'b'] }))).toMatch(
      /\/parameters\/0\/choices: not allowed for float/
    );
  });

  it('requires choices for choice', () => {
    const param: Record<string, unknown> = { ...mode };
    delete param.choices;
    expect(errorsOf(withParams(param))).toContain('choices');
  });

  it('rejects fewer than two choices', () => {
    expect(
      errorsOf(withParams({ ...mode, choices: ['Only'], default: 0 }))
    ).toMatch(/\/parameters\/0\/choices/);
  });

  it('rejects duplicate choices', () => {
    expect(errorsOf(withParams({ ...mode, choices: ['A', 'A'] }))).toMatch(
      /\/parameters\/0\/choices: must be unique/
    );
  });

  it('rejects a choice default out of range or fractional', () => {
    expect(errorsOf(withParams({ ...mode, default: 2 }))).toMatch(
      /\/parameters\/0\/default: choice index is out of range/
    );
    expect(errorsOf(withParams({ ...mode, default: 0.5 }))).toMatch(
      /\/parameters\/0\/default/
    );
  });
});

// ─── widget bindings ──────────────────────────────────────────────────────────

describe('validateAetherProject — widget parameterId', () => {
  const gain = {
    id: 'gain',
    name: 'Gain',
    type: 'float' as const,
    min: 0,
    max: 1,
    default: 0,
  };

  function withBinding(parameterId: unknown) {
    return {
      ...base,
      parameters: [gain],
      components: [{ ...validComponent, properties: { parameterId } }],
    };
  }

  it('accepts a binding to an existing parameter', () => {
    expect(validateAetherProject(withBinding('gain'))).toEqual({
      valid: true,
    });
  });

  it('rejects a binding to an unknown parameter', () => {
    const result = validateAetherProject(withBinding('volume'));
    expect(result).toEqual({
      valid: false,
      errors: [
        '/components/0/properties/parameterId: unknown parameter "volume"',
      ],
    });
  });

  it('rejects a non-string binding', () => {
    const result = validateAetherProject(withBinding(1));
    expect(result.valid).toBe(false);
  });

  it('round-trips parameterId through toAetherProject / fromAetherProject', () => {
    const components: UISpecComponent[] = [
      {
        id: 'knob1',
        type: 'Knob',
        position: { x: 0, y: 0 },
        size: { width: 80, height: 80 },
        parameterId: 'gain',
      },
    ];
    const project = toAetherProject(components, {
      ...meta,
      parameters: [gain],
    });
    expect(project.components[0]?.properties).toEqual({ parameterId: 'gain' });
    expect(validateAetherProject(project)).toEqual({ valid: true });
    expect(fromAetherProject(project).components).toEqual(components);
  });
});
