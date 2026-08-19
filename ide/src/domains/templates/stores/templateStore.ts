import defaultHeader from '../assets/DefaultPlugin.h.template?raw';
import defaultCpp from '../assets/DefaultPlugin.cpp.template?raw';
import knobTemplate from '../assets/Knob.template?raw';
import sliderTemplate from '../assets/Slider.template?raw';
import buttonTemplate from '../assets/Button.template?raw';
import labelTemplate from '../assets/Label.template?raw';
import { defineStore } from 'pinia';
import { ref } from 'vue';

export type PluginType = 'Effect' | 'Instrument';

export interface TemplateData {
  header: string;
  cpp: string;
  components: Record<string, string>;
}

const BUNDLED_TEMPLATES: TemplateData = {
  header: defaultHeader,
  cpp: defaultCpp,
  components: {
    Knob: knobTemplate,
    Slider: sliderTemplate,
    Button: buttonTemplate,
    Label: labelTemplate,
  },
};

export const useTemplateStore = defineStore('templates', () => {
  const currentPluginType = ref<PluginType>('Effect');
  const loadedTemplates = ref<Partial<Record<PluginType, TemplateData>>>({});

  async function loadTemplateForType(type: PluginType): Promise<TemplateData> {
    const cached = loadedTemplates.value[type];
    if (cached) {
      return cached;
    }

    // Bundled via Vite (?raw) — does not depend on project-root file:read.
    // Effect/Instrument share UI templates; type is stored on the .aether project.
    const templateData: TemplateData = {
      header: BUNDLED_TEMPLATES.header,
      cpp: BUNDLED_TEMPLATES.cpp,
      components: { ...BUNDLED_TEMPLATES.components },
    };
    loadedTemplates.value[type] = templateData;
    return loadedTemplates.value[type]!;
  }

  function setPluginType(type: PluginType) {
    currentPluginType.value = type;
  }

  return {
    currentPluginType,
    loadedTemplates,
    loadTemplateForType,
    setPluginType,
  };
});
