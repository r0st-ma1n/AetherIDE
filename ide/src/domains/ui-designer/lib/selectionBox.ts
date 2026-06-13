export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function findComponentsInBox(
  components: Array<{
    id: string;
    position: { x: number; y: number };
    size: { width: number; height: number };
  }>,
  box: Rect
): string[] {
  const boxRight = box.x + box.width;
  const boxBottom = box.y + box.height;

  return components
    .filter((c) => {
      const cRight = c.position.x + c.size.width;
      const cBottom = c.position.y + c.size.height;
      const overlapX =
        Math.min(boxRight, cRight) - Math.max(box.x, c.position.x);
      const overlapY =
        Math.min(boxBottom, cBottom) - Math.max(box.y, c.position.y);
      return overlapX >= 1 && overlapY >= 1;
    })
    .map((c) => c.id);
}
