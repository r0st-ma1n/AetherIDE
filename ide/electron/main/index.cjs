const { app, BrowserWindow, dialog, ipcMain, Menu } = require('electron');
const fs = require('fs/promises');
const fsSync = require('fs');
const path = require('path');
const {
  MISSING_MARKER_MESSAGE,
  findAetherMarkerName,
  isValidAetherProjectDocument,
} = require('./projectMarker.cjs');
const {
  removeRecentProject,
  sanitizeRecentProjects,
  touchRecentProjects,
} = require('./recentProjects.cjs');
const { BuildRunner } = require('./buildRunner.cjs');

const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
const ALLOWED_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.vue',
  '.json',
  '.ui',
  '.aether',
  '.h',
  '.hpp',
  '.cpp',
  '.c',
  '.md',
  '.txt',
  '.cmake',
]);

/** @type {BrowserWindow | null} */
let mainWindow = null;

/** @type {string | null} Absolute path of the open user project, or null. */
let activeProjectRoot = null;

/** @type {Array<{ path: string, name: string, openedAt: number }>} */
let recentProjects = [];

const buildRunner = new BuildRunner();

/** @type {import('fs').FSWatcher | null} */
let fileWatcher = null;

/** When true, window close / app quit proceeds without another prompt. */
let quittingConfirmed = false;

function getStateFilePath() {
  return path.join(app.getPath('userData'), 'project-state.json');
}

/**
 * @param {string} rootAbsolute
 * @param {string} candidateAbsolute
 */
function isPathInsideRoot(rootAbsolute, candidateAbsolute) {
  const root = path.resolve(rootAbsolute);
  const candidate = path.resolve(candidateAbsolute);
  const relative = path.relative(root, candidate);

  if (relative === '') {
    return true;
  }

  return (
    relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative)
  );
}

async function persistProjectState() {
  const statePath = getStateFilePath();
  await fs.mkdir(path.dirname(statePath), { recursive: true });
  await fs.writeFile(
    statePath,
    JSON.stringify(
      {
        projectRoot: activeProjectRoot,
        recentProjects,
      },
      null,
      2
    ),
    'utf-8'
  );
}

function notifyRecentChanged() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('project:recent-changed', recentProjects);
    Menu.setApplicationMenu(buildAppMenu(mainWindow));
  }
}

async function loadPersistedProjectRoot() {
  /** @type {Record<string, unknown> | null} */
  let parsed = null;

  try {
    const raw = await fs.readFile(getStateFilePath(), 'utf-8');
    parsed = JSON.parse(raw);
    recentProjects = sanitizeRecentProjects(parsed?.recentProjects);
  } catch {
    recentProjects = [];
    return null;
  }

  if (typeof parsed?.projectRoot !== 'string' || !parsed.projectRoot) {
    return null;
  }

  try {
    const resolved = path.resolve(parsed.projectRoot);
    const stat = await fs.stat(resolved);
    if (!stat.isDirectory()) {
      return null;
    }

    await assertValidProjectDirectory(resolved);
    return resolved;
  } catch {
    return null;
  }
}

/**
 * @param {string} dirPath
 * @returns {Promise<string>} Absolute path to the marker file.
 */
async function assertValidProjectDirectory(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const fileNames = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name);
  const markerName = findAetherMarkerName(fileNames);

  if (!markerName) {
    throw new Error(MISSING_MARKER_MESSAGE);
  }

  const markerPath = path.join(dirPath, markerName);
  let parsed;

  try {
    const raw = await fs.readFile(markerPath, 'utf-8');
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(
      `Not an Aether project: "${markerName}" is missing or is not valid JSON.`
    );
  }

  const documentCheck = isValidAetherProjectDocument(parsed);
  if (!documentCheck.valid) {
    throw new Error(`Not an Aether project: ${documentCheck.reason}`);
  }

  return markerPath;
}

/**
 * @param {unknown} error
 */
