const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { detectToolchain } = require('./toolchain.cjs');

/**
 * @typedef {'idle' | 'building' | 'success' | 'failed' | 'cancelled'} BuildStatus
 */

/** @typedef {'Debug' | 'Release'} BuildConfig */

/**
 * @typedef {{
 *   status: BuildStatus,
 *   exitCode: number | null,
 *   message?: string,
 *   artifacts?: string[],
 * }} BuildResult
 * `artifacts`: absolute paths of the built plugin bundles (`.vst3`).
 */

/**
 * @typedef {{
 *   onLog: (chunk: string) => void,
 *   onStatus: (payload: BuildResult) => void,
 * }} BuildRunnerCallbacks
 */

const BUILD_CONFIGS = /** @type {const} */ (['Debug', 'Release']);

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
 * Arguments of the configure step, which runs before every build: cheap when nothing
 * changed, and it applies a new configuration to single-config generators (Ninja,
 * Makefiles). `generator` is used only for a new build directory: CMake keeps the
 * generator of an existing one. With `frameworkSourceDir`, the project's FetchContent uses
 * that checkout instead of downloading the framework.
 * @param {string} projectRoot
 * @param {string} buildDir
 * @param {{ config?: BuildConfig, generator?: string | null, frameworkSourceDir?: string | null }} [options]
 * @returns {string[]}
 */
function configureArgs(projectRoot, buildDir, options = {}) {
  const args = ['-S', projectRoot, '-B', buildDir];
  if (options.generator) {
    args.push('-G', options.generator);
  }
  args.push(`-DCMAKE_BUILD_TYPE=${options.config ?? 'Release'}`);
  if (options.frameworkSourceDir) {
    args.push(`-DFETCHCONTENT_SOURCE_DIR_AETHER=${options.frameworkSourceDir}`);
  }
  return args;
}

/**
 * Arguments of the build step; `--config` selects the configuration of multi-config
 * generators (Visual Studio) and is ignored by the others.
 * @param {string} buildDir
 * @param {BuildConfig} [config]
 * @returns {string[]}
 */
function buildArgs(buildDir, config = 'Release') {
  return ['--build', buildDir, '--config', config];
}

/**
 * Plugin bundles produced by aether_add_plugin(... FORMATS VST3): <build>/VST3/*.vst3.
 * @param {string} buildDir
 * @returns {string[]}
 */
function findVst3Bundles(buildDir) {
  const dir = path.join(buildDir, 'VST3');
  if (!fs.existsSync(dir)) {
    return [];
  }
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.endsWith('.vst3'))
    .map((entry) => path.join(dir, entry.name))
    .sort();
}

/**
 * @param {string} arg
 */
function quoteForLog(arg) {
  return /\s/.test(arg) ? `"${arg}"` : arg;
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
   * @param {{
   *   frameworkSourceDir?: string | null,
   *   config?: BuildConfig,
   *   detectToolchain?: typeof detectToolchain,
   * }} [options]
   * @returns {Promise<BuildResult>}
   */
  async run(projectRoot, callbacks, options = {}) {
    /** @param {BuildResult} result */
    const finish = (result) => {
      callbacks.onStatus(result);
      return result;
    };

    if (this.child) {
      return finish({
        status: 'failed',
        exitCode: null,
        message: 'A build is already running.',
      });
    }

    if (!projectRoot) {
      return finish({
        status: 'failed',
        exitCode: null,
        message: 'No project is open.',
      });
    }

    if (!projectHasCMakeLists(projectRoot)) {
      const message =
        'No CMakeLists.txt found in the project root. Add one or create a project from the New Project wizard.';
      callbacks.onLog(`${message}\n`);
      return finish({ status: 'failed', exitCode: null, message });
    }

    const config = BUILD_CONFIGS.includes(options.config ?? 'Release')
      ? (options.config ?? 'Release')
      : 'Release';
    const buildDir = getBuildDir(projectRoot);
    this.stopping = false;
    callbacks.onStatus({ status: 'building', exitCode: null });

    try {
      const toolchain = await (options.detectToolchain ?? detectToolchain)();
      if (!toolchain.ok) {
        callbacks.onLog(`${toolchain.message}\n`);
        return finish({
          status: 'failed',
          exitCode: null,
          message: toolchain.message,
        });
      }

      const configured = buildIsConfigured(buildDir);
      if (!configured) {
        callbacks.onLog(`Toolchain: ${toolchain.description}\n`);
      }
      if (!options.frameworkSourceDir) {
        callbacks.onLog(
          'No local Aether framework found: CMake downloads the version the project pins.\n'
        );
      }

      const args = configureArgs(projectRoot, buildDir, {
        config,
        generator: configured ? null : toolchain.generator,
        frameworkSourceDir: options.frameworkSourceDir,
      });
      callbacks.onLog(
        `Configuring: cmake ${args.map(quoteForLog).join(' ')}\n`
      );
      const configureCode = await this.spawnCommand(
        'cmake',
        args,
        projectRoot,
        callbacks
      );
      if (this.stopping) {
        return finish({ status: 'cancelled', exitCode: null });
      }
      if (configureCode !== 0) {
        if (!options.frameworkSourceDir) {
          callbacks.onLog(
            'If the Aether framework could not be downloaded, check the network connection ' +
              'and that the tag pinned in CMakeLists.txt (GIT_TAG) exists.\n'
          );
        }
        return finish({
          status: 'failed',
          exitCode: configureCode,
          message: 'CMake configure failed. See the build log.',
        });
      }

      const build = buildArgs(buildDir, config);
      callbacks.onLog(
        `Building (${config}): cmake ${build.map(quoteForLog).join(' ')}\n`
      );
      const buildCode = await this.spawnCommand(
        'cmake',
        build,
        projectRoot,
        callbacks
      );

      if (this.stopping) {
        return finish({ status: 'cancelled', exitCode: null });
      }

      if (buildCode !== 0) {
        return finish({
          status: 'failed',
          exitCode: buildCode,
          message: 'Build failed. See the build log.',
        });
      }

      const artifacts = findVst3Bundles(buildDir);
      for (const bundle of artifacts) {
        callbacks.onLog(`VST3 plugin: ${bundle}\n`);
      }
      return finish({
        status: 'success',
        exitCode: 0,
        message: 'Build succeeded.',
        artifacts,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to start cmake.';
      callbacks.onLog(`${message}\n`);
      return finish({ status: 'failed', exitCode: null, message });
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
      // No shell: arguments with spaces (project paths) reach CMake intact, and stop()
      // kills CMake itself rather than a cmd.exe wrapper. cmake.exe is found through PATH.
      const child = spawn(command, args, {
        cwd,
        env: process.env,
        windowsHide: true,
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
  BUILD_CONFIGS,
  BuildRunner,
  buildArgs,
  buildIsConfigured,
  configureArgs,
  findFrameworkSourceDir,
  findVst3Bundles,
  getBuildDir,
  projectHasCMakeLists,
};
