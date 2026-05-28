import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ComponentPalette from './ComponentPalette.vue';
import { useUiDesignerStore } from '@/domains/ui-designer/stores/uiDesignerStore';

describe('ComponentPalette', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders all palette items', () => {
    const wrapper = mount(ComponentPalette);
    const items = wrapper.findAll('.palette-item');
    expect(items.length).toBeGreaterThan(0);
  });

  it('shows the Palette header', () => {
    const wrapper = mount(ComponentPalette);
    expect(wrapper.text()).toContain('Palette');
  });

  it('calls addComponent when a palette item is clicked', async () => {
    const store = useUiDesignerStore();
    const addSpy = vi.spyOn(store, 'addComponent');

    const wrapper = mount(ComponentPalette);
    await wrapper.findAll('.palette-item')[0]?.trigger('click');

    expect(addSpy).toHaveBeenCalledOnce();
  });

  it('calls startPaletteDrag on dragstart', async () => {
    const store = useUiDesignerStore();
    const dragSpy = vi.spyOn(store, 'startPaletteDrag');

    const wrapper = mount(ComponentPalette);
    await wrapper.findAll('.palette-item')[0]?.trigger('dragstart', {
      dataTransfer: { setData: vi.fn(), effectAllowed: '' },
    });

    expect(dragSpy).toHaveBeenCalledOnce();
  });
});
