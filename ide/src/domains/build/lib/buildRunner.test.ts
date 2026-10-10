import { createRequire } from 'node:module';
import {
  existsSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
  mkdirSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const {
  buildIsConfigured,
  configureArgs,
  findFrameworkSourceDir,
  getBuildDir,
  projectHasCMakeLists,
} = require('../../../../electron/main/buildRunner.cjs') as {
  buildIsConfigured: (buildDir: string) => boolean;
  configureArgs: (
    projectRoot: string,
    buildDir: string,
    frameworkSourceDir: string | null | undefined
  ) => string[];
  findFrameworkSourceDir: (startDir: string) => string | null;
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

describe('framework source for project builds', () => {
  it('passes the IDE checkout to FetchContent when there is one', () => {
    expect(configureArgs('/p', '/p/build', '/repo')).toEqual([
      '-S',
      '/p',
      '-B',
      '/p/build',
      '-DFETCHCONTENT_SOURCE_DIR_AETHER=/repo',
    ]);
    expect(configureArgs('/p', '/p/build', null)).toEqual([
      '-S',
      '/p',
      '-B',
      '/p/build',
    ]);
  });

  it('finds the repository root above a directory', () => {
    const root = mkdtempSync(join(tmpdir(), 'aether-repo-'));
    tempDirs.push(root);
    const deep = join(root, 'ide', 'electron', 'main');
    mkdirSync(deep, { recursive: true });
    expect(findFrameworkSourceDir(deep)).toBeNull();

    mkdirSync(join(root, 'framework'));
    writeFileSync(join(root, 'framework', 'CMakeLists.txt'), '');
    expect(findFrameworkSourceDir(deep)).toBe(root);
  });

  it('finds this repository from the Electron main directory', () => {
    const repo = findFrameworkSourceDir(
      join(__dirname, '../../../../electron/main')
    );
    expect(repo).not.toBeNull();
    expect(existsSync(join(repo!, 'framework', 'CMakeLists.txt'))).toBe(true);
  });
});
