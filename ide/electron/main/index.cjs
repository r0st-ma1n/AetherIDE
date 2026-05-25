const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs/promises');
const path = require('path');

const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const HIDDEN_ROOT_DIRECTORIES = new Set(['docs']);
const HIDDEN_FILE_NAMES = new Set(['README.md', 'GEMINI.md']);
const ALLOWED_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.vue',
  '.json',
  '.ui',
  '.h',
  '.hpp',
  '.cpp',
  '.c',
  '.md',
  '.txt',
]);

async function collectProjectFiles(dirPath, result = []) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith('.')) {
      continue;
    }

    if (dirPath === PROJECT_ROOT && HIDDEN_ROOT_DIRECTORIES.has(entry.name)) {
      continue;
    }

    if (['node_modules', 'dist', 'build'].includes(entry.name)) {
      continue;
    }

    const absolutePath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      await collectProjectFiles(absolutePath, result);
      continue;
    }

    if (!ALLOWED_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      continue;
    }

    if (dirPath === PROJECT_ROOT && HIDDEN_FILE_NAMES.has(entry.name)) {
      continue;
    }

    result.push({
      name: entry.name,
      path: path.relative(PROJECT_ROOT, absolutePath).replace(/\\/g, '/'),
    });
  }

  return result;
}

function resolveProjectPath(relativePath) {
  const normalizedPath = relativePath.replace(/\//g, path.sep);
  const absolutePath = path.resolve(PROJECT_ROOT, normalizedPath);

  if (!absolutePath.startsWith(PROJECT_ROOT)) {
    throw new Error('Path is outside the project root.');
  }

  return absolutePath;
}

function registerIpcHandlers() {
  ipcMain.handle('project:list-files', async () => {
    const files = await collectProjectFiles(PROJECT_ROOT);

    return files.sort((left, right) => left.path.localeCompare(right.path));
  });

  ipcMain.handle('file:read', async (_event, relativePath) => {
    const absolutePath = resolveProjectPath(relativePath);
    return fs.readFile(absolutePath, 'utf-8');
  });

  ipcMain.handle('file:write', async (_event, payload) => {
    const absolutePath = resolveProjectPath(payload.path);
    await fs.writeFile(absolutePath, payload.content, 'utf-8');
    return { ok: true };
  });
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#101113',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'PrototypeIDE',
  });

  if (VITE_DEV_SERVER_URL) {
    window.loadURL(VITE_DEV_SERVER_URL);
    return;
  }

  window.loadFile(path.join(__dirname, '..', '..', 'dist', 'index.html'));
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
