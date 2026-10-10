const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

/** Oldest CMake the project template supports (cmake_minimum_required). */
const MIN_CMAKE_VERSION = [3, 22];

/**
 * @typedef {(command: string, args: string[]) => Promise<{ ok: boolean, stdout: string }>} Probe
 * Runs a command and reports whether it started and exited with 0.
 */

/**
 * @typedef {{ ok: true, generator: string | null, description: string }
 *   | { ok: false, message: string }} ToolchainResult
 * `generator` is passed to the first configure as `-G`; null keeps CMake's default.
 */

/** @type {Probe} */
function probeCommand(command, args) {
  return new Promise((resolve) => {
    execFile(
      command,
      args,
      { timeout: 15000, windowsHide: true },
      (error, stdout) => {
        resolve({ ok: !error, stdout: String(stdout ?? '') });
      }
    );
  });
}

/**
 * @param {string} text output of `cmake --version`
 * @returns {number[] | null}
 */
function parseCMakeVersion(text) {
  const match = /cmake version (\d+)\.(\d+)(?:\.(\d+))?/i.exec(text);
  return match
    ? [Number(match[1]), Number(match[2]), Number(match[3] ?? 0)]
    : null;
}

/**
 * @param {number[]} version
 * @param {number[]} minimum
 */
function isAtLeast(version, minimum) {
  for (let i = 0; i < minimum.length; i += 1) {
    const a = version[i] ?? 0;
    if (a !== minimum[i]) {
      return a > minimum[i];
    }
  }
  return true;
}

/** vswhere.exe ships with every Visual Studio 2017+ installer. */
function defaultVswherePath() {
  const programFiles =
    process.env['ProgramFiles(x86)'] ?? 'C:\\Program Files (x86)';
  return path.join(
    programFiles,
    'Microsoft Visual Studio',
    'Installer',
    'vswhere.exe'
  );
}

/**
 * Checks that CMake and a C++ compiler are available and picks the CMake generator for a
 * new build directory.
 *
 * Windows: Visual Studio with the C++ workload (CMake's default generator), otherwise
 * Ninja with g++ or clang++ (MinGW-w64, LLVM) in PATH. Elsewhere: CMake's default
 * generator with the system c++.
 *
 * @param {{ platform?: string, probe?: Probe, vswherePath?: string, fileExists?: (p: string) => boolean }} [options]
 * @returns {Promise<ToolchainResult>}
 */
async function detectToolchain(options = {}) {
  const platform = options.platform ?? process.platform;
  const probe = options.probe ?? probeCommand;
  const fileExists = options.fileExists ?? fs.existsSync;

  const cmake = await probe('cmake', ['--version']);
  if (!cmake.ok) {
    return {
      ok: false,
      message:
        'CMake was not found in PATH. Install CMake 3.22 or newer (https://cmake.org/download/), ' +
        'make sure it is in PATH and restart AetherIDE.',
    };
  }
  const version = parseCMakeVersion(cmake.stdout);
  if (version && !isAtLeast(version, MIN_CMAKE_VERSION)) {
    return {
      ok: false,
      message: `CMake ${version.join('.')} is too old: AetherIDE projects need CMake 3.22 or newer.`,
    };
  }

  if (platform === 'win32') {
    const vswhere = options.vswherePath ?? defaultVswherePath();
    if (fileExists(vswhere)) {
      const vs = await probe(vswhere, [
        '-latest',
        '-products',
        '*',
        '-requires',
        'Microsoft.VisualStudio.Component.VC.Tools.x86.x64',
        '-property',
        'installationPath',
      ]);
      if (vs.ok && vs.stdout.trim()) {
        return {
          ok: true,
          generator: null,
          description: 'Visual Studio (MSVC)',
        };
      }
    }
    const ninja = await probe('ninja', ['--version']);
    if (ninja.ok) {
      for (const compiler of ['g++', 'clang++']) {
        if ((await probe(compiler, ['--version'])).ok) {
          return {
            ok: true,
            generator: 'Ninja',
            description: `Ninja + ${compiler}`,
          };
        }
      }
    }
    return {
      ok: false,
      message:
        'No C++ toolchain found. Install Visual Studio 2022 with the "Desktop development with ' +
        'C++" workload, or put MinGW-w64 (g++) and Ninja in PATH, then restart AetherIDE.',
    };
  }

  if ((await probe('c++', ['--version'])).ok) {
    return { ok: true, generator: null, description: 'system C++ compiler' };
  }
  return {
    ok: false,
    message:
      'No C++ compiler (c++) found. Install GCC or Clang, then restart AetherIDE.',
  };
}

module.exports = {
  MIN_CMAKE_VERSION,
  detectToolchain,
  isAtLeast,
  parseCMakeVersion,
};
