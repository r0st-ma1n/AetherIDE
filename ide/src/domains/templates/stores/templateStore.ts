import { defineStore } from 'pinia';
import { ref } from 'vue';

export type PluginType = 'Effect' | 'Instrument';

export interface TemplateData {
  header: string;
  cpp: string;
  components: Record<string, string>;
}

export const useTemplateStore = defineStore('templates', () => {
  const currentPluginType = ref<PluginType>('Effect');
  const loadedTemplates = ref<Record<string, TemplateData>>({});

  async function loadTemplateForType(type: PluginType): Promise<TemplateData> {
    if (loadedTemplates.value[type]) {
      return loadedTemplates.value[type];
    }

    const basePath = import.meta.env.DEV
      ? 'ide/src/domains/templates/assets'
      : 'ide/dist/templates';

    try {
      const header = await window.prototypeIDE.readFile(
        `${basePath}/DefaultPlugin.h.template`
      );
      const cpp = await window.prototypeIDE.readFile(
        `${basePath}/DefaultPlugin.cpp.template`
      );

      const components: Record<string, string> = {};
      const componentNames = ['Knob', 'Slider', 'Button', 'Label'];

      for (const name of componentNames) {
        try {
          components[name] = await window.prototypeIDE.readFile(
            `${basePath}/${name}.template`
          );
        } catch (e) {
          console.warn(`Template for component ${name} not found.`);
        }
      }

      const templateData = { header, cpp, components };
      loadedTemplates.value[type] = templateData;
      return templateData;
    } catch (error) {
      console.error(`Failed to load templates for ${type}:`, error);
      throw error;
    }
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
