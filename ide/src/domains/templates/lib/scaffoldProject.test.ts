import { describe, expect, it } from 'vitest';
import {
  buildScaffoldFiles,
  isValidPluginName,
  validatePluginName,
} from './scaffoldProject';
import type { TemplateData } from '@/domains/templates/stores/templateStore';
import { parseUIFromCpp } from '@/domains/ui-designer/lib/codeParser';
import { validateAetherProject } from '@/shared/schemas/validateAetherProject';

const templates: TemplateData = {
  header: `{{componentDeclarations}}\n{{eventHandlersDeclarations}}`,
  cpp: `void {{className}}UI::setupUI() {
{{setupComponents}}

    // --- USER CODE BEGIN: SetupUI ---
{{setupUI}}
    // --- USER CODE END: SetupUI ---
}

{{eventHandlersImplementations}}`,
  components: {},
};

describe('validatePluginName', () => {
  it('accepts C++ identifiers', () => {
    expect(isValidPluginName('MyPlugin')).toBe(true);
    expect(validatePluginName('GainFX')).toBeNull();
  });

  it('rejects invalid names', () => {
    expect(validatePluginName('')).not.toBeNull();
    expect(validatePluginName('1Plugin')).not.toBeNull();
    expect(validatePluginName('My Plugin')).not.toBeNull();
  });
});

describe('buildScaffoldFiles', () => {
  it('creates aether/h/cpp/cmake/readme for an Effect', () => {
    const files = buildScaffoldFiles({
      className: 'DemoEffect',
      pluginType: 'Effect',
      templates,
    });

    expect(Object.keys(files).sort()).toEqual([
      'CMakeLists.txt',
      'DemoEffect.aether',
      'DemoEffect.cpp',
      'DemoEffect.h',
      'README.md',
    ]);

    const aether = JSON.parse(files['DemoEffect.aether']!);
    expect(validateAetherProject(aether)).toEqual({ valid: true });
    expect(aether.pluginType).toBe('Effect');
    expect(aether.components).toEqual([]);

    expect(files['CMakeLists.txt']).toContain('project(DemoEffect');
    expect(files['DemoEffect.cpp']).toContain('wire audio processing');
    expect(parseUIFromCpp(files['DemoEffect.cpp']!).components).toEqual([]);
  });

  it('seeds Instrument-specific TODO in USER CODE', () => {
    const files = buildScaffoldFiles({
      className: 'DemoSynth',
      pluginType: 'Instrument',
      templates,
    });

    expect(files['DemoSynth.cpp']).toContain('handle MIDI');
    expect(JSON.parse(files['DemoSynth.aether']!).pluginType).toBe(
      'Instrument'
    );
  });
});
