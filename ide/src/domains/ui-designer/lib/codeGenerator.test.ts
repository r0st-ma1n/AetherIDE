import { describe, it, expect } from 'vitest';
import type { UISpec, UISpecComponent, UiComponentType } from '@/shared/types';
import {
  AETHER_UI_BEGIN,
  AETHER_UI_END,
  generateCppFromUI,
  generatePluginCode,
  upsertAetherUiBlock,
} from './codeGenerator';
import { parseUIFromCpp } from './codeParser';

describe('generateCppFromUI', () => {
  it('wraps output in AETHER markers', () => {
    const spec: UISpec = { components: [] };
    const cpp = generateCppFromUI(spec);
    expect(cpp).toContain('// --- AETHER UI BEGIN ---');
    expect(cpp).toContain('// --- AETHER UI END ---');
  });

  it('serializes all required fields into AETHER line', () => {
    const spec: UISpec = {
      components: [
        {
          id: 'knob1',
          type: 'Knob',
          position: { x: 10, y: 20 },
          size: { width: 80, height: 80 },
        },
      ],
    };
    const cpp = generateCppFromUI(spec);
    expect(cpp).toContain('// AETHER id=knob1 type=Knob x=10 y=20 w=80 h=80');
  });

  it('serializes optional params and color', () => {
    const spec: UISpec = {
      components: [
        {
          id: 'k1',
          type: 'Knob',
          position: { x: 0, y: 0 },
          size: { width: 80, height: 80 },
          params: { min: 0, max: 1, default: 0.5 },
          color: '#ff0000',
        },
      ],
    };
    const cpp = generateCppFromUI(spec);
    expect(cpp).toContain('min=0');
    expect(cpp).toContain('max=1');
    expect(cpp).toContain('default=0.5');
    expect(cpp).toContain('color=#ff0000');
  });

  it('serializes step when present', () => {
    const spec: UISpec = {
      components: [
        {
          id: 'k1',
          type: 'Knob',
          position: { x: 0, y: 0 },
          size: { width: 80, height: 80 },
          params: { min: 0, max: 10, default: 1, step: 0.5 },
        },
      ],
    };
    const cpp = generateCppFromUI(spec);
    expect(cpp).toContain('step=0.5');
  });

  it('omits step when not present', () => {
    const spec: UISpec = {
      components: [
        {
          id: 'k1',
          type: 'Knob',
          position: { x: 0, y: 0 },
          size: { width: 80, height: 80 },
          params: { min: 0, max: 1, default: 0.5 },
        },
      ],
    };
    const cpp = generateCppFromUI(spec);
    expect(cpp).not.toContain('step=');
  });

  it('omits params/color when not present', () => {
    const spec: UISpec = {
      components: [
        {
          id: 'btn1',
          type: 'Button',
          position: { x: 0, y: 0 },
          size: { width: 100, height: 30 },
        },
      ],
    };
    const cpp = generateCppFromUI(spec);
    expect(cpp).not.toContain('min=');
    expect(cpp).not.toContain('color=');
  });

  it('emits setBounds call for each component', () => {
    const spec: UISpec = {
      components: [
        {
          id: 'slider1',
          type: 'Slider',
          position: { x: 5, y: 15 },
          size: { width: 200, height: 40 },
        },
      ],
    };
    const cpp = generateCppFromUI(spec);
    expect(cpp).toContain('slider1.setBounds(5, 15, 200, 40);');
  });
});

