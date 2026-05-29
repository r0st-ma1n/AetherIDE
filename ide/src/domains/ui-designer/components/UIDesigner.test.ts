import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { nextTick } from 'vue';
import UIDesigner from './UIDesigner.vue';
import { useUiDesignerStore } from '@/domains/ui-designer/stores/uiDesignerStore';

const TAB = {
  id: 'tab-1',
  title: 'test.uid',
  filePath: 'test.uid',
  kind: 'designer' as const,
  isDirty: false,
};

describe('UIDesigner rAF throttling', () => {
  let pendingRaf: Map<number, FrameRequestCallback>;
  let rafCounter: number;

  beforeEach(() => {
    setActivePinia(createPinia());

    (window.prototypeIDE.readFile as Mock).mockResolvedValue('{"components":[]}');

    pendingRaf = new Map();
    rafCounter = 1;

    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((cb: FrameRequestCallback) => {
        const id = rafCounter++;
        pendingRaf.set(id, cb);
        return id;
      })
    );

    vi.stubGlobal(
      'cancelAnimationFrame',
      vi.fn((id: number) => {
        pendingRaf.delete(id);
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  function flushRaf() {
    const callbacks = [...pendingRaf.values()];
    pendingRaf.clear();
    callbacks.forEach((cb) => cb(0));
  }

  async function setup() {
    const wrapper = mount(UIDesigner, {
      props: { tab: TAB },
      attachTo: document.body,
    });
    await flushPromises();
    const store = useUiDesignerStore();
    store.addComponent('Knob');
    await nextTick();
    return { wrapper, store };
  }

  describe('startDrag', () => {
    it('does not call moveComponent until the rAF fires', async () => {
      const { wrapper, store } = await setup();
      const moveSpy = vi.spyOn(store, 'moveComponent');

      await wrapper.find('.designer__component').trigger('mousedown', {
        button: 0,
        clientX: 50,
        clientY: 50,
      });

      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 60, clientY: 60 }));
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 70, clientY: 70 }));
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 80, clientY: 80 }));

      expect(moveSpy).not.toHaveBeenCalled();

      flushRaf();

      expect(moveSpy).toHaveBeenCalledTimes(1);

      wrapper.unmount();
    });

    it('uses the last mouse position when multiple events arrive before a frame', async () => {
      const { wrapper, store } = await setup();
      const moveSpy = vi.spyOn(store, 'moveComponent');

      await wrapper.find('.designer__component').trigger('mousedown', {
        button: 0,
        clientX: 0,
        clientY: 0,
      });

      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 10, clientY: 10 }));
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 999, clientY: 999 }));

      flushRaf();

      // Second event's coordinates should have been used, not the first
      const calledWith = moveSpy.mock.calls[0];
      const firstCallPosition = calledWith?.[1];
      expect(firstCallPosition).not.toEqual({ x: 10, y: 10 });

      wrapper.unmount();
    });

    it('cancels the pending rAF on mouseup', async () => {
      const { wrapper } = await setup();

      await wrapper.find('.designer__component').trigger('mousedown', {
        button: 0,
        clientX: 50,
        clientY: 50,
      });

      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 60, clientY: 60 }));

      expect(pendingRaf.size).toBe(1);

      window.dispatchEvent(new MouseEvent('mouseup'));

      expect(cancelAnimationFrame).toHaveBeenCalled();
      expect(pendingRaf.size).toBe(0);

      wrapper.unmount();
    });
  });

  describe('startResize', () => {
    it('does not call resizeComponent until the rAF fires', async () => {
      const { wrapper, store } = await setup();
      const resizeSpy = vi.spyOn(store, 'resizeComponent');

      await wrapper.find('.designer__resize-handle--se').trigger('mousedown', {
        button: 0,
        clientX: 100,
        clientY: 40,
      });

      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 110, clientY: 45 }));
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 120, clientY: 50 }));
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 130, clientY: 55 }));

      expect(resizeSpy).not.toHaveBeenCalled();

      flushRaf();

      expect(resizeSpy).toHaveBeenCalledTimes(1);

      wrapper.unmount();
    });

    it('cancels the pending rAF on mouseup', async () => {
      const { wrapper } = await setup();

      await wrapper.find('.designer__resize-handle--se').trigger('mousedown', {
        button: 0,
        clientX: 100,
        clientY: 40,
      });

      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 110, clientY: 50 }));

      expect(pendingRaf.size).toBe(1);

      window.dispatchEvent(new MouseEvent('mouseup'));

      expect(cancelAnimationFrame).toHaveBeenCalled();
      expect(pendingRaf.size).toBe(0);

      wrapper.unmount();
    });
  });
});