async function showProjectOpenError(error) {
  const message =
    error instanceof Error ? error.message : 'Unable to open project.';

  if (!mainWindow || mainWindow.isDestroyed()) {
    console.error(message);
    return;
  }

  await dialog.showMessageBox(mainWindow, {
    type: 'warning',
    title: 'Open Project',
    message: 'Could not open project',
    detail: message,
  });
}

/**
 * @param {string} dirPath
 * @param {string} root
 * @param {Array<{ name: string, path: string }>} result
 */
async function collectProjectFiles(dirPath, root, result = []) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith('.')) {
      continue;
    }

    if (['node_modules', 'dist', 'build'].includes(entry.name)) {
      continue;
    }

    const absolutePath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      await collectProjectFiles(absolutePath, root, result);
      continue;
    }

    if (!ALLOWED_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      continue;
    }

    result.push({
      name: entry.name,
      path: path.relative(root, absolutePath).replace(/\\/g, '/'),
    });
  }

  return result;
}

/**
 * @param {string} relativePath
 */
function resolveProjectPath(relativePath) {
  if (!activeProjectRoot) {
    throw new Error('No project is open.');
  }

  if (typeof relativePath !== 'string' || relativePath.length === 0) {
    throw new Error('Path is required.');
  }

  const normalizedPath = relativePath.replace(/\//g, path.sep);
  const absolutePath = path.resolve(activeProjectRoot, normalizedPath);

  if (!isPathInsideRoot(activeProjectRoot, absolutePath)) {
    throw new Error('Path is outside the project root.');
  }

  return absolutePath;
}

function stopFileWatcher() {
  if (fileWatcher) {
    fileWatcher.close();
    fileWatcher = null;
  }
}

function startFileWatcher() {
  stopFileWatcher();

  if (!activeProjectRoot) {
    return;
  }

  const root = activeProjectRoot;
  const debounceMap = new Map();

  try {
    fileWatcher = fsSync.watch(
      root,
      { recursive: true },
      (_eventType, filename) => {
        if (!filename || !mainWindow || mainWindow.isDestroyed()) {
          return;
        }

        const ext = path.extname(filename).toLowerCase();
        if (!ALLOWED_EXTENSIONS.has(ext)) {
          return;
        }

        const normalized = filename.replace(/\\/g, '/');
        if (
          normalized.includes('node_modules/') ||
          normalized.includes('/dist/') ||
          normalized.includes('/build/') ||
          normalized.startsWith('dist/') ||
          normalized.startsWith('build/') ||
          normalized.includes('/.') ||
          normalized.startsWith('.')
        ) {
          return;
        }

        const existing = debounceMap.get(normalized);
        if (existing) {
          clearTimeout(existing);
        }

        debounceMap.set(
          normalized,
          setTimeout(() => {
            debounceMap.delete(normalized);
            mainWindow?.webContents.send('file:changed', normalized);
          }, 150)
        );
      }
    );
  } catch (error) {
    console.error('Failed to start file watcher:', error);
  }
}

function updateWindowTitle() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  if (!activeProjectRoot) {
    mainWindow.setTitle('AetherIDE');
    return;
  }

  mainWindow.setTitle(`AetherIDE — ${path.basename(activeProjectRoot)}`);
}

/**
 * @param {string | null} nextRoot
 */
async function setActiveProjectRoot(nextRoot) {
  if (nextRoot == null) {
    activeProjectRoot = null;
  } else {
    const resolved = path.resolve(nextRoot);
    const stat = await fs.stat(resolved);
    if (!stat.isDirectory()) {
      throw new Error('Project root must be a directory.');
    }
    await assertValidProjectDirectory(resolved);
    activeProjectRoot = resolved;
    recentProjects = touchRecentProjects(recentProjects, activeProjectRoot);
  }

  await persistProjectState();
  startFileWatcher();
  updateWindowTitle();
  notifyRecentChanged();

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('project:root-changed', activeProjectRoot);
  }

  return activeProjectRoot;
}

/**
 * @param {string} projectPath
 */
