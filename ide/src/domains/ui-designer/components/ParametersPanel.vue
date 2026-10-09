<template>
  <section class="panel">
    <header class="panel__header">
      <span>Parameters</span>
      <button
        v-if="parameters"
        class="panel__add"
        type="button"
        title="Add parameter"
        @click="onAdd"
      >
        +
      </button>
    </header>

    <div v-if="!parameters" class="panel__empty">
      Open a .aether file in the designer.
    </div>

    <div v-else class="panel__body">
      <div v-if="parameters.length === 0" class="panel__empty">
        No parameters yet.
      </div>
      <ul v-else class="param-list">
        <li
          v-for="param in parameters"
          :key="param.id"
          class="param-list__item"
          :class="{ 'param-list__item--active': param.id === selectedId }"
          @click="selectedId = param.id"
        >
          <span class="param-list__name">{{ param.name }}</span>
          <span class="param-list__meta"
            >{{ param.id }} · {{ param.type }}</span
          >
        </li>
      </ul>

      <div v-if="draft && selectedParam" class="property-group">
        <div class="property-row">
          <span class="property-label">ID</span>
          <input
            class="property-input property-input--wide"
            :value="draft.id"
            @change="onTextChange('id', $event)"
          />
        </div>
        <div class="property-row">
          <span class="property-label">Name</span>
          <input
            class="property-input property-input--wide"
            :value="draft.name"
            @change="onTextChange('name', $event)"
          />
        </div>
        <div class="property-row">
          <span class="property-label">Type</span>
          <select
            class="property-select"
            :value="draft.type"
            @change="onTypeChange"
          >
            <option
              v-for="item in PARAMETER_TYPES"
              :key="item.type"
              :value="item.type"
            >
              {{ item.label }}
            </option>
          </select>
        </div>

        <template v-if="draft.type === 'float'">
          <div
            v-for="field in FLOAT_FIELDS"
            :key="field.key"
            class="property-row"
          >
            <span class="property-label">{{ field.label }}</span>
            <input
              class="property-input"
              type="number"
              step="any"
              :value="draft[field.key] ?? ''"
              :placeholder="field.optional ? '—' : ''"
              @change="onNumberChange(field.key, $event)"
            />
          </div>
          <div class="property-row">
            <span class="property-label">Unit</span>
            <input
              class="property-input"
              :value="draft.unit ?? ''"
              placeholder="—"
              @change="onUnitChange"
            />
          </div>
        </template>

        <div v-else-if="draft.type === 'bool'" class="property-row">
          <span class="property-label">Default</span>
          <input
            type="checkbox"
            :checked="draft.default"
            @change="onBoolDefaultChange"
          />
        </div>

        <template v-else>
          <div class="property-row property-row--top">
            <span class="property-label">Choices</span>
            <textarea
              class="property-input property-input--wide property-textarea"
              rows="3"
              :value="draft.choices.join('\n')"
              @change="onChoicesChange"
            ></textarea>
          </div>
          <div class="property-row">
            <span class="property-label">Default</span>
            <select
              class="property-select"
              :value="draft.default"
              @change="onChoiceDefaultChange"
            >
              <option
                v-for="(choice, index) in draft.choices"
                :key="index"
                :value="index"
              >
                {{ choice }}
              </option>
            </select>
          </div>
        </template>

        <ul v-if="errors.length > 0" class="param-errors">
          <li v-for="error in errors" :key="error">{{ error }}</li>
        </ul>

        <div class="property-row">
          <span class="property-label property-label--muted">
            Widgets: {{ boundCount }}
          </span>
          <button class="panel__delete" type="button" @click="onDelete">
            Delete
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, toRaw, watch } from 'vue';
import { storeToRefs } from 'pinia';
import {
  convertParameterType,
  PARAMETER_TYPES,
  parameterErrors,
  type ParameterType,
} from '@/domains/ui-designer/lib/parameters';
import { useUiDesignerStore } from '@/domains/ui-designer/stores/uiDesignerStore';
import type { AetherFloatParameter, AetherParameter } from '@/shared/types';

