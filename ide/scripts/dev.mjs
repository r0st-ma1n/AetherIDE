import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ideRoot = path.resolve(__dirname, '..');
const viteBin = path.join(ideRoot, 'node_modules', 'vite', 'bin', 'vite.js');
const electronCli = path.join(ideRoot, 'node_modules', 'electron', 'cli.js');
const mainProcessFile = path.join(ideRoot, 'electron', 'main', 'index.cjs');
const devServerUrl = 'http://127.0.0.1:5173';

let electronProcess = null;
let shuttingDown = false;
let restartDebounce = null;

function spawnProcess(command, args, options = {}) {
  return spawn(command, args, {
    cwd: ideRoot,
    stdio: 'inherit',
    shell: false,
    ...options,
  });
}

function waitForServer(url, attempts = 60) {
  return new Promise((resolve, reject) => {
    let completedAttempts = 0;

    const tryConnect = () => {
      completedAttempts += 1;

      const request = http.get(url, (response) => {
        response.resume();
        resolve();
      });

      request.on('error', () => {
        if (completedAttempts >= attempts) {
          reject(new Error(`Vite dev server is unavailable at ${url}`));
          return;
        }

        setTimeout(tryConnect, 500);
      });
    };

    tryConnect();
  });
}

function shutdown(code = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  if (electronProcess && !electronProcess.killed) {
    electronProcess.kill();
  }

  if (!viteProcess.killed) {
    viteProcess.kill();
  }

  process.exit(code);
}

function startElectron() {
  if (electronProcess && !electronProcess.killed) {
    electronProcess.kill();
  }

  electronProcess = spawnProcess(process.execPath, [electronCli, '.'], {
    env: {
      ...process.env,
      VITE_DEV_SERVER_URL: devServerUrl,
    },
  });

  electronProcess.on('exit', (code) => {
    if (!shuttingDown && code !== null) {
      shutdown(code);
    }
  });
}

function watchMainProcess() {
  fs.watch(mainProcessFile, () => {
    if (shuttingDown) return;

    if (restartDebounce) clearTimeout(restartDebounce);
    restartDebounce = setTimeout(() => {
      console.log('[dev] Main process changed — restarting Electron...');
      startElectron();
    }, 300);
  });
}

const viteProcess = spawnProcess(process.execPath, [
  viteBin,
  '--host',
  '127.0.0.1',
  '--strictPort',
]);

viteProcess.on('exit', (code) => {
  if (!shuttingDown) {
    shutdown(code ?? 0);
  }
});

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

try {
  await waitForServer(devServerUrl);
  startElectron();
  watchMainProcess();
} catch (error) {
  console.error(
    error instanceof Error ? error.message : 'Failed to start dev environment.'
  );
  shutdown(1);
}
