import { CodeGenerationPayload } from './types';

/**
 * Генерирует или обновляет C++ код на основе UI layout'а.
 * В будущем здесь будет интеграция с Tree-sitter для безопасной модификации AST.
 *
 * @param sourceCode Исходный C++ код (считанный из файла)
 * @param payload Данные о компонентах из визуального редактора
 * @returns Обновленный C++ код
 */
export function generateCppFromUI(
  sourceCode: string,
  payload: CodeGenerationPayload
): string {
  // Ищем начало функции (наивный подход для прототипа)
  const startRegex = /void\s+\w+::setupUI\(\)\s*\{/;
  const match = sourceCode.match(startRegex);

  if (!match || match.index === undefined) {
    console.warn(
      `setupUI() method not found in ${payload.filePath}. Cannot inject components.`
    );
    return sourceCode;
  }

  const startIndex = match.index + match[0].length;

  // Ищем закрывающую скобку (предполагаем, что внутри пока нет других вложенных блоков {})
  const endIndex = sourceCode.indexOf('}', startIndex);
  if (endIndex === -1) {
    return sourceCode;
  }

  // Генерируем новый код для всех компонентов в layout
  const componentsCode = payload.layout.components
    .map(
      (comp) =>
        `    auto* ${comp.id} = new ${comp.type}(${comp.position.x}, ${comp.position.y});`
    )
    .join('\n');

  // Заменяем всё внутри { ... } на актуальный сгенерированный код
  const before = sourceCode.substring(0, startIndex);
  const after = sourceCode.substring(endIndex);

  return `${before}\n${componentsCode}\n${after}`;
}
