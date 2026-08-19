import { describe, expect, it } from 'vitest';
import {
  fromAetherProject,
  normalizeUiComponentParams,
  toAetherProject,
  toUISpec,
} from './uiModel';
import type { UISpecComponent } from '@/shared/types';

describe('normalizeUiComponentParams', () => {
  it('returns undefined when required fields are missing', () => {
    expect(normalizeUiComponentParams({ min: 0, max: 1 })).toBeUndefined();
  });

  it('keeps optional step when complete', () => {
    expect(
      normalizeUiComponentParams({
        min: 0,
        max: 1,
        default: 0.5,
        step: 0.1,
      })
    ).toEqual({ min: 0, max: 1, default: 0.5, step: 0.1 });
  });
});

describe('toUISpec', () => {
  it('wraps components in a UISpec', () => {
    const components: UISpecComponent[] = [
      {
        id: 'btn1',
        type: 'Button',
        position: { x: 0, y: 0 },
        size: { width: 10, height: 10 },
      },
    ];
    expect(toUISpec(components)).toEqual({ components });
  });
});

describe('aether adapters', () => {
  it('preserves step through toAetherProject → fromAetherProject', () => {
    const components: UISpecComponent[] = [
      {
        id: 'knob1',
        type: 'Knob',
        position: { x: 1, y: 2 },
        size: { width: 3, height: 4 },
        params: { min: 0, max: 10, default: 5, step: 1 },
      },
    ];
    expect(fromAetherProject(toAetherProject(components)).components).toEqual(
      components
    );
  });
});