type FloatField = 'min' | 'max' | 'default' | 'step';

const FLOAT_FIELDS: { key: FloatField; label: string; optional: boolean }[] = [
  { key: 'min', label: 'Min', optional: false },
  { key: 'max', label: 'Max', optional: false },
  { key: 'default', label: 'Default', optional: false },
  { key: 'step', label: 'Step', optional: true },
];

const store = useUiDesignerStore();
const { projectMeta } = storeToRefs(store);

const parameters = computed(() => projectMeta.value?.parameters ?? null);
const selectedId = ref<string | null>(null);
const selectedParam = computed(
  () => parameters.value?.find((p) => p.id === selectedId.value) ?? null
);
const boundCount = computed(() =>
  selectedId.value ? store.componentsBoundTo(selectedId.value).length : 0
);

/**
 * Edited copy of the selected parameter. A change is committed to the store only
 * when the whole parameter is valid, so a range can pass through invalid states
 * (e.g. min above the old max) while the user types.
 */
const draft = ref<AetherParameter | null>(null);
const errors = ref<string[]>([]);

// Keep a selection while parameters exist; drop it when its parameter is gone (undo).
watch(
  parameters,
  (list) => {
    if (!list || list.some((p) => p.id === selectedId.value)) return;
    selectedId.value = list[0]?.id ?? null;
  },
  { immediate: true }
);

watch(
  selectedParam,
  (param) => {
    draft.value = param ? structuredClone(toRaw(param)) : null;
    errors.value = [];
  },
  { immediate: true, deep: true }
);

function onAdd() {
  const id = store.addParameter();
  if (id) selectedId.value = id;
}

async function apply(next: AetherParameter) {
  const original = selectedParam.value;
  const list = parameters.value;
  if (!original || !list) return;

  draft.value = next;
  const index = list.findIndex((p) => p.id === original.id);
  const candidate = list.map((p, i) => (i === index ? next : p));
  errors.value = parameterErrors(candidate, index);
  if (errors.value.length > 0) return;

  if (next.id !== original.id) {
    const confirmed = await window.prototypeIDE.confirmAction({
      title: 'Change parameter id',
      message: `Change parameter id "${original.id}" to "${next.id}"?`,
      detail:
        'DAW projects store automation and saved values by parameter id. ' +
        'Projects made with a released version of the plugin lose them for ' +
        'this parameter. Bound widgets are updated.',
      confirmLabel: 'Change id',
    });
    if (!confirmed) {
      draft.value = { ...next, id: original.id };
      return;
    }
  }
  store.updateParameter(original.id, next);
  selectedId.value = next.id;
}

function onTextChange(field: 'id' | 'name', event: Event) {
  if (!draft.value) return;
  const value = (event.target as HTMLInputElement).value.trim();
  void apply({ ...draft.value, [field]: value });
}

function onTypeChange(event: Event) {
  if (!draft.value) return;
  const type = (event.target as HTMLSelectElement).value as ParameterType;
  void apply(convertParameterType(draft.value, type));
}

function onNumberChange(field: FloatField, event: Event) {
  if (draft.value?.type !== 'float') return;
  const raw = (event.target as HTMLInputElement).value.trim();
  const next: AetherFloatParameter = { ...draft.value };
  if (field === 'step' && (raw === '' || Number(raw) === 0)) {
    delete next.step;
  } else if (raw === '' || !Number.isFinite(Number(raw))) {
    errors.value = [`${field}: must be a number`];
    return;
  } else {
    next[field] = Number(raw);
  }
  void apply(next);
}

function onUnitChange(event: Event) {
  if (draft.value?.type !== 'float') return;
  const unit = (event.target as HTMLInputElement).value.trim();
  const next: AetherFloatParameter = { ...draft.value, unit };
  if (!unit) delete next.unit;
  void apply(next);
}

function onBoolDefaultChange(event: Event) {
  if (draft.value?.type !== 'bool') return;
  const checked = (event.target as HTMLInputElement).checked;
  void apply({ ...draft.value, default: checked });
}

