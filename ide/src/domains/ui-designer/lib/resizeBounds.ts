import type { DesignerGridStep, UiComponent } from '@/shared/types';

export type ResizeDirection = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';

export interface SnapConfig {
  enabled: boolean;
  step: DesignerGridStep;
}

export const MIN_COMPONENT_WIDTH = 40;
export const MIN_COMPONENT_HEIGHT = 24;

export function getResizedBounds(
  initialBounds: Pick<UiComponent, 'position' | 'size'>,
  direction: ResizeDirection,
  dx: number,
  dy: number,
  snapConfig: SnapConfig
) {
  const nextBounds = {
    position: { ...initialBounds.position },
    size: { ...initialBounds.size },
  };

  if (direction.includes('e')) {
    nextBounds.size.width = Math.max(
      MIN_COMPONENT_WIDTH,
      Math.round(initialBounds.size.width + dx)
    );
  }

  if (direction.includes('s')) {
    nextBounds.size.height = Math.max(
      MIN_COMPONENT_HEIGHT,
      Math.round(initialBounds.size.height + dy)
    );
  }

  if (direction.includes('w')) {
    const width = Math.max(
      MIN_COMPONENT_WIDTH,
      Math.round(initialBounds.size.width - dx)
    );
    nextBounds.position.x =
      initialBounds.position.x + initialBounds.size.width - width;
    nextBounds.size.width = width;
  }

  if (direction.includes('n')) {
    const height = Math.max(
      MIN_COMPONENT_HEIGHT,
      Math.round(initialBounds.size.height - dy)
    );
    nextBounds.position.y =
      initialBounds.position.y + initialBounds.size.height - height;
    nextBounds.size.height = height;
  }

  if (snapConfig.enabled) {
    if (direction.includes('w')) {
      const snappedLeft = snapCoordinate(nextBounds.position.x, snapConfig);
      const preservedRight =
        initialBounds.position.x + initialBounds.size.width;
      nextBounds.position.x = snappedLeft;
      nextBounds.size.width = Math.max(
        MIN_COMPONENT_WIDTH,
        preservedRight - snappedLeft
      );
    } else {
      nextBounds.size.width = snapSize(nextBounds.size.width, snapConfig);
    }

    if (direction.includes('n')) {
      const snappedTop = snapCoordinate(nextBounds.position.y, snapConfig);
      const preservedBottom =
        initialBounds.position.y + initialBounds.size.height;
      nextBounds.position.y = snappedTop;
      nextBounds.size.height = Math.max(
        MIN_COMPONENT_HEIGHT,
        preservedBottom - snappedTop
      );
    } else {
      nextBounds.size.height = snapSize(nextBounds.size.height, snapConfig);
    }
  }

  return nextBounds;
}

export function normalizeBoundsToCanvas(
  bounds: Pick<UiComponent, 'position' | 'size'>,
  canvasWidth: number,
  canvasHeight: number
) {
  const maxWidth = Math.round(canvasWidth);
  const maxHeight = Math.round(canvasHeight);
  const left = Math.max(0, Math.round(bounds.position.x));
  const top = Math.max(0, Math.round(bounds.position.y));

  return {
    position: {
      x: left,
      y: top,
    },
    size: {
      width: Math.max(
        MIN_COMPONENT_WIDTH,
        Math.min(Math.round(bounds.size.width), maxWidth - left)
      ),
      height: Math.max(
        MIN_COMPONENT_HEIGHT,
        Math.min(Math.round(bounds.size.height), maxHeight - top)
      ),
    },
  };
}

export function snapPosition(
  position: UiComponent['position'],
  snapConfig: SnapConfig
) {
  return {
    x: snapCoordinate(position.x, snapConfig),
    y: snapCoordinate(position.y, snapConfig),
  };
}

export function snapCoordinate(value: number, snapConfig: SnapConfig) {
  if (!snapConfig.enabled) {
    return value;
  }

  return Math.max(0, Math.round(value / snapConfig.step) * snapConfig.step);
}

export function snapSize(value: number, snapConfig: SnapConfig) {
  if (!snapConfig.enabled) {
    return value;
  }

  return Math.max(
    snapConfig.step,
    Math.round(value / snapConfig.step) * snapConfig.step
  );
}
