import { describe, it, expect } from 'vitest';
import type {
  AetherProject,
  AetherProjectComponent,
  UISpecComponent,
} from '@/shared/types';
import {
  validateAetherProject,
  toAetherProject,
  fromAetherProject,
  parseAetherProject,
} from './validateAetherProject';

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
  version: 1,
  components: [validComponent],
};

// ─── valid files ──────────────────────────────────────────────────────────────

describe('validateAetherProject — valid files', () => {
  it('accepts a minimal valid project', () => {
    expect(validateAetherProject(validProject)).toEqual({ valid: true });
  });

  it('accepts empty components array', () => {
    expect(validateAetherProject({ version: 1, components: [] })).toEqual({
      valid: true,
    });
  });

  it('accepts all three component types', () => {
    const project: AetherProject = {
      version: 1,
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
      version: 1,
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
    const result = validateAetherProject({ version: 1 });
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
    const result = validateAetherProject({ version: 1, components: {} });
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
        version: 1,
        components: [component],
      });
      expect(result.valid).toBe(false);
      if (!result.valid) expect(result.errors.join(' ')).toContain(field);
    }
  );

  it('component with invalid type → error mentions path to type', () => {
    const result = validateAetherProject({
      version: 1,
      components: [{ ...validComponent, type: 'LED' }],
    });
    expect(result.valid).toBe(false);
    if (!result.valid)
      expect(result.errors.join(' ')).toMatch(/\/components\/0\/type|type/);
  });

  it('component width = 0 → error mentions /components/0/width', () => {
    const result = validateAetherProject({
      version: 1,
      components: [{ ...validComponent, width: 0 }],
    });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.join(' ')).toMatch(/width/);
  });

  it('component id = "" → error mentions /components/0/id', () => {
    const result = validateAetherProject({
      version: 1,
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
    expect(validateAetherProject(toAetherProject(components))).toEqual({
      valid: true,
    });
  });

  it('sets version = 1 by default', () => {
    expect(toAetherProject([]).version).toBe(1);
  });

  it('rejects custom versions above the schema maximum', () => {
    const project = toAetherProject([], 3);
    expect(project.version).toBe(3);
    expect(validateAetherProject(project).valid).toBe(false);
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
    const project = toAetherProject(components);
    expect(validateAetherProject(project)).toEqual({ valid: true });
    expect(project.components).toHaveLength(15);
  });

  it('component without params/color has empty properties', () => {
    const project = toAetherProject([
      {
        id: 'btn1',
        type: 'Button',
        position: { x: 0, y: 0 },
        size: { width: 100, height: 30 },
      },
    ]);
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

    const restored = fromAetherProject(toAetherProject(components));
    expect(restored.components).toEqual(components);
  });

  it('drops incomplete params from properties bag', () => {
    const project: AetherProject = {
      version: 1,
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
      version: 1,
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
      expect(result.project.version).toBe(1);
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
      version: 1,
      components: [{ type: 'Knob' }],
    });
    expect(result.valid).toBe(false);
  });
});
