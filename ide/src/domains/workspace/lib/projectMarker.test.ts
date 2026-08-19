import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  MISSING_MARKER_MESSAGE,
  findAetherMarkerName,
  isValidAetherProjectDocument,
} = require('../../../../electron/main/projectMarker.cjs') as {
  MISSING_MARKER_MESSAGE: string;
  findAetherMarkerName: (fileNames: string[]) => string | null;
  isValidAetherProjectDocument: (
    data: unknown
  ) => { valid: true } | { valid: false; reason: string };
};

describe('findAetherMarkerName', () => {
  it('returns null when no .aether file is present', () => {
    expect(
      findAetherMarkerName(['GainPlugin.ui', 'GainPlugin.cpp'])
    ).toBeNull();
  });

  it('finds a top-level .aether marker', () => {
    expect(
      findAetherMarkerName(['GainPlugin.cpp', 'GainPlugin.aether', 'README.md'])
    ).toBe('GainPlugin.aether');
  });

  it('is case-insensitive on the extension', () => {
    expect(findAetherMarkerName(['Demo.AETHER'])).toBe('Demo.AETHER');
  });

  it('picks a stable marker when several .aether files exist', () => {
    expect(findAetherMarkerName(['z.aether', 'a.aether', 'm.aether'])).toBe(
      'a.aether'
    );
  });
});

describe('isValidAetherProjectDocument', () => {
  it('accepts a minimal valid document', () => {
    expect(
      isValidAetherProjectDocument({ version: 1, components: [] })
    ).toEqual({ valid: true });
  });

  it('accepts legacy documents without version (renderer migrates)', () => {
    expect(isValidAetherProjectDocument({ components: [] })).toEqual({
      valid: true,
    });
  });

  it('rejects missing components', () => {
    const result = isValidAetherProjectDocument({ version: 1 });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain('components');
    }
  });

  it('rejects unsupported future schema versions', () => {
    const result = isValidAetherProjectDocument({
      version: 99,
      components: [],
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toMatch(/not supported/);
    }
  });
});

describe('MISSING_MARKER_MESSAGE', () => {
  it('explains that a .aether file is required', () => {
    expect(MISSING_MARKER_MESSAGE).toContain('.aether');
  });
});
