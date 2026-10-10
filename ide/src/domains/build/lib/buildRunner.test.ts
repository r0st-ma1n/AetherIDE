import { execFileSync } from 'node:child_process';
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

type BuildConfig = 'Debug' | 'Release';
type ToolchainResult =
  | { ok: true; generator: string | null; description: string }
  | { ok: false; message: string };
interface BuildResult {
  status: string;
  exitCode: number | null;
  message?: string;
  artifacts?: string[];
}

const require = createRequire(import.meta.url);
const {
  BuildRunner,
  buildArgs,
  buildIsConfigured,
  configureArgs,
  findFrameworkSourceDir,
  findVst3Bundles,
  getBuildDir,
  projectHasCMakeLists,
} = require('../../../../electron/main/buildRunner.cjs') as {
  BuildRunner: new () => {
    run: (
      projectRoot: string,
      callbacks: {
        onLog: (chunk: string) => void;
        onStatus: (payload: BuildResult) => void;
      },
      options?: {
        frameworkSourceDir?: string | null;
        config?: BuildConfig;
        detectToolchain?: () => Promise<ToolchainResult>;
      }
    ) => Promise<BuildResult>;
  };
  buildArgs: (buildDir: string, config?: BuildConfig) => string[];
  buildIsConfigured: (buildDir: string) => boolean;
  configureArgs: (
    projectRoot: string,
    buildDir: string,
    options?: {
      config?: BuildConfig;
      generator?: string | null;
      frameworkSourceDir?: string | null;
    }
  ) => string[];
  findFrameworkSourceDir: (startDir: string) => string | null;
  findVst3Bundles: (buildDir: string) => string[];
  getBuildDir: (projectRoot: string) => string;
  projectHasCMakeLists: (projectRoot: string) => boolean;
};

const tempDirs: string[] = [];

function tempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function hasTool(command: string): boolean {
  try {
    execFileSync(command, ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// A generator that works for a project without languages: CMake's Windows default (NMake or
// Visual Studio) may be missing, so Windows uses Ninja.
const TEST_GENERATOR = process.platform === 'win32' ? 'Ninja' : null;
const canRunCMake =
  hasTool('cmake') && (TEST_GENERATOR === null || hasTool('ninja'));

describe('buildRunner helpers', () => {
  it('detects CMakeLists and configured build dirs', () => {
    const root = tempDir('aether-build-');

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

  it('configures with the build type, the generator and the framework checkout', () => {
    expect(
      configureArgs('/p', '/p/build', {
        config: 'Debug',
        generator: 'Ninja',
        frameworkSourceDir: '/repo',
      })
    ).toEqual([
      '-S',
      '/p',
      '-B',
      '/p/build',
      '-G',
      'Ninja',
      '-DCMAKE_BUILD_TYPE=Debug',
      '-DFETCHCONTENT_SOURCE_DIR_AETHER=/repo',
    ]);
    expect(configureArgs('/p', '/p/build')).toEqual([
      '-S',
      '/p',
      '-B',
      '/p/build',
      '-DCMAKE_BUILD_TYPE=Release',
    ]);
  });

  it('passes the configuration to multi-config builds', () => {
    expect(buildArgs('/p/build', 'Debug')).toEqual([
      '--build',
      '/p/build',
      '--config',
      'Debug',
    ]);
  });

  it('finds the VST3 bundles of a build', () => {
    const buildDir = tempDir('aether-out-');
    expect(findVst3Bundles(buildDir)).toEqual([]);
    mkdirSync(join(buildDir, 'VST3', 'Gain.vst3'), { recursive: true });
    mkdirSync(join(buildDir, 'VST3', 'notes'), { recursive: true });
    writeFileSync(join(buildDir, 'VST3', 'stray.vst3'), '');
    expect(findVst3Bundles(buildDir)).toEqual([
      join(buildDir, 'VST3', 'Gain.vst3'),
    ]);
  });
});

describe('framework source for project builds', () => {
  it('finds the repository root above a directory', () => {
    const root = tempDir('aether-repo-');
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

describe('BuildRunner.run', () => {
  function collect() {
    const log: string[] = [];
    const statuses: BuildResult[] = [];
    return {
      log,
      statuses,
      callbacks: {
        onLog: (chunk: string) => log.push(chunk),
        onStatus: (payload: BuildResult) => statuses.push(payload),
      },
    };
  }

  it('stops with the toolchain message before running CMake', async () => {
    const root = tempDir('aether-run-');
    writeFileSync(join(root, 'CMakeLists.txt'), 'project(t NONE)\n');
    const { log, statuses, callbacks } = collect();

    const result = await new BuildRunner().run(root, callbacks, {
      detectToolchain: async () => ({ ok: false, message: 'No C++ toolchain' }),
    });

    expect(result).toEqual({
      status: 'failed',
      exitCode: null,
      message: 'No C++ toolchain',
    });
    expect(log.join('')).toContain('No C++ toolchain');
    expect(log.join('')).not.toContain('Configuring');
    expect(statuses.at(-1)?.status).toBe('failed');
    expect(existsSync(getBuildDir(root))).toBe(false);
  });

  it.skipIf(!canRunCMake)(
    'configures and builds a project in a folder with spaces and reports its bundles',
    async () => {
      const root = join(tempDir('aether-run-'), 'My Plugin');
      mkdirSync(root);
      // No compiler needed: the "plugin" is a directory created at configure time.
      writeFileSync(
        join(root, 'CMakeLists.txt'),
        [
          'cmake_minimum_required(VERSION 3.22)',
          'project(t NONE)',
          'file(MAKE_DIRECTORY "${CMAKE_BINARY_DIR}/VST3/My Plugin.vst3")',
          'message(STATUS "build type: ${CMAKE_BUILD_TYPE}")',
          '',
        ].join('\n')
      );
      const { log, callbacks } = collect();

      const result = await new BuildRunner().run(root, callbacks, {
        config: 'Debug',
        detectToolchain: async () => ({
          ok: true,
          generator: TEST_GENERATOR,
          description: 'test toolchain',
        }),
      });

      expect(result.status, log.join('')).toBe('success');
      const bundle = join(getBuildDir(root), 'VST3', 'My Plugin.vst3');
      expect(result.artifacts).toEqual([bundle]);
      const output = log.join('');
      expect(output).toContain('Toolchain: test toolchain');
      expect(output).toContain('build type: Debug');
      expect(output).toContain(`VST3 plugin: ${bundle}`);
    },
    120_000
  );
});
