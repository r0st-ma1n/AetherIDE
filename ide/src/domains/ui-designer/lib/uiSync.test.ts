import { describe, expect, it } from 'vitest';
import {
  buildAetherDocumentFromCpp,
  buildLinkedPluginPaths,
  generateLinkedPluginSources,
  serializeAetherFromSpec,
} from './uiSync';
import { parseUIFromCpp } from './codeParser';
import { validateAetherProject } from '@/shared/schemas/validateAetherProject';

describe('buildLinkedPluginPaths', () => {
  it('maps designer or code path to sibling plugin files', () => {
    expect(
      buildLinkedPluginPaths(
        'GainPlugin.aether',
        (dir, name) => (dir ? `${dir}/${name}` : name),
        () => '',
        () => 'GainPlugin'
      )
    ).toEqual({
      className: 'GainPlugin',
      aetherPath: 'GainPlugin.aether',
      headerPath: 'GainPlugin.h',
      cppPath: 'GainPlugin.cpp',
    });
  });
});

describe('buildAetherDocumentFromCpp', () => {
  it('returns null when no AETHER markers exist', () => {
    expect(
      buildAetherDocumentFromCpp('int main() {}', {
        canvasWidth: 600,
        canvasHeight: 400,
      })
    ).toBeNull();
  });

  it('builds a document from AETHER markers and keeps canvas size', () => {
    const cpp = `void setup() {
    // --- AETHER UI BEGIN ---
    // AETHER id=knob1 type=Knob x=10 y=20 w=80 h=80
    knob1.setBounds(10, 20, 80, 80);
    // --- AETHER UI END ---
}`;
    expect(
      buildAetherDocumentFromCpp(cpp, { canvasWidth: 640, canvasHeight: 480 })
    ).toEqual({
      canvasWidth: 640,
      canvasHeight: 480,
      components: [
        {
          id: 'knob1',
          type: 'Knob',
          position: { x: 10, y: 20 },
          size: { width: 80, height: 80 },
        },
      ],
    });
  });
});

describe('generateLinkedPluginSources', () => {
  const templates = {
    header: '{{componentDeclarations}}\n{{eventHandlersDeclarations}}',
    cpp: `void {{className}}UI::setupUI() {
{{setupComponents}}

    // --- USER CODE BEGIN: SetupUI ---
{{setupUI}}
    // --- USER CODE END: SetupUI ---
}

{{eventHandlersImplementations}}`,
    components: {},
  };

  it('emits AETHER markers and preserves USER CODE', () => {
    const existingCpp = `void DemoUI::setupUI() {
    // --- AETHER UI BEGIN ---
    // --- AETHER UI END ---

    // --- USER CODE BEGIN: SetupUI ---
    keepUserLogic();
    // --- USER CODE END: SetupUI ---
}`;

    const { cppCode } = generateLinkedPluginSources({
      components: [
        {
          id: 'knob-1',
          type: 'Knob',
          position: { x: 5, y: 6 },
          size: { width: 7, height: 8 },
        },
      ],
      className: 'Demo',
      templates,
      existingHeader: '',
      existingCpp,
    });

    expect(cppCode).toContain('keepUserLogic();');
    expect(parseUIFromCpp(cppCode).components[0]?.id).toBe('knob-1');
  });
});

describe('serializeAetherFromSpec', () => {
  it('writes a schema-valid .aether document', () => {
    const raw = serializeAetherFromSpec(
      'Demo.aether',
      {
        components: [
          {
            id: 'btn1',
            type: 'Button',
            position: { x: 1, y: 2 },
            size: { width: 3, height: 4 },
          },
        ],
      },
      600,
      400
    );
    expect(validateAetherProject(JSON.parse(raw))).toEqual({ valid: true });
  });
});