function onChoicesChange(event: Event) {
  if (draft.value?.type !== 'choice') return;
  const choices = (event.target as HTMLTextAreaElement).value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const defaultIndex = Math.min(draft.value.default, choices.length - 1);
  void apply({ ...draft.value, choices, default: Math.max(0, defaultIndex) });
}

function onChoiceDefaultChange(event: Event) {
  if (draft.value?.type !== 'choice') return;
  const index = Number((event.target as HTMLSelectElement).value);
  void apply({ ...draft.value, default: index });
}

async function onDelete() {
  const param = selectedParam.value;
  if (!param) return;
  const bound = store.componentsBoundTo(param.id).length;
  if (bound > 0) {
    const confirmed = await window.prototypeIDE.confirmAction({
      title: 'Delete parameter',
      message: `Delete parameter "${param.name}"?`,
      detail: `${bound} widget${bound === 1 ? ' is' : 's are'} bound to it and will be unbound.`,
      confirmLabel: 'Delete',
    });
    if (!confirmed) return;
  }
  store.removeParameter(param.id);
}
</script>

<style scoped>
.panel {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  overflow-y: auto;
  border-bottom: 1px solid #2d2d2d;
}

.panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px;
  font-size: 11px;
  text-transform: uppercase;
  color: #888;
  letter-spacing: 0.8px;
  border-bottom: 1px solid #2d2d2d;
  flex-shrink: 0;
}

.panel__add {
  background: none;
  border: 1px solid #3a3a3a;
  border-radius: 3px;
  color: #ccc;
  font-size: 14px;
  line-height: 1;
  width: 22px;
  height: 22px;
  cursor: pointer;
}

.panel__add:hover {
  border-color: #4a9eff;
  color: #fff;
}

.panel__body {
  padding: 4px 0;
}

.panel__empty {
  color: rgba(204, 204, 204, 0.5);
  font-size: 12px;
  padding: 10px;
  text-align: center;
}

.param-list {
  list-style: none;
  margin: 0;
  padding: 0 0 4px;
  border-bottom: 1px solid #2d2d2d;
}

.param-list__item {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 4px 10px;
  cursor: pointer;
  font-size: 12px;
  color: #ccc;
}

.param-list__item:hover {
  background: #2a2d2e;
}

.param-list__item--active {
  background: #094771;
}

.param-list__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.param-list__meta {
  color: #888;
  font-size: 11px;
  white-space: nowrap;
}

.property-group {
  padding: 4px 0;
}

.property-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 3px 10px;
  color: #cccccc;
  min-height: 26px;
}

.property-row--top {
  align-items: flex-start;
}

.property-label {
  font-size: 12px;
  color: #999;
  flex-shrink: 0;
  min-width: 52px;
}

.property-label--muted {
  color: #777;
}

.property-input {
  width: 80px;
  background: #1a1a1a;
  border: 1px solid #3a3a3a;
  border-radius: 3px;
  color: #e0e0e0;
  font-size: 12px;
  padding: 3px 6px;
  text-align: right;
  outline: none;
  transition: border-color 0.15s;
}

.property-input--wide {
  width: 140px;
  text-align: left;
}

.property-input:focus {
  border-color: #4a9eff;
}

.property-textarea {
  resize: vertical;
  font-family: inherit;
}

.property-select {
  width: 140px;
  background: #1a1a1a;
  border: 1px solid #3a3a3a;
  border-radius: 3px;
  color: #e0e0e0;
  font-size: 12px;
  padding: 3px 6px;
  outline: none;
  cursor: pointer;
}

.property-select:focus {
  border-color: #4a9eff;
}

.param-errors {
  margin: 4px 10px;
  padding: 6px 8px 6px 20px;
  border-radius: 3px;
  background: rgba(244, 71, 71, 0.12);
  color: #f48771;
  font-size: 11px;
}

.panel__delete {
  background: none;
  border: 1px solid #5a2d2d;
  border-radius: 3px;
  color: #f48771;
  font-size: 12px;
  padding: 2px 10px;
  cursor: pointer;
}

.panel__delete:hover {
  background: rgba(244, 71, 71, 0.12);
}
</style>
