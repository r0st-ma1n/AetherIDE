import {
  generatePluginCode,
  type Templates,
  validateCppSyntax,
} from '@/domains/ui-designer/lib/codeGenerator';
import { parseUIFromCpp } from '@/domains/ui-designer/lib/codeParser';
import {
  parseDesignerDocument,
  serializeDesignerDocument,
  type UiDocumentData,
} from '@/domains/ui-designer/lib/uiDocument';
import type { UISpec, UISpecComponent } from '@/shared/types';

export interface LinkedPluginPaths {
  aetherPath: string;
  headerPath: string;
  cppPath: string;
  className: string;
}

export function buildLinkedPluginPaths(
  designerOrCodePath: string,
  joinPath: (dir: string, name: string) => string,
  dirname: (path: string) => string,
  basenameWithoutExt: (path: string) => string
): LinkedPluginPaths {
  const baseDir = dirname(designerOrCodePath);
  const className = basenameWithoutExt(designerOrCodePath);
  return {
    className,
    aetherPath: joinPath(baseDir, `${className}.aether`),
    headerPath: joinPath(baseDir, `${className}.h`),
    cppPath: joinPath(baseDir, `${className}.cpp`),
  };
}

export function buildAetherDocumentFromCpp(
  cppSource: string,
  existing: Pick<UiDocumentData, 'canvasWidth' | 'canvasHeight'>
): UiDocumentData | null {
  const spec = parseUIFromCpp(cppSource);
  if (spec.components.length === 0) {
    return null;
  }
  return {
    components: spec.components,
    canvasWidth: existing.canvasWidth,
    canvasHeight: existing.canvasHeight,
  };
}

export function generateLinkedPluginSources(input: {
  components: UISpecComponent[];
  className: string;
  templates: Templates;
  existingHeader: string;
  existingCpp: string;
}): { headerCode: string; cppCode: string } {
  const { headerCode, cppCode } = generatePluginCode(
    input.components,
    input.className,
    input.templates,
    input.existingHeader,
    input.existingCpp
  );

  const headerValidation = validateCppSyntax(headerCode);
  const cppValidation = validateCppSyntax(cppCode);
  if (!headerValidation.valid || !cppValidation.valid) {
    const errorMsg = headerValidation.error || cppValidation.error;
    throw new Error(`Generation Error: ${errorMsg}`);
  }

  return { headerCode, cppCode };
}

export async function readOptionalFile(
  path: string,
  readFile: (path: string) => Promise<string>,
  fileExists: (path: string) => Promise<boolean>
): Promise<string> {
  if (!(await fileExists(path))) {
    return '';
  }
  try {
    return (await readFile(path)) || '';
  } catch {
    return '';
  }
}

export function serializeAetherFromSpec(
  aetherPath: string,
  spec: UISpec,
  canvasWidth: number,
  canvasHeight: number
): string {
  return serializeDesignerDocument(
    aetherPath,
    spec.components,
    canvasWidth,
    canvasHeight
  );
}

export async function loadExistingAetherCanvas(
  aetherPath: string,
  readFile: (path: string) => Promise<string>,
  fileExists: (path: string) => Promise<boolean>
): Promise<Pick<UiDocumentData, 'canvasWidth' | 'canvasHeight'>> {
  if (!(await fileExists(aetherPath))) {
    return { canvasWidth: 600, canvasHeight: 400 };
  }
  try {
    const doc = parseDesignerDocument(await readFile(aetherPath), aetherPath);
    return {
      canvasWidth: doc.canvasWidth,
      canvasHeight: doc.canvasHeight,
    };
  } catch {
    return { canvasWidth: 600, canvasHeight: 400 };
  }
}
