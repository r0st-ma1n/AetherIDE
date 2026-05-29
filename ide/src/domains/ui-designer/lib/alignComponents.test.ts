import { describe, expect, it } from 'vitest';
import { alignComponents, distributeComponents } from './alignComponents';

// 10 components spread across the canvas for AC coverage
const TEN = [
  { id: 'a', position: { x: 10, y: 50 }, size: { width: 60, height: 30 } },
  { id: 'b', position: { x: 80, y: 20 }, size: { width: 40, height: 50 } },
  { id: 'c', position: { x: 200, y: 90 }, size: { width: 80, height: 20 } },
  { id: 'd', position: { x: 50, y: 130 }, size: { width: 50, height: 40 } },
  { id: 'e', position: { x: 300, y: 60 }, size: { width: 70, height: 35 } },
  { id: 'f', position: { x: 150, y: 10 }, size: { width: 30, height: 60 } },
  { id: 'g', position: { x: 400, y: 80 }, size: { width: 55, height: 25 } },
  { id: 'h', position: { x: 30, y: 200 }, size: { width: 90, height: 45 } },
  { id: 'i', position: { x: 250, y: 150 }, size: { width: 65, height: 30 } },
  { id: 'j', position: { x: 100, y: 110 }, size: { width: 45, height: 55 } },
];

// Bounding box of TEN: x: 10..455, y: 10..245
const MIN_X = 10; // a.x
const MAX_X = 455; // g.x + g.width
const MIN_Y = 10; // f.y
const MAX_Y = 245; // h.y + h.height

describe('alignComponents — 6 variants with 10 elements (AC)', () => {
  it('left: all left edges equal minX', () => {
    const result = alignComponents(TEN, 'left');
    for (const comp of TEN) {
      expect(result.get(comp.id)?.x).toBe(MIN_X);
    }
  });

  it('right: all right edges equal maxX', () => {
    const result = alignComponents(TEN, 'right');
    for (const comp of TEN) {
      expect(result.get(comp.id)!.x + comp.size.width).toBe(MAX_X);
    }
  });

  it('center: all horizontal centers equal group center', () => {
    const groupCenterX = Math.round((MIN_X + MAX_X) / 2);
    const result = alignComponents(TEN, 'center');
    for (const comp of TEN) {
      const cx = result.get(comp.id)!.x + Math.round(comp.size.width / 2);
      expect(Math.abs(cx - groupCenterX)).toBeLessThanOrEqual(1);
    }
  });

  it('top: all top edges equal minY', () => {
    const result = alignComponents(TEN, 'top');
    for (const comp of TEN) {
      expect(result.get(comp.id)?.y).toBe(MIN_Y);
    }
  });

  it('bottom: all bottom edges equal maxY', () => {
    const result = alignComponents(TEN, 'bottom');
    for (const comp of TEN) {
      expect(result.get(comp.id)!.y + comp.size.height).toBe(MAX_Y);
    }
  });

  it('middle: all vertical centers equal group center', () => {
    const groupCenterY = Math.round((MIN_Y + MAX_Y) / 2);
    const result = alignComponents(TEN, 'middle');
    for (const comp of TEN) {
      const cy = result.get(comp.id)!.y + Math.round(comp.size.height / 2);
      expect(Math.abs(cy - groupCenterY)).toBeLessThanOrEqual(1);
    }
  });

  it('axis-not-aligned variants do not change the perpendicular coordinate', () => {
    const leftResult = alignComponents(TEN, 'left');
    for (const comp of TEN) {
      expect(leftResult.get(comp.id)?.y).toBe(comp.position.y);
    }

    const topResult = alignComponents(TEN, 'top');
    for (const comp of TEN) {
      expect(topResult.get(comp.id)?.x).toBe(comp.position.x);
    }
  });
});

describe('alignComponents — edge cases', () => {
  it('returns empty map for fewer than 2 components', () => {
    expect(alignComponents([], 'left').size).toBe(0);
    expect(alignComponents([TEN[0]!], 'left').size).toBe(0);
  });

  it('two components align correctly', () => {
    const two = [
      { id: 'p', position: { x: 0, y: 0 }, size: { width: 100, height: 40 } },
      { id: 'q', position: { x: 200, y: 80 }, size: { width: 60, height: 20 } },
    ];
    const result = alignComponents(two, 'right');
    expect(result.get('p')!.x).toBe(160); // 260 - 100
    expect(result.get('q')!.x).toBe(200); // already at right edge 260
  });
});

describe('distributeComponents', () => {
  const ROW = [
    { id: '1', position: { x: 0, y: 50 }, size: { width: 20, height: 20 } },
    { id: '2', position: { x: 100, y: 50 }, size: { width: 20, height: 20 } },
    { id: '3', position: { x: 200, y: 50 }, size: { width: 20, height: 20 } },
    { id: '4', position: { x: 300, y: 50 }, size: { width: 20, height: 20 } },
    { id: '5', position: { x: 400, y: 50 }, size: { width: 20, height: 20 } },
  ];

  it('distribute x: equal gaps between components', () => {
    const shuffled = [ROW[2]!, ROW[0]!, ROW[4]!, ROW[1]!, ROW[3]!];
    const result = distributeComponents(shuffled, 'x');

    const positions = ['1', '2', '3', '4', '5'].map((id) => result.get(id)!.x);
    const gaps = positions.slice(1).map((x, i) => x - positions[i]! - 20);
    const first = gaps[0]!;
    for (const gap of gaps) {
      expect(Math.abs(gap - first)).toBeLessThanOrEqual(1);
    }
  });

  it('distribute y: equal gaps between components', () => {
    const col = ROW.map((c) => ({
      ...c,
      position: { x: 50, y: c.position.x },
    }));
    const result = distributeComponents(col, 'y');

    const positions = ['1', '2', '3', '4', '5'].map((id) => result.get(id)!.y);
    const gaps = positions.slice(1).map((y, i) => y - positions[i]! - 20);
    const first = gaps[0]!;
    for (const gap of gaps) {
      expect(Math.abs(gap - first)).toBeLessThanOrEqual(1);
    }
  });

  it('preserves the perpendicular coordinate', () => {
    const result = distributeComponents(ROW, 'x');
    for (const comp of ROW) {
      expect(result.get(comp.id)!.y).toBe(50);
    }
  });

  it('returns empty map for fewer than 3 components', () => {
    expect(distributeComponents([], 'x').size).toBe(0);
    expect(distributeComponents([ROW[0]!, ROW[1]!], 'x').size).toBe(0);
  });

  it('outermost components stay in place', () => {
    const result = distributeComponents(ROW, 'x');
    expect(result.get('1')!.x).toBe(0);
    expect(result.get('5')!.x).toBe(400);
  });
});
