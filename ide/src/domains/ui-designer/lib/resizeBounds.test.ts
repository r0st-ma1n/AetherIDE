import { describe, expect, it } from 'vitest';
import {
  clampPositionToCanvas,
  getResizedBounds,
  MIN_COMPONENT_HEIGHT,
  MIN_COMPONENT_WIDTH,
  normalizeBoundsToCanvas,
  snapCoordinate,
  snapPosition,
} from './resizeBounds';

const initialBounds = {
  position: { x: 100, y: 80 },
  size: { width: 120, height: 60 },
};

const snapOff = {
  enabled: false as const,
  step: 10 as const,
};

const snapOn10 = {
  enabled: true as const,
  step: 10 as const,
};

describe('getResizedBounds', () => {
  it('resizes from the south-east handle without snap', () => {
    const result = getResizedBounds(initialBounds, 'se', 30, 20, snapOff);

    expect(result).toEqual({
      position: { x: 100, y: 80 },
      size: { width: 150, height: 80 },
    });
  });

  it('keeps the opposite edge anchored when resizing from the west', () => {
    const result = getResizedBounds(initialBounds, 'w', 40, 0, snapOff);

    expect(result).toEqual({
      position: { x: 140, y: 80 },
      size: { width: 80, height: 60 },
    });
  });

  it('does not shrink below the configured minimum size', () => {
    const result = getResizedBounds(initialBounds, 'nw', 500, 500, snapOff);

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

  it('snaps resize dimensions to the configured grid when enabled', () => {
    const result = getResizedBounds(initialBounds, 'se', 33, 14, snapOn10);

    expect(result).toEqual({
      position: { x: 100, y: 80 },
      size: { width: 150, height: 70 },
    });
  });

  it('keeps resize free-form when snap is disabled', () => {
    const result = getResizedBounds(initialBounds, 'se', 33, 14, snapOff);

    expect(result).toEqual({
      position: { x: 100, y: 80 },
      size: { width: 153, height: 74 },
    });
  });

  it('preserves aspect ratio while shift-resizing without snap', () => {
    const result = getResizedBounds(initialBounds, 'se', 60, 5, snapOff, true);

    expect(result).toEqual({
      position: { x: 100, y: 80 },
      size: { width: 180, height: 90 },
    });
  });

  it('preserves aspect ratio while shift-resizing with snap enabled', () => {
    const result = getResizedBounds(initialBounds, 'se', 43, 7, snapOn10, true);

    expect(result.size.width % 10).toBe(0);
    expect(result.size.height % 10).toBe(0);
    expect(result.size.width / result.size.height).toBe(
      initialBounds.size.width / initialBounds.size.height
    );
    expect(result).toEqual({
      position: { x: 100, y: 80 },
      size: { width: 160, height: 80 },
    });
  });
});

describe('normalizeBoundsToCanvas', () => {
  it('keeps overflowing bounds inside the canvas by shifting position when possible', () => {
    const result = normalizeBoundsToCanvas(
      {
        position: { x: 560, y: 360 },
        size: { width: 100, height: 70 },
      },
      600,
      400
    );

    expect(result).toEqual({
      position: { x: 500, y: 330 },
      size: { width: 100, height: 70 },
    });
  });

  it('clamps bounds position to keep the component inside right and bottom edges', () => {
    const result = normalizeBoundsToCanvas(
      {
        position: { x: 590, y: 395 },
        size: { width: 100, height: 70 },
      },
      600,
      400
    );

    expect(result).toEqual({
      position: { x: 500, y: 330 },
      size: { width: 100, height: 70 },
    });
  });
});

describe('snap helpers', () => {
  it('snaps positions to the grid when enabled', () => {
    expect(snapPosition({ x: 27, y: 34 }, snapOn10)).toEqual({
      x: 30,
      y: 30,
    });
  });

  it('returns original coordinates when snap is disabled', () => {
    expect(snapCoordinate(27, snapOff)).toBe(27);
  });
});

describe('clampPositionToCanvas', () => {
  it('keeps dragged components inside the canvas bounds', () => {
    expect(
      clampPositionToCanvas(
        { x: 580, y: 390 },
        { width: 100, height: 40 },
        600,
        400
      )
    ).toEqual({
      x: 500,
      y: 360,
    });
  });
});