describe('parseUIFromCpp', () => {
  it('empty file returns empty UISpec', () => {
    expect(parseUIFromCpp('')).toEqual({ components: [] });
  });

  it('file without Aether markers returns empty UISpec', () => {
    const cpp =
      'void MyPlugin::setupUI() {\n  knob1.setBounds(0, 0, 80, 80);\n}';
    expect(parseUIFromCpp(cpp)).toEqual({ components: [] });
  });

  it('skips AETHER line missing id', () => {
    const cpp = [
      '// AETHER type=Knob x=0 y=0 w=80 h=80',
      '// AETHER id=btn1 type=Button x=0 y=0 w=100 h=30',
    ].join('\n');
    const result = parseUIFromCpp(cpp);
    expect(result.components).toHaveLength(1);
    expect(result.components[0].id).toBe('btn1');
  });

  it('skips AETHER line missing type', () => {
    const cpp = [
      '// AETHER id=knob1 x=0 y=0 w=80 h=80',
      '// AETHER id=btn1 type=Button x=0 y=0 w=100 h=30',
    ].join('\n');
    const result = parseUIFromCpp(cpp);
    expect(result.components).toHaveLength(1);
    expect(result.components[0].id).toBe('btn1');
  });

  it('skips AETHER line with invalid type', () => {
    const cpp = [
      '// AETHER id=led1 type=LED x=0 y=0 w=20 h=20',
      '// AETHER id=btn1 type=Button x=0 y=0 w=100 h=30',
    ].join('\n');
    const result = parseUIFromCpp(cpp);
    expect(result.components).toHaveLength(1);
    expect(result.components[0].id).toBe('btn1');
  });

  it('file with partial tags: valid lines parsed, invalid skipped', () => {
    const cpp = [
      '// AETHER id=knob1 type=Knob x=10 y=20 w=80 h=80',
      '// AETHER type=Slider x=0 y=0 w=100 h=40',
      '// AETHER id=btn1 type=Button x=0 y=200 w=100 h=30',
    ].join('\n');
    const result = parseUIFromCpp(cpp);
    expect(result.components).toHaveLength(2);
    expect(result.components[0].id).toBe('knob1');
    expect(result.components[1].id).toBe('btn1');
  });

  it('does not crash on completely malformed AETHER line', () => {
    const cpp =
      '// AETHER %%%%garbage%%%%\n// AETHER id=k1 type=Knob x=0 y=0 w=80 h=80';
    const result = parseUIFromCpp(cpp);
    expect(result.components).toHaveLength(1);
    expect(result.components[0].id).toBe('k1');
  });

  it('ignores params when only some are present (requires all 3)', () => {
    const cpp = '// AETHER id=k1 type=Knob x=0 y=0 w=80 h=80 min=0 max=1';
    const result = parseUIFromCpp(cpp);
    expect(result.components[0].params).toBeUndefined();
  });

  it('parses step when present alongside min/max/default', () => {
    const cpp =
      '// AETHER id=k1 type=Knob x=0 y=0 w=80 h=80 min=0 max=10 default=1 step=0.5';
    const result = parseUIFromCpp(cpp);
    expect(result.components[0].params).toEqual({
      min: 0,
      max: 10,
      default: 1,
      step: 0.5,
    });
  });

  it('ignores step when min/max/default are absent', () => {
    const cpp = '// AETHER id=k1 type=Knob x=0 y=0 w=80 h=80 step=0.5';
    const result = parseUIFromCpp(cpp);
    expect(result.components[0].params).toBeUndefined();
  });
});

describe('round-trip: generateCppFromUI → parseUIFromCpp', () => {
  it('10 knob + 3 slider + 2 button — deep equal per field', () => {
    const spec: UISpec = {
      components: [
        ...Array.from(
          { length: 10 },
          (_, i): UISpecComponent => ({
            id: `knob${i + 1}`,
            type: 'Knob' as UiComponentType,
            position: { x: i * 90, y: 0 },
            size: { width: 80, height: 80 },
            params: { min: 0, max: 1, default: 0.5 },
            color: '#ff0000',
          })
        ),
        ...Array.from(
          { length: 3 },
          (_, i): UISpecComponent => ({
            id: `slider${i + 1}`,
            type: 'Slider' as UiComponentType,
            position: { x: i * 210, y: 100 },
            size: { width: 200, height: 40 },
            params: { min: -12, max: 12, default: 0 },
          })
        ),
        ...Array.from(
          { length: 2 },
          (_, i): UISpecComponent => ({
            id: `button${i + 1}`,
            type: 'Button' as UiComponentType,
            position: { x: i * 110, y: 200 },
            size: { width: 100, height: 30 },
          })
        ),
      ],
    };

    const cpp = generateCppFromUI(spec);
    const parsed = parseUIFromCpp(cpp);

    expect(parsed.components).toHaveLength(spec.components.length);
    spec.components.forEach((original, i) => {
      expect(parsed.components[i]).toEqual(original);
    });
  });

  it('preserves component with no optional fields (button)', () => {
    const spec: UISpec = {
      components: [
        {
          id: 'btn1',
          type: 'Button',
          position: { x: 0, y: 0 },
          size: { width: 100, height: 30 },
        },
      ],
    };
    const parsed = parseUIFromCpp(generateCppFromUI(spec));
    expect(parsed.components[0]).toEqual(spec.components[0]);
    expect(parsed.components[0].params).toBeUndefined();
    expect(parsed.components[0].color).toBeUndefined();
  });

  it('preserves step in params round-trip', () => {
    const spec: UISpec = {
      components: [
        {
          id: 'k1',
          type: 'Knob',
          position: { x: 0, y: 0 },
          size: { width: 80, height: 80 },
          params: { min: -12, max: 12, default: 0, step: 0.1 },
        },
      ],
    };
    const parsed = parseUIFromCpp(generateCppFromUI(spec));
    expect(parsed.components[0].params).toEqual({
      min: -12,
      max: 12,
      default: 0,
      step: 0.1,
    });
  });

  it('round-trip on C++ file with surrounding non-Aether code', () => {
    const spec: UISpec = {
      components: [
        {
          id: 'knob1',
          type: 'Knob',
          position: { x: 10, y: 10 },
          size: { width: 80, height: 80 },
        },
      ],
    };
    const cpp = `void MyPlugin::setupUI() {\n${generateCppFromUI(spec)}\n}`;
    const parsed = parseUIFromCpp(cpp);
    expect(parsed.components).toHaveLength(1);
    expect(parsed.components[0]).toEqual(spec.components[0]);
  });
});

