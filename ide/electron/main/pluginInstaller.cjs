const fs = require('fs');
const path = require('path');

/**
 * @typedef {{ ok: true, installedPath: string, replaced: boolean }
 *   | { ok: false, reason: 'busy' | 'error', message: string }} InstallResult
 */

/**
 * @typedef {Pick<typeof fs,
 *   'closeSync' | 'cpSync' | 'existsSync' | 'mkdirSync' | 'openSync' | 'readdirSync' | 'renameSync' | 'rmSync'>} InstallerFs
 */

/**
 * Per-user VST3 folder on Windows; installing there needs no administrator rights.
 * Null on other platforms: v1 installs on Windows only.
 * @param {NodeJS.Platform} [platform]
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {string | null}
 */
function defaultVst3InstallDir(platform = process.platform, env = process.env) {
  if (platform !== 'win32' || !env.LOCALAPPDATA) {
    return null;
  }
  return path.join(env.LOCALAPPDATA, 'Programs', 'Common', 'VST3');
}

/**
 * First file of an installed bundle that another process holds open, or null.
 * Windows lets a loaded DLL (and its folder) be renamed, so a rename does not reveal a
 * plugin open in a DAW; opening the file for writing does (EBUSY).
 * @param {string} bundleDir
 * @param {InstallerFs} fsx
 * @returns {string | null}
 */
function findBusyFile(bundleDir, fsx) {
  for (const entry of fsx.readdirSync(bundleDir, { withFileTypes: true })) {
    const entryPath = path.join(bundleDir, entry.name);
    if (entry.isDirectory()) {
      const busy = findBusyFile(entryPath, fsx);
      if (busy) {
        return busy;
      }
      continue;
    }
    try {
      fsx.closeSync(fsx.openSync(entryPath, 'r+'));
    } catch (error) {
      // Other errors (e.g. a read-only file) do not mean the plugin is loaded.
      if (/** @type {NodeJS.ErrnoException} */ (error).code === 'EBUSY') {
        return entryPath;
      }
    }
  }
  return null;
}

/**
 * @param {unknown} error
 */
function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Copies a `.vst3` bundle into @p targetDir, replacing an installed version as a whole.
 * An installed version open in a DAW is left alone (`reason: 'busy'`). The new bundle is
 * copied next to the target first and then swapped in by renames, so a failed install
 * never leaves a half-copied plugin.
 * @param {string} bundlePath
 * @param {string} targetDir
 * @param {{ fs?: InstallerFs }} [options]
 * @returns {InstallResult}
 */
function installVst3Bundle(bundlePath, targetDir, options = {}) {
  const fsx = options.fs ?? fs;
  const name = path.basename(bundlePath);
  const installedPath = path.join(targetDir, name);
  const staging = `${installedPath}.installing`;
  const previous = `${installedPath}.previous`;

  if (!name.endsWith('.vst3') || !fsx.existsSync(bundlePath)) {
    return {
      ok: false,
      reason: 'error',
      message: `Plugin bundle not found: ${bundlePath}. Build the project first.`,
    };
  }

  const replaced = fsx.existsSync(installedPath);
  if (replaced && findBusyFile(installedPath, fsx)) {
    return {
      ok: false,
      reason: 'busy',
      message: `${name} is in use, probably loaded in a DAW. Close the DAW (or remove the plugin and rescan) and install again.`,
    };
  }

  try {
    fsx.mkdirSync(targetDir, { recursive: true });
    fsx.rmSync(staging, { recursive: true, force: true });
    fsx.rmSync(previous, { recursive: true, force: true });
    fsx.cpSync(bundlePath, staging, { recursive: true });
    if (replaced) {
      fsx.renameSync(installedPath, previous);
    }
    try {
      fsx.renameSync(staging, installedPath);
    } catch (error) {
      if (replaced) {
        fsx.renameSync(previous, installedPath);
      }
      throw error;
    }
  } catch (error) {
    fsx.rmSync(staging, { recursive: true, force: true });
    return {
      ok: false,
      reason: 'error',
      message: `Could not install ${name} to ${targetDir}: ${errorMessage(error)}`,
    };
  }

  try {
    fsx.rmSync(previous, { recursive: true, force: true });
  } catch {
    // The new version is in place; the leftover is removed by the next install.
  }
  return { ok: true, installedPath, replaced };
}

module.exports = {
  defaultVst3InstallDir,
  installVst3Bundle,
};
