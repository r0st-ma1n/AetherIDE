import type { UiComponent } from '@/shared/types';

export function generateCodePreview(components: UiComponent[]) {
  return `${components.length} UI components`;
}
