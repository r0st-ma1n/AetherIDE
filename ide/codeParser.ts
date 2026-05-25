import { CodeParsingResult, UIComponent, ComponentType } from './types';

/**
 * Парсит C++ код и извлекает из него информацию о UI-компонентах для дизайнера.
 * Это подготовленный API-контракт для будущего AST-парсера (Tree-sitter).
 * Текущая реализация использует регулярные выражения для простейшего разбора.
 * 
 * @param sourceCode Исходный C++ код
 * @param filePath Путь к файлу
 * @returns Структура layout'а для визуального редактора
 */
export function parseUIFromCpp(sourceCode: string, filePath: string): CodeParsingResult {
  const components: UIComponent[] = [];
  const errors: string[] = [];

  // Наивный парсинг строк вида: auto* Knob_1 = new Knob(10, 20);
  const componentRegex = /auto\*\s+(\w+)\s*=\s*new\s+(\w+)\(\s*(\d+)\s*,\s*(\d+)\s*\);/g;
  let match;

  while ((match = componentRegex.exec(sourceCode)) !== null) {
    try {
      components.push({
        id: match[1],
        type: match[2] as ComponentType,
        position: {
          x: parseInt(match[3], 10),
          y: parseInt(match[4], 10)
        }
      });
    } catch (e) {
      errors.push(`Failed to parse component definition at index ${match.index}`);
    }
  }

  return {
    filePath,
    layout: { components },
    errors: errors.length > 0 ? errors : undefined
  };
}