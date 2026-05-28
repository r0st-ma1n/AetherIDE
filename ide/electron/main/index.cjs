const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const fs = require('fs/promises');
const fsSync = require('fs');
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

/** @type {BrowserWindow | null} */
let mainWindow = null;

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

function startFileWatcher() {
  const debounceMap = new Map();

  fsSync.watch(PROJECT_ROOT, { recursive: true }, (eventType, filename) => {
    if (!filename || !mainWindow || mainWindow.isDestroyed()) return;

    const ext = path.extname(filename).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) return;

    // Ignore node_modules, dist, build, hidden paths
    if (
      filename.includes('node_modules') ||
      filename.includes('dist') ||
      filename.includes('build') ||
      filename.startsWith('.')
    ) {
      return;
    }

    // Debounce per file (editors write twice: truncate + write)
    const existing = debounceMap.get(filename);
    if (existing) clearTimeout(existing);

    debounceMap.set(
      filename,
      setTimeout(() => {
        debounceMap.delete(filename);
        const relativePath = filename.replace(/\\/g, '/');
        mainWindow?.webContents.send('file:changed', relativePath);
      }, 150)
    );
  });
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

  ipcMain.handle('file:exists', async (_event, relativePath) => {
    try {
      const absolutePath = resolveProjectPath(relativePath);
      await fs.access(absolutePath);
      return true;
    } catch {
      return false;
    }
  });
}

function buildAppMenu(window) {
  const template = [
    {
      label: 'File',
      submenu: [{ role: 'close', label: 'Close Window' }],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Tools',
      submenu: [
        {
          label: 'Toggle Debug Panel',
          accelerator: 'Ctrl+Shift+D',
          click: () => {
            window.webContents.send('tools:toggle-debug-panel');
          },
        },
        { role: 'toggleDevTools', label: 'Toggle Developer Tools' },
      ],
    },
  ];

  return Menu.buildFromTemplate(template);
}

function createWindow() {
  mainWindow = new BrowserWindow({
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

  Menu.setApplicationMenu(buildAppMenu(mainWindow));

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
    return;
  }

  mainWindow.loadFile(path.join(__dirname, '..', '..', 'dist', 'index.html'));
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();
  startFileWatcher();

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
