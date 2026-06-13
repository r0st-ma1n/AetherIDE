import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { useUiDesignerStore } from './uiDesignerStore';

describe('Undo/Redo — Command Pattern', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('5 actions → 5 undo (canvas empty) → 5 redo (matches final state)', () => {
    const store = useUiDesignerStore();

    store.addComponent('Knob');
    store.addComponent('Slider');
    store.addComponent('Button');
    store.addComponent('Knob');
    store.addComponent('Slider');

    const finalSnapshot = store.components.map((c) => ({
      id: c.id,
      type: c.type,
    }));

    store.undo();
    store.undo();
    store.undo();
    store.undo();
    store.undo();

    expect(store.components).toHaveLength(0);

    store.redo();
    store.redo();
    store.redo();
    store.redo();
    store.redo();

    expect(store.components.map((c) => ({ id: c.id, type: c.type }))).toEqual(
      finalSnapshot
    );
  });

  it('undo 3 + new action → redo does nothing', () => {
    const store = useUiDesignerStore();

    store.addComponent('Knob');
    store.addComponent('Slider');
    store.addComponent('Button');

    store.undo();
    store.undo();
    store.undo();

    store.addComponent('Knob');

    const stateAfterNew = store.components.map((c) => c.id);

    store.redo();

    expect(store.components.map((c) => c.id)).toEqual(stateAfterNew);
  });

  it('undo → redo → undo gives expected result', () => {
    const store = useUiDesignerStore();

    store.addComponent('Knob');
    store.addComponent('Slider');
    const afterTwo = store.components.map((c) => c.id);

    store.undo();
    expect(store.components).toHaveLength(1);

    store.redo();
    expect(store.components.map((c) => c.id)).toEqual(afterTwo);

    store.undo();
    expect(store.components).toHaveLength(1);
  });

  it('canUndo / canRedo reflect stack state', () => {
    const store = useUiDesignerStore();

    expect(store.canUndo).toBe(false);
    expect(store.canRedo).toBe(false);

    store.addComponent('Knob');

    expect(store.canUndo).toBe(true);
    expect(store.canRedo).toBe(false);

    store.undo();

    expect(store.canUndo).toBe(false);
    expect(store.canRedo).toBe(true);
  });

  it('undo on empty stack is a no-op', () => {
    const store = useUiDesignerStore();
    expect(() => store.undo()).not.toThrow();
    expect(store.components).toHaveLength(0);
  });

  it('redo on empty stack is a no-op', () => {
    const store = useUiDesignerStore();
    store.addComponent('Knob');
    expect(() => store.redo()).not.toThrow();
    expect(store.components).toHaveLength(1);
  });

  it('recordMoveCommand: undo restores old position, redo re-applies new position', () => {
    const store = useUiDesignerStore();
    store.addComponent('Knob');
    const id = store.components[0]!.id;

    const from = { x: 10, y: 20 };
    const to = { x: 100, y: 200 };

    store.moveComponent(id, to);
    store.recordMoveCommand(id, from, to);

    expect(store.components[0]!.position).toEqual(to);

    store.undo();
    expect(store.components[0]!.position).toEqual(from);

    store.redo();
    expect(store.components[0]!.position).toEqual(to);
  });

  it('recordResizeCommand: undo restores old bounds, redo re-applies new bounds', () => {
    const store = useUiDesignerStore();
    store.addComponent('Slider');
    const id = store.components[0]!.id;

    const from = { position: { x: 0, y: 0 }, size: { width: 100, height: 40 } };
    const to = { position: { x: 50, y: 60 }, size: { width: 200, height: 80 } };

    store.resizeComponent(id, to);
    store.recordResizeCommand(id, from, to);

    expect(store.components[0]!.position).toEqual(to.position);
    expect(store.components[0]!.size).toEqual(to.size);

    store.undo();
    expect(store.components[0]!.position).toEqual(from.position);
    expect(store.components[0]!.size).toEqual(from.size);

    store.redo();
    expect(store.components[0]!.position).toEqual(to.position);
    expect(store.components[0]!.size).toEqual(to.size);
  });

  it('updateComponentColor is undoable', () => {
    const store = useUiDesignerStore();
    store.addComponent('Button');
    const id = store.components[0]!.id;

    store.updateComponentColor(id, '#ff0000');
    expect(store.components[0]!.color).toBe('#ff0000');

    store.undo();
    expect(store.components[0]!.color).toBeUndefined();

    store.redo();
    expect(store.components[0]!.color).toBe('#ff0000');
  });
});
