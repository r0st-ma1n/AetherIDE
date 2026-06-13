import { describe, expect, it } from 'vitest';
import { findComponentsInBox } from './selectionBox';

const COMP = {
  id: 'a',
  position: { x: 50, y: 50 },
  size: { width: 100, height: 100 },
};

describe('findComponentsInBox — AC: intersect by at least 1px', () => {
  it('selects a component with 1px horizontal and vertical overlap', () => {
    // box right edge at 51 → 1px overlap with component starting at 50
    expect(
      findComponentsInBox([COMP], { x: 0, y: 0, width: 51, height: 51 })
    ).toContain('a');
  });

  it('does not select a component that only touches (0px overlap)', () => {
    // box right edge exactly at component left edge → 0px overlap
    expect(
      findComponentsInBox([COMP], { x: 0, y: 0, width: 50, height: 100 })
    ).not.toContain('a');
  });

  it('does not select a component with only 1-axis overlap', () => {
    // overlaps on X but not on Y
    expect(
      findComponentsInBox([COMP], { x: 0, y: 0, width: 100, height: 50 })
    ).not.toContain('a');
  });

  it('selects fully enclosed component', () => {
    expect(
      findComponentsInBox([COMP], { x: 0, y: 0, width: 200, height: 200 })
    ).toContain('a');
  });

  it('selects component that fully encloses the box', () => {
    expect(
      findComponentsInBox([COMP], { x: 60, y: 60, width: 10, height: 10 })
    ).toContain('a');
  });

  it('returns only the intersecting components', () => {
    const components = [
      COMP,
      {
        id: 'b',
        position: { x: 300, y: 300 },
        size: { width: 50, height: 50 },
      },
    ];
    const result = findComponentsInBox(components, {
      x: 0,
      y: 0,
      width: 101,
      height: 101,
    });
    expect(result).toContain('a');
    expect(result).not.toContain('b');
  });

  it('returns empty array when no components intersect', () => {
    expect(
      findComponentsInBox([COMP], { x: 200, y: 200, width: 50, height: 50 })
    ).toHaveLength(0);
  });

  it('returns all ids when box covers all components', () => {
    const many = [
      { id: '1', position: { x: 0, y: 0 }, size: { width: 10, height: 10 } },
      {
        id: '2',
        position: { x: 100, y: 100 },
        size: { width: 10, height: 10 },
      },
      {
        id: '3',
        position: { x: 200, y: 200 },
        size: { width: 10, height: 10 },
      },
    ];
    const result = findComponentsInBox(many, {
      x: 0,
      y: 0,
      width: 211,
      height: 211,
    });
    expect(result).toEqual(['1', '2', '3']);
  });
});
