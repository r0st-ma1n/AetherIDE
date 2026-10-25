import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

type Probe = (
  command: string,
  args: string[]
) => Promise<{ ok: boolean; stdout: string }>;

const require = createRequire(import.meta.url);
const { detectToolchain, isAtLeast, parseCMakeVersion } =
  require('../../../../electron/main/toolchain.cjs') as {
    detectToolchain: (options: {
      platform?: string;
      probe?: Probe;
      vswherePath?: string;
      fileExists?: (path: string) => boolean;
    }) => Promise<
      | { ok: true; generator: string | null; description: string }
      | { ok: false; message: string }
    >;
    isAtLeast: (version: number[], minimum: number[]) => boolean;
    parseCMakeVersion: (text: string) => number[] | null;
  };

/** Probe that knows a fixed set of commands; `vswhere` prints @p vsPath. */
function fakeProbe(available: Record<string, string>): Probe {
  return async (command) =>
    command in available
      ? { ok: true, stdout: available[command]! }
      : { ok: false, stdout: '' };
}

const CMAKE = 'cmake version 3.28.1\n';

describe('parseCMakeVersion / isAtLeast', () => {
  it('reads the version line', () => {
    expect(parseCMakeVersion('cmake version 4.3.2\n\nCMake suite')).toEqual([
      4, 3, 2,
    ]);
    expect(parseCMakeVersion('garbage')).toBeNull();
  });

  it('compares versions', () => {
    expect(isAtLeast([3, 22, 0], [3, 22])).toBe(true);
    expect(isAtLeast([3, 21, 9], [3, 22])).toBe(false);
    expect(isAtLeast([4, 0, 0], [3, 22])).toBe(true);
  });
});

describe('detectToolchain', () => {
  it('asks for CMake when it is missing', async () => {
    const result = await detectToolchain({ probe: fakeProbe({}) });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/CMake was not found/);
  });

  it('refuses CMake older than 3.22', async () => {
    const result = await detectToolchain({
      platform: 'linux',
      probe: fakeProbe({ cmake: 'cmake version 3.16.3', 'c++': '' }),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/3\.16\.3 is too old/);
  });

  it('prefers Visual Studio with the C++ workload on Windows', async () => {
    const result = await detectToolchain({
      platform: 'win32',
      vswherePath: 'vswhere.exe',
      fileExists: () => true,
      probe: fakeProbe({
        cmake: CMAKE,
        'vswhere.exe': 'C:\\VS\\2022\\Community\r\n',
        ninja: '1.11',
        'g++': '',
      }),
    });
    expect(result).toEqual({
      ok: true,
      generator: null,
      description: 'Visual Studio (MSVC)',
    });
  });

  it('falls back to Ninja with MinGW g++ on Windows', async () => {
    const result = await detectToolchain({
      platform: 'win32',
      vswherePath: 'vswhere.exe',
      fileExists: () => true,
      probe: fakeProbe({
        cmake: CMAKE,
        'vswhere.exe': '',
        ninja: '1.11',
        'g++': '',
      }),
    });
    expect(result).toEqual({
      ok: true,
      generator: 'Ninja',
      description: 'Ninja + g++',
    });
  });

  it('explains what to install when Windows has no toolchain', async () => {
    const result = await detectToolchain({
      platform: 'win32',
      fileExists: () => false,
      probe: fakeProbe({ cmake: CMAKE, 'g++': '' }),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/Visual Studio 2022/);
      expect(result.message).toMatch(/Ninja/);
    }
  });

  it('uses the system compiler elsewhere', async () => {
    expect(
      await detectToolchain({
        platform: 'linux',
        probe: fakeProbe({ cmake: CMAKE, 'c++': '' }),
      })
    ).toEqual({
      ok: true,
      generator: null,
      description: 'system C++ compiler',
    });
    const missing = await detectToolchain({
      platform: 'linux',
      probe: fakeProbe({ cmake: CMAKE }),
    });
    expect(missing.ok).toBe(false);
  });
});
