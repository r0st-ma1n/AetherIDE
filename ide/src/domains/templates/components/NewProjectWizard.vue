<template>
  <div v-if="open" class="wizard-backdrop" @click.self="emitCancel">
    <section
      class="wizard"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-project-title"
    >
      <header class="wizard__header">
        <h2 id="new-project-title">New Project</h2>
        <button type="button" class="wizard__close" @click="emitCancel">
          ×
        </button>
      </header>

      <div class="wizard__body">
        <label class="wizard__field">
          <span>Name</span>
          <input
            v-model="name"
            type="text"
            placeholder="MyPlugin"
            autocomplete="off"
            spellcheck="false"
          />
        </label>

        <label class="wizard__field">
          <span>Type</span>
          <select v-model="pluginType">
            <option value="Effect">Effect</option>
            <option value="Instrument">Instrument</option>
          </select>
        </label>

        <label class="wizard__field">
          <span>Location</span>
          <div class="wizard__location">
            <input
              v-model="location"
              type="text"
              readonly
              placeholder="Choose a folder…"
            />
            <button type="button" @click="chooseLocation">Browse…</button>
          </div>
        </label>

        <p v-if="previewPath" class="wizard__preview">
          Creates <code>{{ previewPath }}</code>
        </p>
        <p v-if="error" class="wizard__error">{{ error }}</p>
      </div>

      <footer class="wizard__footer">
        <button type="button" class="wizard__btn" @click="emitCancel">
          Cancel
        </button>
        <button
          type="button"
          class="wizard__btn wizard__btn--primary"
          :disabled="busy"
          @click="submit"
        >
          {{ busy ? 'Creating…' : 'Create' }}
        </button>
      </footer>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  buildScaffoldFiles,
  validatePluginName,
} from '@/domains/templates/lib/scaffoldProject';
import {
  useTemplateStore,
  type PluginType,
} from '@/domains/templates/stores/templateStore';

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  cancel: [];
  created: [payload: { projectRoot: string; aetherPath: string }];
}>();

const templateStore = useTemplateStore();

const name = ref('MyPlugin');
const pluginType = ref<PluginType>('Effect');
const location = ref('');
const error = ref<string | null>(null);
const busy = ref(false);

const previewPath = computed(() => {
  if (!location.value || !name.value.trim()) {
    return '';
  }
  const sep = location.value.includes('\\') ? '\\' : '/';
  return `${location.value.replace(/[\\/]+$/, '')}${sep}${name.value.trim()}`;
});

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      name.value = 'MyPlugin';
      pluginType.value = 'Effect';
      location.value = '';
      error.value = null;
      busy.value = false;
    }
  }
);

function emitCancel() {
  if (busy.value) {
    return;
  }
  emit('cancel');
}

async function chooseLocation() {
  error.value = null;
  const chosen = await window.prototypeIDE.chooseDirectory({
    title: 'Choose Project Location',
  });
  if (chosen) {
    location.value = chosen;
  }
}

async function submit() {
  error.value = null;
  const nameError = validatePluginName(name.value);
  if (nameError) {
    error.value = nameError;
    return;
  }
  if (!location.value) {
    error.value = 'Choose a location for the new project.';
    return;
  }

  busy.value = true;
  try {
    const className = name.value.trim();
    const templates = await templateStore.loadTemplateForType(pluginType.value);
    templateStore.setPluginType(pluginType.value);

    const files = buildScaffoldFiles({
      className,
      pluginType: pluginType.value,
      templates,
    });

    const projectRoot = await window.prototypeIDE.scaffoldProject({
      parentDir: location.value,
      folderName: className,
      files,
    });

    await window.prototypeIDE.setProjectRoot(projectRoot);
    emit('created', {
      projectRoot,
      aetherPath: `${className}.aether`,
    });
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : 'Failed to create project.';
  } finally {
    busy.value = false;
  }
}
</script>

<style scoped>
.wizard-backdrop {
  position: fixed;
  inset: 0;
  z-index: 4000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.55);
}

.wizard {
  width: min(440px, calc(100vw - 32px));
  border: 1px solid #3a4150;
  border-radius: 8px;
  background: #1c212b;
  color: #d7dde8;
  box-shadow: none;
}

.wizard__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid #2c3340;
}

.wizard__header h2 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}

.wizard__close {
  border: none;
  background: transparent;
  color: #9aa3b2;
  font-size: 20px;
  cursor: pointer;
}

.wizard__body {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
}

.wizard__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  color: #9aa3b2;
}

.wizard__field input,
.wizard__field select {
  height: 32px;
  border: 1px solid #3a4150;
  border-radius: 4px;
  background: #12161e;
  color: #e8eef7;
  padding: 0 10px;
  font-size: 13px;
}

.wizard__location {
  display: flex;
  gap: 8px;
}

.wizard__location input {
  flex: 1;
  min-width: 0;
}

.wizard__location button,
.wizard__btn {
  height: 32px;
  border: 1px solid #3a4150;
  border-radius: 4px;
  background: #252b36;
  color: #d7dde8;
  padding: 0 12px;
  font-size: 12px;
  cursor: pointer;
}

.wizard__btn--primary {
  background: #0e639c;
  border-color: #0e639c;
  color: #fff;
}

.wizard__btn:disabled {
  opacity: 0.6;
  cursor: default;
}

.wizard__preview {
  margin: 0;
  font-size: 12px;
  color: #8b949e;
  word-break: break-all;
}

.wizard__preview code {
  color: #c8d1dc;
}

.wizard__error {
  margin: 0;
  font-size: 12px;
  color: #f48771;
}

.wizard__footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 16px 16px;
}
</style>
