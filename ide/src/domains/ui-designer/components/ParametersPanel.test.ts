import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, type Mock } from 'vitest';
import ParametersPanel from './ParametersPanel.vue';
import PropertiesPanel from './PropertiesPanel.vue';
import { useUiDesignerStore } from '@/domains/ui-designer/stores/uiDesignerStore';
import { defaultProjectMeta } from '@/shared/lib/projectMeta';

const confirmAction = () => window.prototypeIDE.confirmAction as Mock;

function loadDocument() {
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
        id: 'button1',
        type: 'Button',
        position: { x: 0, y: 100 },
        size: { width: 80, height: 30 },
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
        { id: 'bypass', name: 'Bypass', type: 'bool', default: false },
      ],
    },
  });
  return store;
}

async function change(wrapper: VueWrapper, selector: string, value: string) {
  const input = wrapper.find(selector);
  (input.element as HTMLInputElement).value = value;
  await input.trigger('change');
  await flushPromises();
}

/** Float fields render in order Min, Max, Default, Step. */
const numberInput = (n: number) =>
  `.property-group .property-row:nth-of-type(${n + 3}) input`;

describe('ParametersPanel', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    confirmAction().mockReset();
    confirmAction().mockResolvedValue(true);
  });

  it('asks to open a document when none is loaded', () => {
    const wrapper = mount(ParametersPanel);
    expect(wrapper.text()).toContain('Open a .aether file');
    expect(wrapper.find('.panel__add').exists()).toBe(false);
  });

  it('lists parameters and selects the first one', () => {
    loadDocument();
    const wrapper = mount(ParametersPanel);
    const items = wrapper.findAll('.param-list__item');
    expect(items.map((item) => item.find('.param-list__meta').text())).toEqual([
      'gain · float',
      'bypass · bool',
    ]);
    expect(items[0]?.classes()).toContain('param-list__item--active');
    expect(wrapper.text()).toContain('Widgets: 1');
  });

  it('adds a parameter and selects it', async () => {
    const store = loadDocument();
    const wrapper = mount(ParametersPanel);
    await wrapper.find('.panel__add').trigger('click');
    expect(store.projectMeta?.parameters.map((p) => p.id)).toEqual([
      'gain',
      'bypass',
      'param3',
    ]);
    expect(wrapper.find('.param-list__item--active').text()).toContain(
      'param3'
    );
  });

  it('renames a parameter without asking when only the name changes', async () => {
    const store = loadDocument();
    const wrapper = mount(ParametersPanel);
    await change(
      wrapper,
      '.property-row:nth-of-type(2) .property-input',
      'Volume'
    );
    expect(store.projectMeta?.parameters[0]?.name).toBe('Volume');
  });

  it('warns before changing the id and rebinds widgets on confirm', async () => {
    const store = loadDocument();
    const wrapper = mount(ParametersPanel);
    await change(wrapper, '.property-group .property-input', 'volume');
    expect(confirmAction()).toHaveBeenCalledOnce();
    expect(confirmAction().mock.calls[0]?.[0].detail).toContain('automation');
    expect(store.projectMeta?.parameters[0]?.id).toBe('volume');
    expect(store.components[0]?.parameterId).toBe('volume');
  });

  it('keeps the id when the warning is cancelled', async () => {
    confirmAction().mockResolvedValue(false);
    const store = loadDocument();
    const wrapper = mount(ParametersPanel);
    await change(wrapper, '.property-group .property-input', 'volume');
    expect(store.projectMeta?.parameters[0]?.id).toBe('gain');
    expect(
      (
        wrapper.find('.property-group .property-input')
          .element as HTMLInputElement
      ).value
    ).toBe('gain');
  });

  it('holds an invalid range in the draft until it becomes valid', async () => {
    const store = loadDocument();
    const wrapper = mount(ParametersPanel);

    await change(wrapper, numberInput(1), '5');
    expect(wrapper.find('.param-errors').text()).toContain(
      'max: must be greater than min'
    );
    expect(store.projectMeta?.parameters[0]).toMatchObject({ min: 0 });
    expect(store.canUndo).toBe(false);

    await change(wrapper, numberInput(2), '10');
    expect(wrapper.find('.param-errors').text()).toContain(
      'default: must be within'
    );
    await change(wrapper, numberInput(3), '6');
    expect(wrapper.find('.param-errors').exists()).toBe(false);
    expect(store.projectMeta?.parameters[0]).toMatchObject({
      min: 5,
      max: 10,
      default: 6,
    });
  });

  it('rejects a non-numeric value', async () => {
    const store = loadDocument();
    const wrapper = mount(ParametersPanel);
    await change(wrapper, numberInput(1), '');
    expect(wrapper.find('.param-errors').text()).toContain(
      'min: must be a number'
    );
    expect(store.canUndo).toBe(false);
  });

  it('changes the type with type-specific fields', async () => {
    const store = loadDocument();
    const wrapper = mount(ParametersPanel);
    await wrapper.find('.property-group select').setValue('choice');
    await flushPromises();
    expect(store.projectMeta?.parameters[0]).toEqual({
      id: 'gain',
      name: 'Gain',
      type: 'choice',
      choices: ['Off', 'On'],
      default: 0,
    });
    expect(wrapper.find('textarea').exists()).toBe(true);
  });

  it('warns before deleting a bound parameter and unbinds widgets', async () => {
    const store = loadDocument();
    const wrapper = mount(ParametersPanel);
    await wrapper.find('.panel__delete').trigger('click');
    await flushPromises();
    expect(confirmAction()).toHaveBeenCalledOnce();
    expect(confirmAction().mock.calls[0]?.[0].detail).toContain(
      '1 widget is bound'
    );
    expect(store.projectMeta?.parameters.map((p) => p.id)).toEqual(['bypass']);
    expect(store.components[0]).not.toHaveProperty('parameterId');
  });

  it('keeps a bound parameter when deletion is cancelled', async () => {
    confirmAction().mockResolvedValue(false);
    const store = loadDocument();
    const wrapper = mount(ParametersPanel);
    await wrapper.find('.panel__delete').trigger('click');
    await flushPromises();
    expect(store.projectMeta?.parameters).toHaveLength(2);
  });

  it('deletes an unbound parameter without asking', async () => {
    const store = loadDocument();
    const wrapper = mount(ParametersPanel);
    await wrapper.findAll('.param-list__item')[1]?.trigger('click');
    await wrapper.find('.panel__delete').trigger('click');
    await flushPromises();
    expect(confirmAction()).not.toHaveBeenCalled();
    expect(store.projectMeta?.parameters.map((p) => p.id)).toEqual(['gain']);
  });

  it('follows undo of an added parameter', async () => {
    const store = loadDocument();
    const wrapper = mount(ParametersPanel);
    await wrapper.find('.panel__add').trigger('click');
    store.undo();
    await flushPromises();
    expect(wrapper.findAll('.param-list__item')).toHaveLength(2);
    expect(wrapper.find('.param-list__item--active').text()).toContain('gain');
  });
});

describe('PropertiesPanel — parameter binding', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  function parameterSelect(wrapper: VueWrapper) {
    return wrapper
      .findAll('.property-row')
      .find((row) => row.text().startsWith('Parameter'))!
      .find('select');
  }

  it('offers parameters that fit the widget type', () => {
    const store = loadDocument();
    store.selectComponent('button1');
    const wrapper = mount(PropertiesPanel);
    const options = parameterSelect(wrapper).findAll('option');
    expect(options.map((o) => o.attributes('value'))).toEqual(['', 'bypass']);
  });

  it('binds a widget and hides its own range', async () => {
    const store = loadDocument();
    store.selectComponent('knob1');
    const wrapper = mount(PropertiesPanel);
    expect(wrapper.text()).not.toContain('Range');

    await parameterSelect(wrapper).setValue('');
    expect(store.components[0]).not.toHaveProperty('parameterId');
    expect(wrapper.text()).toContain('Range');

    await parameterSelect(wrapper).setValue('gain');
    expect(store.components[0]?.parameterId).toBe('gain');
  });
});
