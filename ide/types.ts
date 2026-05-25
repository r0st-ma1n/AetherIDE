/**
 * Базовые координаты на холсте (Canvas)
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Размеры компонента (опционально, если они могут меняться)
 */
export interface Size {
  width: number;
  height: number;
}

/**
 * Поддерживаемые типы UI-компонентов
 */
export type ComponentType = 'Knob' | 'Slider' | 'Button' | 'Label';

/**
 * Описание одного UI-компонента на холсте (Form Designer)
 */
export interface UIComponent {
  id: string; // Уникальный ID компонента (например, 'Knob_1')
  type: ComponentType; // Тип компонента
  position: Position; // Позиция на холсте
  size?: Size; // Размеры (если применимо)
  parameterId?: string; // Привязка к параметру DSP (например, ID из FloatParameter)
  properties?: Record<string, any>; // Дополнительные свойства (цвет, текст и т.д.)
}

/**
 * Представление всего layout'а (состояния) визуального дизайнера
 */
export interface FormLayout {
  components: UIComponent[];
}

/**
 * Payload для генерации C++ кода из UI
 */
export interface CodeGenerationPayload {
  filePath: string; // Путь к целевому C++ файлу (например, 'GainPlugin.cpp')
  layout: FormLayout; // Актуальное состояние визуального редактора
}

/**
 * Результат парсинга C++ кода для восстановления UI (в будущем через AST)
 */
export interface CodeParsingResult {
  filePath: string;
  layout: FormLayout;
  errors?: string[]; // Ошибки парсинга, если код содержит синтаксические ошибки
}

/**
 * API-контракт для взаимодействия фронтенда с бэкендом (Electron IPC / Node.js)
 */
export interface IBackendAPI {
  // Запрос на парсинг кода (в будущем - вызов Tree-sitter AST парсера)
  parseCode(filePath: string, sourceCode: string): Promise<CodeParsingResult>;
  
  // Запрос на генерацию кода бэкендом (безопасная модификация AST)
  generateCode(
    payload: CodeGenerationPayload,
  ): Promise<{ success: boolean; newCode?: string; error?: string }>;
  
  // Вызов компиляции плагина (CMake)
  buildProject(buildDir: string): Promise<{ success: boolean; logs: string }>;
}

declare global {
  interface Window {
    ideBackend: IBackendAPI;
  }
}