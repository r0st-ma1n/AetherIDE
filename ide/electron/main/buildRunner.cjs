const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * @typedef {'idle' | 'building' | 'success' | 'failed' | 'cancelled'} BuildStatus
 */

/**
 * @typedef {{
 *   onLog: (chunk: string) => void,
 *   onStatus: (payload: { status: BuildStatus, exitCode: number | null, message?: string }) => void,
 * }} BuildRunnerCallbacks
 */

/**
 * @param {string} projectRoot
 */
function getBuildDir(projectRoot) {
  return path.join(projectRoot, 'build');
}

/**
 * @param {string} projectRoot
 */
function projectHasCMakeLists(projectRoot) {
  return fs.existsSync(path.join(projectRoot, 'CMakeLists.txt'));
}

/**
 * @param {string} buildDir
 */
function buildIsConfigured(buildDir) {
  return (
    fs.existsSync(path.join(buildDir, 'CMakeCache.txt')) ||
    fs.existsSync(path.join(buildDir, 'build.ninja')) ||
    fs.existsSync(path.join(buildDir, 'Makefile'))
  );
}

/**
 * Root of the AetherIDE checkout the IDE runs from: the first directory at or above
 * @p startDir that contains framework/CMakeLists.txt. Null for a packaged IDE.
 * @param {string} startDir
 * @returns {string | null}
 */
function findFrameworkSourceDir(startDir) {
  let dir = path.resolve(startDir);
  for (;;) {
    if (fs.existsSync(path.join(dir, 'framework', 'CMakeLists.txt'))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      return null;
    }
    dir = parent;
  }
}

/**
 * Arguments of the configure step. With @p frameworkSourceDir, the project's
 * FetchContent uses that checkout instead of downloading the framework.
 * @param {string} projectRoot
 * @param {string} buildDir
 * @param {string | null | undefined} frameworkSourceDir
 * @returns {string[]}
 */
function configureArgs(projectRoot, buildDir, frameworkSourceDir) {
  const args = ['-S', projectRoot, '-B', buildDir];
  if (frameworkSourceDir) {
    args.push(`-DFETCHCONTENT_SOURCE_DIR_AETHER=${frameworkSourceDir}`);
  }
  return args;
}

class BuildRunner {
  constructor() {
    /** @type {import('child_process').ChildProcess | null} */
    this.child = null;
    /** @type {boolean} */
    this.stopping = false;
  }

  isBusy() {
    return this.child != null;
  }

  /**
   * @param {string} projectRoot
   * @param {BuildRunnerCallbacks} callbacks
   * @param {{ frameworkSourceDir?: string | null }} [options]
   * @returns {Promise<{ status: BuildStatus, exitCode: number | null }>}
   */
  async run(projectRoot, callbacks, options = {}) {
    if (this.child) {
      const message = 'A build is already running.';
      callbacks.onStatus({ status: 'failed', exitCode: null, message });
      return { status: 'failed', exitCode: null };
    }

    if (!projectRoot) {
      const message = 'No project is open.';
      callbacks.onStatus({ status: 'failed', exitCode: null, message });
      return { status: 'failed', exitCode: null };
    }

    if (!projectHasCMakeLists(projectRoot)) {
      const message =
        'No CMakeLists.txt found in the project root. Add one or create a project from the New Project wizard.';
      callbacks.onLog(`${message}\n`);
      callbacks.onStatus({ status: 'failed', exitCode: null, message });
      return { status: 'failed', exitCode: null };
    }

    const buildDir = getBuildDir(projectRoot);
    this.stopping = false;
    callbacks.onStatus({ status: 'building', exitCode: null });

    try {
      if (!buildIsConfigured(buildDir)) {
        const args = configureArgs(
          projectRoot,
          buildDir,
          options.frameworkSourceDir
        );
        callbacks.onLog(
          `Configuring: cmake ${args.map((arg) => `"${arg}"`).join(' ')}\n`
        );
        const configureCode = await this.spawnCommand(
          'cmake',
          args,
          projectRoot,
          callbacks
        );
        if (this.stopping) {
          callbacks.onStatus({ status: 'cancelled', exitCode: null });
          return { status: 'cancelled', exitCode: null };
        }
        if (configureCode !== 0) {
          callbacks.onStatus({
            status: 'failed',
            exitCode: configureCode,
            message: 'CMake configure failed.',
          });
          return { status: 'failed', exitCode: configureCode };
        }
      }

      callbacks.onLog(`Building: cmake --build "${buildDir}"\n`);
      const buildCode = await this.spawnCommand(
        'cmake',
        ['--build', buildDir],
        projectRoot,
        callbacks
      );

      if (this.stopping) {
        callbacks.onStatus({ status: 'cancelled', exitCode: null });
        return { status: 'cancelled', exitCode: null };
      }

      if (buildCode === 0) {
        callbacks.onStatus({
          status: 'success',
          exitCode: 0,
          message: 'Build succeeded.',
        });
        return { status: 'success', exitCode: 0 };
      }

      callbacks.onStatus({
        status: 'failed',
        exitCode: buildCode,
        message: 'Build failed.',
      });
      return { status: 'failed', exitCode: buildCode };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to start cmake.';
      callbacks.onLog(`${message}\n`);
      callbacks.onStatus({ status: 'failed', exitCode: null, message });
      return { status: 'failed', exitCode: null };
    } finally {
      this.child = null;
      this.stopping = false;
    }
  }

  /**
   * @returns {boolean}
   */
  stop() {
    if (!this.child) {
      return false;
    }
    this.stopping = true;
    this.child.kill();
    return true;
  }

  /**
   * @param {string} command
   * @param {string[]} args
   * @param {string} cwd
   * @param {BuildRunnerCallbacks} callbacks
   * @returns {Promise<number>}
   */
  spawnCommand(command, args, cwd, callbacks) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd,
        shell: process.platform === 'win32',
        env: process.env,
      });
      this.child = child;

      child.stdout?.on('data', (chunk) => {
        callbacks.onLog(chunk.toString());
      });
      child.stderr?.on('data', (chunk) => {
        callbacks.onLog(chunk.toString());
      });
      child.on('error', (error) => {
        this.child = null;
        reject(error);
      });
      child.on('close', (code) => {
        this.child = null;
        resolve(code ?? 1);
      });
    });
  }
}

module.exports = {
  BuildRunner,
  buildIsConfigured,
  configureArgs,
  findFrameworkSourceDir,
  getBuildDir,
  projectHasCMakeLists,
};
