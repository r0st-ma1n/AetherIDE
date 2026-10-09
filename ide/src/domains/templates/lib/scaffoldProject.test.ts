import { describe, expect, it } from 'vitest';
import {
  buildScaffoldFiles,
  DEFAULT_PARAMETER,
  GAIN_USER_CODE,
  isValidPluginName,
  validatePluginName,
} from './scaffoldProject';
import { AETHER_FRAMEWORK_VERSION } from '@/shared/lib/frameworkVersion';
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
      'DemoEffectProcessor.cpp',
      'DemoEffectProcessor.h',
      'README.md',
    ]);
    expect(files['DemoEffectProcessor.cpp']).toContain(
      'AETHER_PLUGIN(DemoEffectProcessor)'
    );
    expect(files['DemoEffectProcessor.cpp']).toContain('.name = "DemoEffect"');
    expect(files['CMakeLists.txt']).toContain('DemoEffectProcessor.cpp');
    expect(files['CMakeLists.txt']).toContain('MODULE');

    const aether = JSON.parse(files['DemoEffect.aether']!);
    expect(validateAetherProject(aether)).toEqual({ valid: true });
    expect(aether.plugin).toMatchObject({
      name: 'DemoEffect',
      id: 'com.mycompany.demoeffect',
      category: 'Effect',
    });
    expect(aether.parameters).toEqual([DEFAULT_PARAMETER]);
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
    expect(JSON.parse(files['DemoSynth.aether']!).plugin.category).toBe(
      'Instrument'
    );
  });

  it('uses the vendor for the plugin metadata and id', () => {
    const files = buildScaffoldFiles({
      className: 'Verb',
      pluginType: 'Effect',
      vendor: '  Acme Audio ',
      templates,
    });
    const aether = JSON.parse(files['Verb.aether']!);
    expect(aether.plugin).toMatchObject({
      vendor: 'Acme Audio',
      id: 'com.acmeaudio.verb',
    });
    expect(files['VerbProcessor.cpp']).toContain('.vendor = "Acme Audio"');
  });

  it('starts with a smoothed gain parameter that processBlock applies', () => {
    const files = buildScaffoldFiles({
      className: 'Verb',
      pluginType: 'Effect',
      templates,
    });
    const cpp = files['VerbProcessor.cpp']!;
    expect(cpp).toContain(
      'gainParameter_ = &parameters_.addFloat("gain", "Gain", 0.0f, 2.0f, 1.0f);'
    );
    const header = files['VerbProcessor.h']!;
    for (const body of Object.values(GAIN_USER_CODE)) {
      expect(header + cpp).toContain(body);
    }
  });

  it('pulls the framework with FetchContent pinned to the IDE version', () => {
    const cmake = buildScaffoldFiles({
      className: 'Verb',
      pluginType: 'Effect',
      templates,
    })['CMakeLists.txt']!;
    expect(cmake).toContain('FetchContent_Declare(aether');
    expect(cmake).toContain(`GIT_TAG v${AETHER_FRAMEWORK_VERSION}`);
    expect(cmake).toContain('SOURCE_SUBDIR framework');
    expect(cmake).toContain(
      `set(AETHER_MIN_VERSION ${AETHER_FRAMEWORK_VERSION})`
    );
    expect(cmake).not.toContain('../framework');
    expect(cmake).not.toMatch(/\{\{\s*\w+\s*\}\}/);
  });
});
