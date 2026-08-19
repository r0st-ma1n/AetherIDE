import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { useTemplateStore } from './templateStore';

describe('templateStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('loads bundled templates without project file:read', async () => {
    const store = useTemplateStore();
    const templates = await store.loadTemplateForType('Effect');

    expect(templates.header).toContain('{{className}}');
    expect(templates.cpp).toContain('{{setupComponents}}');
    expect(templates.components.Knob).toBeTypeOf('string');
    expect(templates.components.Slider).toBeTypeOf('string');
    expect(templates.components.Button).toBeTypeOf('string');
  });

  it('caches templates per plugin type', async () => {
    const store = useTemplateStore();
    const first = await store.loadTemplateForType('Instrument');
    const second = await store.loadTemplateForType('Instrument');
    expect(second).toEqual(first);
    expect(store.loadedTemplates.Instrument).toEqual(first);
  });
});
