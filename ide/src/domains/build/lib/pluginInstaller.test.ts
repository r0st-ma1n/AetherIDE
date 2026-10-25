import { createRequire } from 'node:module';
import * as fs from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

type InstallResult =
  | { ok: true; installedPath: string; replaced: boolean }
  | { ok: false; reason: 'busy' | 'error'; message: string };

const require = createRequire(import.meta.url);
const { defaultVst3InstallDir, installVst3Bundle } =
  require('../../../../electron/main/pluginInstaller.cjs') as {
    defaultVst3InstallDir: (
      platform?: string,
      env?: Record<string, string | undefined>
    ) => string | null;
    installVst3Bundle: (
      bundlePath: string,
      targetDir: string,
      options?: { fs?: typeof fs }
    ) => InstallResult;
  };

const tempDirs: string[] = [];

function tempDir(): string {
  const dir = fs.mkdtempSync(join(tmpdir(), 'aether-install-'));
  tempDirs.push(dir);
  return dir;
}

/** A minimal bundle: Gain.vst3/Contents/x86_64-win/Gain.vst3 with @p content. */
function makeBundle(root: string, content: string): string {
  const bundle = join(root, 'Gain.vst3');
  const binDir = join(bundle, 'Contents', 'x86_64-win');
  fs.mkdirSync(binDir, { recursive: true });
  fs.writeFileSync(join(binDir, 'Gain.vst3'), content);
  return bundle;
}

function installedBinary(targetDir: string): string {
  return fs.readFileSync(
    join(targetDir, 'Gain.vst3', 'Contents', 'x86_64-win', 'Gain.vst3'),
    'utf8'
  );
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('defaultVst3InstallDir', () => {
  it('is the per-user VST3 folder on Windows', () => {
    expect(
      defaultVst3InstallDir('win32', {
        LOCALAPPDATA: 'C:\\Users\\u\\AppData\\Local',
      })
    ).toBe(join('C:\\Users\\u\\AppData\\Local', 'Programs', 'Common', 'VST3'));
  });

  it('is null elsewhere', () => {
    expect(defaultVst3InstallDir('linux', { LOCALAPPDATA: '/x' })).toBeNull();
    expect(defaultVst3InstallDir('win32', {})).toBeNull();
  });
});

describe('installVst3Bundle', () => {
  it('copies the bundle, creating the target folder', () => {
    const bundle = makeBundle(tempDir(), 'v1');
    const target = join(tempDir(), 'Programs', 'Common', 'VST3');

    const result = installVst3Bundle(bundle, target);

    expect(result).toEqual({
      ok: true,
      installedPath: join(target, 'Gain.vst3'),
      replaced: false,
    });
    expect(installedBinary(target)).toBe('v1');
  });

  it('replaces an installed version as a whole', () => {
    const target = tempDir();
    installVst3Bundle(makeBundle(tempDir(), 'v1'), target);
    fs.writeFileSync(join(target, 'Gain.vst3', 'stale.txt'), 'old');

    const result = installVst3Bundle(makeBundle(tempDir(), 'v2'), target);

    expect(result).toMatchObject({ ok: true, replaced: true });
    expect(installedBinary(target)).toBe('v2');
    expect(fs.existsSync(join(target, 'Gain.vst3', 'stale.txt'))).toBe(false);
    expect(fs.readdirSync(target)).toEqual(['Gain.vst3']);
  });

  it('keeps the installed version when the plugin is in use', () => {
    const target = tempDir();
    installVst3Bundle(makeBundle(tempDir(), 'v1'), target);
    const dll = join(
      target,
      'Gain.vst3',
      'Contents',
      'x86_64-win',
      'Gain.vst3'
    );
    // Windows refuses to open a DLL a DAW has loaded for writing.
    const lockedFs = {
      ...fs,
      openSync: (file: fs.PathLike, flags: fs.OpenMode) => {
        if (file === dll && flags === 'r+') {
          throw Object.assign(new Error('EBUSY: resource busy or locked'), {
            code: 'EBUSY',
          });
        }
        return fs.openSync(file, flags);
      },
    } as typeof fs;

    const result = installVst3Bundle(makeBundle(tempDir(), 'v2'), target, {
      fs: lockedFs,
    });

    expect(result).toMatchObject({ ok: false, reason: 'busy' });
    expect(installedBinary(target)).toBe('v1');
    expect(fs.readdirSync(target)).toEqual(['Gain.vst3']);
  });

  it('fails when the bundle has not been built', () => {
    const result = installVst3Bundle(
      join(tempDir(), 'Missing.vst3'),
      tempDir()
    );
    expect(result).toMatchObject({ ok: false, reason: 'error' });
  });
});
