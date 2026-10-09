import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, type Mock } from 'vitest';
import { defaultProjectMeta } from '@/shared/lib/projectMeta';
import { useUiDesignerStore } from './uiDesignerStore';

type Store = ReturnType<typeof useUiDesignerStore>;

function setup(): Store {
  const store = useUiDesignerStore();
  store.applyDocument({
    components: [
      {
        id: 'knob1',
        type: 'Knob',
        position: { x: 0, y: 0 },
        size: { width: 80, height: 80 },
        parameterId: 'gain',
      },
      {
        id: 'knob2',
        type: 'Knob',
        position: { x: 100, y: 0 },
        size: { width: 80, height: 80 },
      },
    ],
    canvasWidth: 600,
    canvasHeight: 400,
    meta: {
      ...defaultProjectMeta('Demo'),
      parameters: [
        {
          id: 'gain',
          name: 'Gain',
          type: 'float',
          min: 0,
          max: 1,
          default: 0.5,
        },
      ],
    },
  });
  return store;
}

const ids = (store: Store) => store.projectMeta?.parameters.map((p) => p.id);

describe('uiDesignerStore — parameters', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('does nothing without a loaded document', () => {
    const store = useUiDesignerStore();
    expect(store.addParameter()).toBeNull();
    expect(store.canUndo).toBe(false);
  });

  it('add → undo → redo', () => {
    const store = setup();
    expect(store.addParameter()).toBe('param2');
    expect(ids(store)).toEqual(['gain', 'param2']);
    store.undo();
    expect(ids(store)).toEqual(['gain']);
    store.redo();
    expect(ids(store)).toEqual(['gain', 'param2']);
  });

  it('update keeps bindings when the id is unchanged', () => {
    const store = setup();
    const gain = store.projectMeta!.parameters[0]!;
    store.updateParameter('gain', { ...gain, name: 'Volume' });
    expect(store.projectMeta?.parameters[0]?.name).toBe('Volume');
    expect(store.componentsBoundTo('gain').map((c) => c.id)).toEqual(['knob1']);
    store.undo();
    expect(store.projectMeta?.parameters[0]?.name).toBe('Gain');
  });

  it('renaming the id rebinds widgets, and undo restores them', () => {
    const store = setup();
    const gain = store.projectMeta!.parameters[0]!;
    store.updateParameter('gain', { ...gain, id: 'volume' });
    expect(ids(store)).toEqual(['volume']);
    expect(store.components[0]?.parameterId).toBe('volume');
    expect(store.components[1]?.parameterId).toBeUndefined();

    store.undo();
    expect(ids(store)).toEqual(['gain']);
    expect(store.components[0]?.parameterId).toBe('gain');

    store.redo();
    expect(store.components[0]?.parameterId).toBe('volume');
  });

  it('remove unbinds widgets, and undo binds them back', () => {
    const store = setup();
    store.removeParameter('gain');
    expect(ids(store)).toEqual([]);
    expect(store.components[0]).not.toHaveProperty('parameterId');

    store.undo();
    expect(ids(store)).toEqual(['gain']);
    expect(store.components[0]?.parameterId).toBe('gain');
  });

  it('binds and unbinds a widget with undo', () => {
    const store = setup();
    store.setComponentParameter('knob2', 'gain');
    expect(store.componentsBoundTo('gain')).toHaveLength(2);
    store.setComponentParameter('knob2', undefined);
    expect(store.components[1]).not.toHaveProperty('parameterId');
    store.undo();
    expect(store.components[1]?.parameterId).toBe('gain');
    store.undo();
    expect(store.components[1]).not.toHaveProperty('parameterId');
  });

  it('skips no-op binding changes', () => {
    const store = setup();
    store.setComponentParameter('knob1', 'gain');
    expect(store.canUndo).toBe(false);
  });

  it('saves parameters and bindings to .aether', async () => {
    const store = setup();
    store.addParameter();
    store.setComponentParameter('knob2', 'param2');
    const writeFile = window.prototypeIDE.writeFile as Mock;
    writeFile.mockClear();
    await store.saveDocument('Demo.aether');
    const saved = JSON.parse(writeFile.mock.calls[0]![1] as string);
    expect(saved.parameters.map((p: { id: string }) => p.id)).toEqual([
      'gain',
      'param2',
    ]);
    expect(saved.components[1].properties.parameterId).toBe('param2');
  });
});
