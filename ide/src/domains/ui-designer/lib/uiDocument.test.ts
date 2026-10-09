import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { UISpecComponent } from '@/shared/types';
import { defaultProjectMeta } from '@/shared/lib/projectMeta';
import { CURRENT_AETHER_SCHEMA_VERSION } from '@/shared/schemas/migrateAetherProject';
import { validateAetherProject } from '@/shared/schemas/validateAetherProject';
import {
  parseAetherDocument,
  parseDesignerDocument,
  parseUiDocument,
  serializeAetherDocument,
  serializeDesignerDocument,
} from './uiDocument';

const sampleAetherPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../../../samples/GainPlugin/GainPlugin.aether'
);

describe('aether document round-trip', () => {
  it('parses the GainPlugin sample fixture', () => {
    const source = readFileSync(sampleAetherPath, 'utf-8');
    const doc = parseAetherDocument(source);
    expect(doc.components).toHaveLength(3);
    expect(doc.canvasWidth).toBe(600);
    expect(doc.canvasHeight).toBe(400);
    expect(doc.meta.plugin.id).toBe('dev.aether.samples.gain');
    expect(doc.meta.parameters.map((p) => p.id)).toEqual(['gain']);
    expect(doc.components[0]).toMatchObject({
      id: 'knob-1779727804935',
      type: 'Knob',
      position: { x: 40, y: 120 },
      size: { width: 140, height: 70 },
    });
  });

  it('save → reload keeps components, canvas and meta identical', () => {
    const components: UISpecComponent[] = [
      {
        id: 'knob1',
        type: 'Knob',
        position: { x: 12, y: 34 },
        size: { width: 80, height: 80 },
        params: { min: 0, max: 1, default: 0.25, step: 0.05 },
        color: '#112233',
      },
      {
        id: 'btn1',
        type: 'Button',
        position: { x: 0, y: 100 },
        size: { width: 120, height: 40 },
      },
    ];

    const meta = {
      plugin: {
        ...defaultProjectMeta('Demo').plugin,
        url: 'https://example.com',
      },
      parameters: [
        {
          id: 'gain',
          name: 'Gain',
          type: 'float' as const,
          min: -12,
          max: 12,
          default: 0,
          unit: 'dB',
        },
        { id: 'on', name: 'On', type: 'bool' as const, default: true },
      ],
    };
    const serialized = serializeAetherDocument(components, 640, 480, meta);
    expect(validateAetherProject(JSON.parse(serialized))).toEqual({
      valid: true,
    });

    const restored = parseAetherDocument(serialized);
    expect(restored.components).toEqual(components);
    expect(restored.canvasWidth).toBe(640);
    expect(restored.canvasHeight).toBe(480);
    expect(restored.meta).toEqual(meta);
  });

  it('refuses to save an invalid parameter', () => {
    const meta = defaultProjectMeta('Demo');
    meta.parameters.push({
      id: 'gain',
      name: 'Gain',
      type: 'float',
      min: 1,
      max: 0,
      default: 0,
    });
    expect(() => serializeAetherDocument([], 600, 400, meta)).toThrow(
      /Cannot save .aether file: \/parameters\/0\/max/
    );
  });

  it('rejects invalid .aether without corrupting caller responsibility', () => {
    expect(() => parseAetherDocument('{"components":[]}')).not.toThrow();
    expect(parseAetherDocument('{"components":[]}').components).toEqual([]);
    expect(() => parseAetherDocument('not-json')).toThrow(/not valid JSON/);
    expect(() =>
      parseAetherDocument(JSON.stringify({ version: 99, components: [] }))
    ).toThrow(/Unsupported/);
  });
});

describe('parseDesignerDocument dispatch', () => {
  it('names migrated v1 projects after the file', () => {
    const doc = parseDesignerDocument(
      JSON.stringify({ version: 1, components: [] }),
      'C:\\projects\\Reverb.aether'
    );
    expect(doc.meta.plugin.name).toBe('Reverb');
  });

  it('routes .aether through schema validation', () => {
    const source = readFileSync(sampleAetherPath, 'utf-8');
    const doc = parseDesignerDocument(source, 'GainPlugin.aether');
    expect(doc.components).toHaveLength(3);
  });

  it('still reads legacy .ui files', () => {
    const legacy = `{
      "canvasWidth": 500,
      "canvasHeight": 300,
      "components": [
        {
          "id": "knob1",
          "type": "Knob",
          "left": "10px",
          "top": "20px",
          "width": "80px",
          "height": "80px"
        }
      ]
    }`;
    const doc = parseDesignerDocument(legacy, 'legacy.ui');
    expect(doc.canvasWidth).toBe(500);
    expect(doc.components[0]?.position).toEqual({ x: 10, y: 20 });
  });

  it('serializeDesignerDocument writes aether schema for .aether paths', () => {
    const components: UISpecComponent[] = [
      {
        id: 's1',
        type: 'Slider',
        position: { x: 1, y: 2 },
        size: { width: 3, height: 4 },
      },
    ];
    const raw = serializeDesignerDocument(
      'Demo.aether',
      components,
      600,
      400,
      defaultProjectMeta('Demo')
    );
    const parsed = JSON.parse(raw);
    expect(parsed.version).toBe(CURRENT_AETHER_SCHEMA_VERSION);
    expect(parsed.components[0].x).toBe(1);
    expect(validateAetherProject(parsed)).toEqual({ valid: true });
  });
});

describe('parseUiDocument legacy', () => {
  it('parses px-string geometry', () => {
    const doc = parseUiDocument(
      JSON.stringify({
        components: [
          {
            id: 'k',
            type: 'Knob',
            left: '5px',
            top: '6px',
            width: '7px',
            height: '8px',
          },
        ],
      })
    );
    expect(doc.components[0]?.size).toEqual({ width: 7, height: 8 });
  });
});