async function openRecentProject(projectPath) {
  if (typeof projectPath !== 'string' || !projectPath.trim()) {
    throw new Error('Recent project path is required.');
  }

  try {
    return await setActiveProjectRoot(projectPath);
  } catch (error) {
    recentProjects = removeRecentProject(recentProjects, projectPath);
    await persistProjectState();
    notifyRecentChanged();
    await showProjectOpenError(error);
    return null;
  }
}

async function openProjectDialog() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return null;
  }

  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Open Project',
    properties: ['openDirectory'],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  try {
    return await setActiveProjectRoot(result.filePaths[0]);
  } catch (error) {
    // Validation runs before mutating activeProjectRoot, so cancel/failure
    // leaves the previously open project unchanged.
    await showProjectOpenError(error);
    return null;
  }
}

function registerIpcHandlers() {
  ipcMain.handle('project:get-root', async () => activeProjectRoot);

  ipcMain.handle('project:set-root', async (_event, nextRoot) => {
    if (typeof nextRoot !== 'string' || nextRoot.length === 0) {
      throw new Error('Project root path is required.');
    }
    return setActiveProjectRoot(nextRoot);
  });

  ipcMain.handle('project:clear-root', async () => setActiveProjectRoot(null));

  ipcMain.handle('project:open-dialog', async () => openProjectDialog());

  ipcMain.handle('project:get-recent', async () => recentProjects);

  ipcMain.handle('project:open-recent', async (_event, projectPath) => {
    return openRecentProject(projectPath);
  });

  ipcMain.handle('project:clear-recent', async () => {
    recentProjects = [];
    await persistProjectState();
    notifyRecentChanged();
    return recentProjects;
  });

  ipcMain.handle('build:run', async () => {
    if (!activeProjectRoot) {
      const payload = {
        status: 'failed',
        exitCode: null,
        message: 'No project is open.',
      };
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('build:status', payload);
      }
      return payload;
    }

    if (buildRunner.isBusy()) {
      const payload = {
        status: 'failed',
        exitCode: null,
        message: 'A build is already running.',
      };
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('build:status', payload);
      }
      return payload;
    }

    return buildRunner.run(activeProjectRoot, {
      onLog: (chunk) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('build:log', chunk);
        }
      },
      onStatus: (payload) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('build:status', payload);
        }
      },
    });
  });

  ipcMain.handle('build:stop', async () => buildRunner.stop());

  ipcMain.handle('project:list-files', async () => {
    if (!activeProjectRoot) {
      return [];
    }

    const files = await collectProjectFiles(
      activeProjectRoot,
      activeProjectRoot
    );
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
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message === 'No project is open.' ||
          error.message === 'Path is outside the project root.' ||
          error.message === 'Path is required.')
      ) {
        throw error;
      }
      return false;
    }
  });

  ipcMain.handle('dialog:confirm-unsaved', async (_event, payload = {}) => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      return 'cancel';
    }

    const result = await dialog.showMessageBox(mainWindow, {
      type: 'warning',
      buttons: ['Save', "Don't Save", 'Cancel'],
      defaultId: 0,
      cancelId: 2,
      noLink: true,
      title: payload.title || 'Unsaved Changes',
      message: payload.message || 'Do you want to save your changes?',
      detail: payload.detail || '',
    });

    if (result.response === 0) {
      return 'save';
    }
    if (result.response === 1) {
      return 'discard';
    }
    return 'cancel';
  });

  ipcMain.handle('app:confirm-quit', async () => {
    quittingConfirmed = true;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.close();
    } else {
      app.quit();
    }
    return true;
  });

  ipcMain.handle('dialog:choose-directory', async (_event, payload = {}) => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      return null;
    }

    const result = await dialog.showOpenDialog(mainWindow, {
      title: payload.title || 'Choose Folder',
      properties: ['openDirectory', 'createDirectory'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  });

  ipcMain.handle('project:scaffold', async (_event, payload) => {
    const parentDir =
      typeof payload?.parentDir === 'string' ? payload.parentDir.trim() : '';
    const folderName =
      typeof payload?.folderName === 'string' ? payload.folderName.trim() : '';
    const files =
      payload?.files && typeof payload.files === 'object'
        ? payload.files
        : null;

    if (!parentDir || !folderName || !files) {
      throw new Error('Scaffold requires parentDir, folderName, and files.');
    }

    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(folderName)) {
      throw new Error('Invalid project folder name.');
    }

    const targetDir = path.resolve(parentDir, folderName);

    if (!isPathInsideRoot(path.resolve(parentDir), targetDir)) {
      throw new Error('Project path must stay inside the chosen location.');
    }

    let targetExists = false;
    try {
      const stat = await fs.stat(targetDir);
      targetExists = stat.isDirectory();
    } catch {
      targetExists = false;
    }

    if (targetExists) {
      const existing = await fs.readdir(targetDir);
      if (existing.length > 0) {
        throw new Error(`Folder already exists and is not empty: ${targetDir}`);
      }
    } else {
      await fs.mkdir(targetDir, { recursive: true });
    }

    for (const [relativePath, content] of Object.entries(files)) {
      if (typeof relativePath !== 'string' || typeof content !== 'string') {
        throw new Error('Invalid scaffold file entry.');
      }
      if (
        relativePath.includes('..') ||
        path.isAbsolute(relativePath) ||
        relativePath.startsWith('/') ||
        relativePath.startsWith('\\')
      ) {
        throw new Error(`Unsafe scaffold path: ${relativePath}`);
      }

      const absolutePath = path.resolve(targetDir, relativePath);
      if (!isPathInsideRoot(targetDir, absolutePath)) {
        throw new Error(
          `Scaffold path escapes project folder: ${relativePath}`
        );
      }

      await fs.mkdir(path.dirname(absolutePath), { recursive: true });
      await fs.writeFile(absolutePath, content, 'utf-8');
    }

    await assertValidProjectDirectory(targetDir);
    return targetDir;
  });
}

