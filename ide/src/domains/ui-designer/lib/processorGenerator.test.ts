import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseAetherDocument } from '@/domains/ui-designer/lib/uiDocument';
import { defaultProjectMeta } from '@/shared/lib/projectMeta';
import type { AetherProjectMeta } from '@/shared/types';
import {
  cppFloat,
  cppString,
  generateProcessorCode,
  parameterMemberNames,
} from './processorGenerator';

const samplesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../../samples/GainPlugin'
);
const readSample = (name: string) =>
  readFileSync(join(samplesDir, name), 'utf-8');

/** Every parameter type and option, plus strings that need escaping. */
const HEAVY: AetherProjectMeta = {
  plugin: {
    name: 'Heavy "Q" FX',
    vendor: 'Back\\slash',
    id: 'com.test.heavy',
    version: '2.10.3',
    category: 'Effect',
    url: 'https://x.test',
    email: 'a@x.test',
  },
  parameters: [
    {
      id: 'gain',
      name: 'Gain',
      type: 'float',
      min: -60,
      max: 12,
      default: 0,
      step: 0.5,
      unit: 'dB',
    },
    { id: 'mix.a', name: 'Mix A', type: 'float', min: 0, max: 1, default: 1 },
    {
      id: 'mix_a',
      name: 'Mix A2',
      type: 'float',
      min: 0.001,
      max: 0.1,
      default: 0.01,
    },
    { id: 'on', name: 'On', type: 'bool', default: true },
    {
      id: 'mode',
      name: 'Mode',
      type: 'choice',
      choices: ['Soft', 'Hard "x"', 'Clip'],
      default: 2,
    },
  ],
};

/** Replaces the body of USER CODE region @p block in @p source. */
function setUserCode(source: string, block: string, body: string): string {
  const begin = `// --- USER CODE BEGIN: ${block} ---\n`;
  const start = source.indexOf(begin) + begin.length;
  const end = source.indexOf(`// --- USER CODE END: ${block} ---`);
  const endLine = source.lastIndexOf('\n', end) + 1;
  return `${source.slice(0, start)}${body}\n${source.slice(endLine)}`;
}

describe('generateProcessorCode — fixtures', () => {
  it('generates every parameter type and plugin field', async () => {
    const { headerCode, cppCode } = generateProcessorCode({
      className: 'Heavy',
      meta: HEAVY,
    });
    await expect(headerCode).toMatchFileSnapshot(
      './__fixtures__/HeavyProcessor.h.expected'
    );
    await expect(cppCode).toMatchFileSnapshot(
      './__fixtures__/HeavyProcessor.cpp.expected'
    );
  });

  it('generates a project without parameters', async () => {
    const { headerCode, cppCode } = generateProcessorCode({
      className: 'Empty',
      meta: defaultProjectMeta('Empty'),
    });
    await expect(headerCode).toMatchFileSnapshot(
      './__fixtures__/EmptyProcessor.h.expected'
    );
    await expect(cppCode).toMatchFileSnapshot(
      './__fixtures__/EmptyProcessor.cpp.expected'
    );
  });

  it('keeps samples/GainPlugin in sync with the generator', () => {
    const doc = parseAetherDocument(
      readSample('GainPlugin.aether'),
      'GainPlugin'
    );
    const existingHeader = readSample('GainPluginProcessor.h');
    const existingCpp = readSample('GainPluginProcessor.cpp');
    const { headerCode, cppCode } = generateProcessorCode({
      className: 'GainPlugin',
      meta: doc.meta,
      existingHeader,
      existingCpp,
    });
    expect(headerCode).toBe(existingHeader);
    expect(cppCode).toBe(existingCpp);
  });
});

