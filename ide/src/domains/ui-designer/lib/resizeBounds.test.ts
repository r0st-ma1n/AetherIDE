import { describe, expect, it } from 'vitest';
import {
  getResizedBounds,
  MIN_COMPONENT_HEIGHT,
  MIN_COMPONENT_WIDTH,
  normalizeBoundsToCanvas,
} from './resizeBounds';

const initialBounds = {
  position: { x: 100, y: 80 },
  size: { width: 120, height: 60 },
};

describe('getResizedBounds', () => {
  it('resizes from the south-east handle', () => {
    const result = getResizedBounds(initialBounds, 'se', 30, 20, false);

    expect(result).toEqual({
      position: { x: 100, y: 80 },
      size: { width: 150, height: 80 },
    });
  });

  it('keeps the opposite edge anchored when resizing from the west', () => {
    const result = getResizedBounds(initialBounds, 'w', 40, 0, false);

    expect(result).toEqual({
      position: { x: 140, y: 80 },
      size: { width: 80, height: 60 },
    });
  });

  it('preserves the original aspect ratio while shift-resizing', () => {
    const result = getResizedBounds(initialBounds, 'se', 60, 5, true);

    expect(result.size.width / result.size.height).toBe(
      initialBounds.size.width / initialBounds.size.height
    );
    expect(result).toEqual({
      position: { x: 100, y: 80 },
      size: { width: 180, height: 90 },
    });
  });

  it('does not shrink below the configured minimum size', () => {
    const result = getResizedBounds(initialBounds, 'nw', 500, 500, false);

    expect(result).toEqual({
      position: {
        x: 100 + 120 - MIN_COMPONENT_WIDTH,
        y: 80 + 60 - MIN_COMPONENT_HEIGHT,
      },
      size: {
        width: MIN_COMPONENT_WIDTH,
        height: MIN_COMPONENT_HEIGHT,
      },
    });
  });
});

describe('normalizeBoundsToCanvas', () => {
  it('shrinks overflowing bounds to the remaining space inside the canvas', () => {
    const result = normalizeBoundsToCanvas(
      {
        position: { x: 560, y: 360 },
        size: { width: 100, height: 70 },
      },
      600,
      400
    );

    expect(result).toEqual({
      position: { x: 560, y: 360 },
      size: { width: 40, height: 40 },
    });
  });

  it('rebuilds a valid min-size box when the resize crosses outside the top-left edge', () => {
    const result = normalizeBoundsToCanvas(
      {
        position: { x: -20, y: -12 },
        size: { width: 50, height: 30 },
      },
      600,
      400
    );

    expect(result).toEqual({
      position: { x: 0, y: 0 },
      size: { width: MIN_COMPONENT_WIDTH, height: MIN_COMPONENT_HEIGHT },
    });
  });
});
