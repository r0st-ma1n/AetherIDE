import type { UiComponent } from '@/shared/types';

export type ResizeDirection = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';

export const MIN_COMPONENT_WIDTH = 40;
export const MIN_COMPONENT_HEIGHT = 24;

export function getResizedBounds(
  initialBounds: Pick<UiComponent, 'position' | 'size'>,
  direction: ResizeDirection,
  dx: number,
  dy: number,
  preserveAspectRatio: boolean
) {
  if (preserveAspectRatio) {
    return getAspectRatioBounds(initialBounds, direction, dx, dy);
  }

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

  return nextBounds;
}

export function normalizeBoundsToCanvas(
  bounds: Pick<UiComponent, 'position' | 'size'>,
  canvasWidth: number,
  canvasHeight: number
) {
  const maxWidth = Math.max(MIN_COMPONENT_WIDTH, Math.round(canvasWidth));
  const maxHeight = Math.max(MIN_COMPONENT_HEIGHT, Math.round(canvasHeight));

  let left = Math.round(bounds.position.x);
  let top = Math.round(bounds.position.y);
  let right = Math.round(bounds.position.x + bounds.size.width);
  let bottom = Math.round(bounds.position.y + bounds.size.height);

  if (left < 0) {
    left = 0;
  }

  if (top < 0) {
    top = 0;
  }

  if (right > maxWidth) {
    right = maxWidth;
  }

  if (bottom > maxHeight) {
    bottom = maxHeight;
  }

  if (right - left < MIN_COMPONENT_WIDTH) {
    if (bounds.position.x < 0) {
      right = Math.min(maxWidth, MIN_COMPONENT_WIDTH);
      left = 0;
    } else {
      left = Math.max(0, right - MIN_COMPONENT_WIDTH);
      right = left + MIN_COMPONENT_WIDTH;
    }
  }

  if (bottom - top < MIN_COMPONENT_HEIGHT) {
    if (bounds.position.y < 0) {
      bottom = Math.min(maxHeight, MIN_COMPONENT_HEIGHT);
      top = 0;
    } else {
      top = Math.max(0, bottom - MIN_COMPONENT_HEIGHT);
      bottom = top + MIN_COMPONENT_HEIGHT;
    }
  }

  return {
    position: {
      x: left,
      y: top,
    },
    size: {
      width: Math.min(maxWidth, right - left),
      height: Math.min(maxHeight, bottom - top),
    },
  };
}

function getAspectRatioBounds(
  initialBounds: Pick<UiComponent, 'position' | 'size'>,
  direction: ResizeDirection,
  dx: number,
  dy: number
) {
  const initialWidth = initialBounds.size.width;
  const initialHeight = initialBounds.size.height;
  const aspectRatio = initialWidth / initialHeight;
  const minScale = Math.max(
    MIN_COMPONENT_WIDTH / initialWidth,
    MIN_COMPONENT_HEIGHT / initialHeight
  );

  let scale = 1;

  if (direction === 'e' || direction === 'w') {
    const signedWidthDelta = direction === 'e' ? dx : -dx;
    scale = (initialWidth + signedWidthDelta) / initialWidth;
  } else if (direction === 'n' || direction === 's') {
    const signedHeightDelta = direction === 's' ? dy : -dy;
    scale = (initialHeight + signedHeightDelta) / initialHeight;
  } else {
    const signedWidthDelta = direction.includes('e') ? dx : -dx;
    const signedHeightDelta = direction.includes('s') ? dy : -dy;
    const widthScale = (initialWidth + signedWidthDelta) / initialWidth;
    const heightScale = (initialHeight + signedHeightDelta) / initialHeight;

    scale =
      Math.abs(widthScale - 1) >= Math.abs(heightScale - 1)
        ? widthScale
        : heightScale;
  }

  const normalizedScale = Math.max(minScale, scale);
  const width = Math.max(
    MIN_COMPONENT_WIDTH,
    Math.round(initialWidth * normalizedScale)
  );
  const height = Math.max(
    MIN_COMPONENT_HEIGHT,
    Math.round(width / aspectRatio)
  );

  return buildBoundsFromAnchor(initialBounds, direction, {
    width,
    height: Math.max(MIN_COMPONENT_HEIGHT, height),
  });
}

function buildBoundsFromAnchor(
  initialBounds: Pick<UiComponent, 'position' | 'size'>,
  direction: ResizeDirection,
  size: UiComponent['size']
) {
  const left = initialBounds.position.x;
  const top = initialBounds.position.y;
  const right = left + initialBounds.size.width;
  const bottom = top + initialBounds.size.height;
  const centerX = left + initialBounds.size.width / 2;
  const centerY = top + initialBounds.size.height / 2;

  let nextX = left;
  let nextY = top;

  if (direction.includes('w')) {
    nextX = Math.round(right - size.width);
  } else if (!direction.includes('e')) {
    nextX = Math.round(centerX - size.width / 2);
  }

  if (direction.includes('n')) {
    nextY = Math.round(bottom - size.height);
  } else if (!direction.includes('s')) {
    nextY = Math.round(centerY - size.height / 2);
  }

  return {
    position: {
      x: nextX,
      y: nextY,
    },
    size,
  };
}
