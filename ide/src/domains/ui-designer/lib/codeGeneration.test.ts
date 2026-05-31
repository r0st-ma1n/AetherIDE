import { describe, it, expect } from 'vitest';
import { generateCppFromUI } from './codeGenerator';
import { parseUIFromCpp } from './codeParser';
import type { UISpec } from '@/shared/types';

// ─── helpers ────────────────────────────────────────────────────────────────

function makeSpec(): UISpec {
  const components: UISpec['components'] = [];

  for (let i = 0; i < 10; i++) {
    components.push({
      id: `knob${i}`,
      type: 'Knob',
      position: { x: i * 90, y: 10 },
      size: { width: 80, height: 80 },
      params: { min: 0, max: 1, default: 0.5 },
      color: `#${String(i).padStart(6, '0')}`,
    });
  }

  for (let i = 0; i < 3; i++) {
    components.push({
      id: `slider${i}`,
      type: 'Slider',
      position: { x: i * 120, y: 120 },
      size: { width: 100, height: 40 },
      params: { min: -1, max: 1, default: 0 },
    });
  }

  for (let i = 0; i < 2; i++) {
    components.push({
      id: `button${i}`,
      type: 'Button',
      position: { x: i * 110, y: 200 },
      size: { width: 100, height: 30 },
    });
  }

  return { components };
}

// ─── round-trip ─────────────────────────────────────────────────────────────

describe('round-trip: generateCppFromUI → parseUIFromCpp', () => {
  it('restores 10 knobs + 3 sliders + 2 buttons with deep equality', () => {
    const original = makeSpec();
    const cpp = generateCppFromUI(original);
    const restored = parseUIFromCpp(cpp);
    expect(restored).toEqual(original);
  });

  it('preserves every field individually', () => {
    const original = makeSpec();
    const restored = parseUIFromCpp(generateCppFromUI(original));

    for (let i = 0; i < original.components.length; i++) {
      const o = original.components[i]!;
      const r = restored.components[i]!;
      expect(r.id, `id mismatch at index ${i}`).toBe(o.id);
      expect(r.type, `type mismatch at index ${i}`).toBe(o.type);
      expect(r.position, `position mismatch at index ${i}`).toEqual(o.position);
      expect(r.size, `size mismatch at index ${i}`).toEqual(o.size);
      expect(r.params, `params mismatch at index ${i}`).toEqual(o.params);
      expect(r.color, `color mismatch at index ${i}`).toBe(o.color);
    }
  });

  it('preserves component count', () => {
    const original = makeSpec();
    const restored = parseUIFromCpp(generateCppFromUI(original));
    expect(restored.components).toHaveLength(original.components.length);
  });
});

// ─── edge cases ─────────────────────────────────────────────────────────────

describe('parseUIFromCpp edge cases', () => {
  it('returns empty spec on empty string', () => {
    expect(parseUIFromCpp('')).toEqual({ components: [] });
  });

  it('returns empty spec on file without AETHER markers', () => {
    const src = `
#include "GainPlugin.h"

void GainPlugin::prepareToPlay(double, int) {}
void GainPlugin::releaseResources() {}
void GainPlugin::processBlock(aether::ProcessContext& ctx) {}
    `;
    expect(parseUIFromCpp(src)).toEqual({ components: [] });
  });

  it('parses only valid markers when file has partial/broken tags', () => {
    const src = `
// AETHER id=knob0 type=Knob x=10 y=20 w=80 h=80
knob0.setBounds(10, 20, 80, 80);
// AETHER type=Knob x=0 y=0 w=50 h=50
// missing id — should be skipped
// AETHER id=btn0 type=InvalidType x=0 y=0 w=100 h=30
// invalid type — should be skipped
// AETHER id=slider0 type=Slider x=5 y=5 w=100 h=40 min=0 max=1 default=0.5
slider0.setBounds(5, 5, 100, 40);
    `;
    const result = parseUIFromCpp(src);
    expect(result.components).toHaveLength(2);
    expect(result.components[0]!.id).toBe('knob0');
    expect(result.components[1]!.id).toBe('slider0');
  });

  it('handles component without optional params and color', () => {
    const spec: UISpec = {
      components: [
        {
          id: 'btn',
          type: 'Button',
          position: { x: 0, y: 0 },
          size: { width: 100, height: 30 },
        },
      ],
    };
    const restored = parseUIFromCpp(generateCppFromUI(spec));
    expect(restored.components[0]!.params).toBeUndefined();
    expect(restored.components[0]!.color).toBeUndefined();
  });
});