describe('generatePluginCode AETHER protocol', () => {
  const templates = {
    header: `{{componentDeclarations}}\n{{eventHandlersDeclarations}}`,
    cpp: `void {{className}}UI::setupUI() {\n{{setupComponents}}\n\n    // --- USER CODE BEGIN: SetupUI ---\n{{setupUI}}\n    // --- USER CODE END: SetupUI ---\n}\n\n{{eventHandlersImplementations}}`,
    components: {},
  };

  it('emits AETHER UI markers around setup components', () => {
    const { cppCode } = generatePluginCode(
      [
        {
          id: 'knob-1',
          type: 'Knob',
          position: { x: 10, y: 20 },
          size: { width: 80, height: 80 },
        },
      ],
      'Demo',
      templates
    );

    expect(cppCode).toContain('// --- AETHER UI BEGIN ---');
    expect(cppCode).toContain('// --- AETHER UI END ---');
    expect(cppCode).toContain(
      '// AETHER id=knob-1 type=Knob x=10 y=20 w=80 h=80'
    );
    expect(cppCode).toContain('knob1.setBounds(10, 20, 80, 80)');
    expect(cppCode).toContain('knob1.onValueChanged = [this](float val) {');
  });

  it('round-trips designer components through plugin cpp', () => {
    const components: UISpecComponent[] = [
      {
        id: 'slider-9',
        type: 'Slider',
        position: { x: 1, y: 2 },
        size: { width: 3, height: 4 },
        params: { min: 0, max: 1, default: 0.5 },
        color: '#abc',
      },
    ];
    const { cppCode } = generatePluginCode(components, 'Demo', templates);
    expect(parseUIFromCpp(cppCode).components).toEqual(components);
  });

  it('preserves USER CODE SetupUI across regenerate', () => {
    const existingCpp = `void DemoUI::setupUI() {
    // --- AETHER UI BEGIN ---
    // --- AETHER UI END ---

    // --- USER CODE BEGIN: SetupUI ---
    doSomethingCustom();
    // --- USER CODE END: SetupUI ---
}`;
    const { cppCode } = generatePluginCode(
      [
        {
          id: 'btn1',
          type: 'Button',
          position: { x: 0, y: 0 },
          size: { width: 10, height: 10 },
        },
      ],
      'Demo',
      templates,
      '',
      existingCpp
    );
    expect(cppCode).toContain('doSomethingCustom();');
    expect(cppCode).toContain('// AETHER id=btn1 type=Button');
  });
});

describe('upsertAetherUiBlock', () => {
  it('replaces an existing AETHER block in place', () => {
    const source = `void setup() {
    // --- AETHER UI BEGIN ---
    // AETHER id=old type=Knob x=0 y=0 w=1 h=1
    // --- AETHER UI END ---

    // --- USER CODE BEGIN: SetupUI ---
    keepMe();
    // --- USER CODE END: SetupUI ---
}`;
    const next = upsertAetherUiBlock(
      source,
      `${AETHER_UI_BEGIN}\n// AETHER id=new type=Button x=5 y=5 w=10 h=10\n${AETHER_UI_END}\n`
    );
    expect(next).toContain('id=new type=Button');
    expect(next).not.toContain('id=old');
    expect(next).toContain('keepMe();');
  });
});