describe('generateProcessorCode — round-trip', () => {
  const regions = {
    Includes: '#include <cmath>',
    PublicMethods: '    int answer() const { return 42; }',
    PrivateMembers: '    float level_ = 0.0f;',
    Constructor: '    level_ = 1.0f;',
    PrepareToPlay: '    level_ = static_cast<float>(setup.sampleRate);',
    ProcessBlock: '    context.output.clear();',
    ReleaseResources: '    level_ = 0.0f;',
    CustomMethods: 'static int helper() { return 1; }',
  };

  function withUserCode() {
    const first = generateProcessorCode({ className: 'Heavy', meta: HEAVY });
    let headerCode = first.headerCode;
    let cppCode = first.cppCode;
    for (const [block, body] of Object.entries(regions)) {
      if (headerCode.includes(`USER CODE BEGIN: ${block} `)) {
        headerCode = setUserCode(headerCode, block, body);
      } else {
        cppCode = setUserCode(cppCode, block, body);
      }
    }
    return { headerCode, cppCode };
  }

  it('keeps every USER CODE region when parameters change', () => {
    const edited = withUserCode();
    const meta: AetherProjectMeta = {
      plugin: { ...HEAVY.plugin, version: '3.0.0' },
      parameters: [
        ...HEAVY.parameters.slice(1),
        {
          id: 'drive',
          name: 'Drive',
          type: 'float',
          min: 0,
          max: 10,
          default: 1,
        },
      ],
    };
    const next = generateProcessorCode({
      className: 'Heavy',
      meta,
      existingHeader: edited.headerCode,
      existingCpp: edited.cppCode,
    });

    for (const body of Object.values(regions)) {
      expect(next.headerCode + next.cppCode).toContain(body);
    }
    expect(next.cppCode).toContain('.version = {3, 0, 0}');
    expect(next.cppCode).toContain(
      'driveParameter_ = &parameters_.addFloat("drive"'
    );
    expect(next.cppCode).not.toContain('gainParameter_');
    expect(next.headerCode).toContain('driveParameter_ = nullptr;');
  });

  it('is stable: regenerating unchanged input gives the same code', () => {
    const edited = withUserCode();
    const again = generateProcessorCode({
      className: 'Heavy',
      meta: HEAVY,
      existingHeader: edited.headerCode,
      existingCpp: edited.cppCode,
    });
    expect(again).toEqual(edited);
  });

  it('reads USER CODE from files saved with CRLF', () => {
    const edited = withUserCode();
    const next = generateProcessorCode({
      className: 'Heavy',
      meta: HEAVY,
      existingHeader: edited.headerCode.replace(/\n/g, '\r\n'),
      existingCpp: edited.cppCode.replace(/\n/g, '\r\n'),
    });
    expect(next).toEqual(edited);
  });
});

describe('generateProcessorCode — category', () => {
  it('fails the C++ build for instruments, which v1 does not support', () => {
    const { cppCode } = generateProcessorCode({
      className: 'Synth',
      meta: defaultProjectMeta('Synth', 'Instrument'),
    });
    expect(cppCode).toContain(
      '#error "Instrument plugins are not supported yet'
    );
  });

  it('builds effects without the check', () => {
    const { cppCode } = generateProcessorCode({
      className: 'Fx',
      meta: defaultProjectMeta('Fx'),
    });
    expect(cppCode).not.toContain('#error');
  });
});

describe('C++ literals and names', () => {
  it.each([
    [1, '1.0f'],
    [-60, '-60.0f'],
    [0.25, '0.25f'],
    [1e-7, '1e-7f'],
    [1e21, '1e+21f'],
  ])('cppFloat(%d) = %s', (value, expected) => {
    expect(cppFloat(value)).toBe(expected);
  });

  it('escapes quotes, backslashes and newlines in strings', () => {
    expect(cppString('a "b" \\ c\nd')).toBe('"a \\"b\\" \\\\ c\\nd"');
  });

  it('derives unique member names from parameter ids', () => {
    const names = parameterMemberNames(HEAVY.parameters);
    expect([...names.values()]).toEqual([
      'gainParameter_',
      'mix_aParameter_',
      'mix_a2Parameter_',
      'onParameter_',
      'modeParameter_',
    ]);
  });
});
