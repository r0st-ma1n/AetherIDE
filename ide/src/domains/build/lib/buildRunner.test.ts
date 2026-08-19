import { createRequire } from 'node:module';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { buildIsConfigured, getBuildDir, projectHasCMakeLists } =
  require('../../../../electron/main/buildRunner.cjs') as {
    buildIsConfigured: (buildDir: string) => boolean;
    getBuildDir: (projectRoot: string) => string;
    projectHasCMakeLists: (projectRoot: string) => boolean;
  };

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('buildRunner helpers', () => {
  it('detects CMakeLists and configured build dirs', () => {
    const root = mkdtempSync(join(tmpdir(), 'aether-build-'));
    tempDirs.push(root);

    expect(projectHasCMakeLists(root)).toBe(false);
    writeFileSync(
      join(root, 'CMakeLists.txt'),
      'cmake_minimum_required(VERSION 3.15)\n'
    );
    expect(projectHasCMakeLists(root)).toBe(true);

    const buildDir = getBuildDir(root);
    expect(buildIsConfigured(buildDir)).toBe(false);
    mkdirSync(buildDir);
    writeFileSync(join(buildDir, 'CMakeCache.txt'), '');
    expect(buildIsConfigured(buildDir)).toBe(true);
  });
});
