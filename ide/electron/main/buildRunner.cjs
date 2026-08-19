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
   * @returns {Promise<{ status: BuildStatus, exitCode: number | null }>}
   */
  async run(projectRoot, callbacks) {
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
        callbacks.onLog(
          `Configuring: cmake -S "${projectRoot}" -B "${buildDir}"\n`
        );
        const configureCode = await this.spawnCommand(
          'cmake',
          ['-S', projectRoot, '-B', buildDir],
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
  getBuildDir,
  projectHasCMakeLists,
};
