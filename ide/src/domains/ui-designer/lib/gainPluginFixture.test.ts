import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { generateCppFromUI } from '@/domains/ui-designer/lib/codeGenerator';
import { parseUIFromCpp } from '@/domains/ui-designer/lib/codeParser';
import {
  parseAetherDocument,
  serializeAetherDocument,
} from '@/domains/ui-designer/lib/uiDocument';
import { CURRENT_AETHER_SCHEMA_VERSION } from '@/shared/schemas/migrateAetherProject';
import { validateAetherProject } from '@/shared/schemas/validateAetherProject';
import type { UISpecComponent } from '@/shared/types';

const samplesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../../samples/GainPlugin'
);

const sampleAetherPath = join(samplesDir, 'GainPlugin.aether');
const sampleCppPath = join(samplesDir, 'GainPlugin.cpp');

const EXPECTED_COMPONENTS: UISpecComponent[] = [
  {
    id: 'knob-1779727804935',
    type: 'Knob',
    position: { x: 40, y: 120 },
    size: { width: 140, height: 70 },
  },
  {
    id: 'slider-1779887593361',
    type: 'Slider',
    position: { x: 330, y: 60 },
    size: { width: 110, height: 80 },
  },
  {
    id: 'button-1779887600111',
    type: 'Button',
    position: { x: 230, y: 220 },
    size: { width: 130, height: 50 },
  },
];

describe('GainPlugin fixture regression', () => {
  it('.aether → parse → serialize → parse keeps the same UISpec', () => {
    const source = readFileSync(sampleAetherPath, 'utf-8');
    const doc = parseAetherDocument(source);
    expect(doc.components).toEqual(EXPECTED_COMPONENTS);
    expect(doc.canvasWidth).toBe(600);
    expect(doc.canvasHeight).toBe(400);

    const serialized = serializeAetherDocument(
      doc.components,
      doc.canvasWidth,
      doc.canvasHeight
    );
    expect(JSON.parse(serialized).version).toBe(CURRENT_AETHER_SCHEMA_VERSION);
    expect(validateAetherProject(JSON.parse(serialized))).toEqual({
      valid: true,
    });

    const restored = parseAetherDocument(serialized);
    expect(restored.components).toEqual(doc.components);
    expect(restored.canvasWidth).toBe(doc.canvasWidth);
    expect(restored.canvasHeight).toBe(doc.canvasHeight);
  });

  it('cpp markers → generateCppFromUI → parse equals', () => {
    const cpp = readFileSync(sampleCppPath, 'utf-8');
    const fromSample = parseUIFromCpp(cpp);
    expect(fromSample.components).toEqual(EXPECTED_COMPONENTS);

    const regenerated = generateCppFromUI(fromSample);
    expect(parseUIFromCpp(regenerated)).toEqual(fromSample);
    expect(regenerated).toContain('// --- AETHER UI BEGIN ---');
    expect(regenerated).toContain('id=knob-1779727804935');
  });

  it('.aether and cpp markers stay aligned', () => {
    const aether = parseAetherDocument(readFileSync(sampleAetherPath, 'utf-8'));
    const fromCpp = parseUIFromCpp(readFileSync(sampleCppPath, 'utf-8'));
    expect(fromCpp.components).toEqual(aether.components);
  });
});
