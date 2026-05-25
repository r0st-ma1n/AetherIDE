import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useEditorStore = defineStore('editor', () => {
  const currentLanguage = ref<'cpp' | 'json' | 'plaintext'>('cpp');

  function setLanguage(language: 'cpp' | 'json' | 'plaintext') {
    currentLanguage.value = language;
  }

  return {
    currentLanguage,
    setLanguage,
  };
});
