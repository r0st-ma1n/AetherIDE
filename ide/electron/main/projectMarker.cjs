/**
 * Pure helpers for detecting a valid Aether project directory.
 * Kept free of Electron APIs so Vitest can import this module directly.
 */

/**
 * @param {string[]} fileNames Top-level file names in a directory.
 * @returns {string | null} Preferred .aether marker file name, if any.
 */
function findAetherMarkerName(fileNames) {
  if (!Array.isArray(fileNames)) {
    return null;
  }

  const markers = fileNames
    .filter(
      (name) =>
        typeof name === 'string' && name.toLowerCase().endsWith('.aether')
    )
    .sort((left, right) => left.localeCompare(right));

  return markers[0] ?? null;
}

/**
 * Structural check for an .aether document (full AJV + migrate live in the renderer).
 * Accepts legacy files without version (renderer migrates them) and rejects
 * versions newer than this IDE understands.
 * @param {unknown} data
 * @returns {{ valid: true } | { valid: false, reason: string }}
 */
function isValidAetherProjectDocument(data) {
  if (data == null || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, reason: '.aether file must contain a JSON object.' };
  }

  const project = /** @type {Record<string, unknown>} */ (data);
  /** Keep in sync with CURRENT_AETHER_SCHEMA_VERSION in migrateAetherProject.ts */
  const CURRENT_AETHER_SCHEMA_VERSION = 1;

  if (project.version !== undefined && project.version !== null) {
    if (
      typeof project.version !== 'number' ||
      !Number.isFinite(project.version)
    ) {
      return {
        valid: false,
        reason: '.aether file has a non-numeric "version" field.',
      };
    }

    if (project.version > CURRENT_AETHER_SCHEMA_VERSION) {
      return {
        valid: false,
        reason: `.aether schema version ${project.version} is not supported (max ${CURRENT_AETHER_SCHEMA_VERSION}).`,
      };
    }
  }

  if (!Array.isArray(project.components)) {
    return {
      valid: false,
      reason: '.aether file is missing a "components" array.',
    };
  }

  return { valid: true };
}

const MISSING_MARKER_MESSAGE =
  'Not an Aether project: selected folder has no .aether file.';

module.exports = {
  MISSING_MARKER_MESSAGE,
  findAetherMarkerName,
  isValidAetherProjectDocument,
};