function buildRecentSubmenu() {
  if (recentProjects.length === 0) {
    return [{ label: 'No Recent Projects', enabled: false }];
  }

  return [
    ...recentProjects.map((entry) => ({
      label: entry.name,
      toolTip: entry.path,
      click: () => {
        openRecentProject(entry.path).catch((error) => {
          console.error('Open Recent failed:', error);
        });
      },
    })),
    { type: 'separator' },
    {
      label: 'Clear Recent',
      click: () => {
        recentProjects = [];
        persistProjectState()
          .then(() => notifyRecentChanged())
          .catch((error) => {
            console.error('Clear Recent failed:', error);
          });
      },
    },
  ];
}

function buildAppMenu(window) {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Project…',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            window.webContents.send('project:new-requested');
          },
        },
        {
          label: 'Open Project…',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            openProjectDialog().catch((error) => {
              console.error('Open Project failed:', error);
            });
          },
        },
        {
          label: 'Open Recent',
          submenu: buildRecentSubmenu(),
        },
        {
          label: 'Close Project',
          click: () => {
            window.webContents.send('project:close-requested');
          },
        },
        { type: 'separator' },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            window.webContents.send('workspace:save-requested');
          },
        },
        {
          label: 'Save All',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => {
            window.webContents.send('workspace:save-all-requested');
          },
        },
        { type: 'separator' },
        { role: 'close', label: 'Close Window' },
      ],
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
      label: 'Build',
      submenu: [
        {
          label: 'Build Project',
          accelerator: 'CmdOrCtrl+B',
          click: () => {
            window.webContents.send('build:requested');
          },
        },
        {
          label: 'Stop Build',
          click: () => {
            window.webContents.send('build:stop-requested');
          },
        },
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
    title: 'AetherIDE',
  });

  Menu.setApplicationMenu(buildAppMenu(mainWindow));
  updateWindowTitle();

  mainWindow.on('close', (event) => {
    if (quittingConfirmed) {
      return;
    }
    event.preventDefault();
    mainWindow?.webContents.send('app:quit-requested');
  });

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
    return;
  }

  mainWindow.loadFile(path.join(__dirname, '..', '..', 'dist', 'index.html'));
}

app.whenReady().then(async () => {
  activeProjectRoot = await loadPersistedProjectRoot();
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
  stopFileWatcher();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
