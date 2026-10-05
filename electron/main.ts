import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, protocol } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

// 添加调试日志
console.log('Electron main process starting...');
console.log('Node version:', process.version);
console.log('Platform:', process.platform);
console.log('CWD:', process.cwd());
console.log('__dirname in source:', __dirname);

let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

// 窗口状态存储
const windowState = {
  width: 1200,
  height: 800,
  x: undefined as number | undefined,
  y: undefined as number | undefined,
};

// 检测开发模式
const isDev = process.env.NODE_ENV === 'development';
const devUrl = 'http://localhost:3000';
const outDir = path.join(__dirname, '../out');

console.log('isDev:', isDev);
console.log('devUrl:', devUrl);
console.log('outDir:', outDir);

// 自定义协议名称
const PROTOCOL_SCHEME = 'app';
const PROTOCOL_HOST = 'investment-tracker';
const SPLASH_BACKGROUND = '#f8f8f0';
const PERSISTED_STORAGE_FLUSH_DELAY_MS = 200;

let persistedStorageCache: Record<string, string> | null = null;
let persistedStorageDirty = false;
let persistedStorageFlushTimer: NodeJS.Timeout | null = null;

function getPersistedStoragePath() {
  return path.join(app.getPath('userData'), 'persist-store.json');
}

function readPersistedStorageFromDisk(): Record<string, string> {
  const storagePath = getPersistedStoragePath();

  try {
    if (!fs.existsSync(storagePath)) {
      return {};
    }

    const raw = fs.readFileSync(storagePath, 'utf8');
    if (!raw.trim()) {
      return {};
    }

    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, string>;
    }
  } catch (error) {
    console.error('Failed to read persisted storage:', error);
  }

  return {};
}

function writePersistedStorageToDisk(storage: Record<string, string>) {
  const storagePath = getPersistedStoragePath();

  try {
    fs.mkdirSync(path.dirname(storagePath), { recursive: true });
    fs.writeFileSync(storagePath, JSON.stringify(storage, null, 2), 'utf8');
  } catch (error) {
    console.error('Failed to write persisted storage:', error);
    throw error;
  }
}

function getPersistedStorageCache() {
  if (!persistedStorageCache) {
    persistedStorageCache = readPersistedStorageFromDisk();
  }

  return persistedStorageCache;
}

function flushPersistedStorage() {
  if (!persistedStorageDirty || !persistedStorageCache) {
    return;
  }

  writePersistedStorageToDisk(persistedStorageCache);
  persistedStorageDirty = false;
}

function schedulePersistedStorageFlush() {
  if (persistedStorageFlushTimer) {
    return;
  }

  persistedStorageFlushTimer = setTimeout(() => {
    persistedStorageFlushTimer = null;

    try {
      flushPersistedStorage();
    } catch (error) {
      console.error('Failed to flush persisted storage:', error);
    }
  }, PERSISTED_STORAGE_FLUSH_DELAY_MS);
}

function showMainWindow(reason: string) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  console.log(`Showing window (${reason})`);

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  if (!mainWindow.isVisible()) {
    mainWindow.show();
  }

  mainWindow.focus();
}

function closeSplashWindow() {
  if (!splashWindow || splashWindow.isDestroyed()) {
    splashWindow = null;
    return;
  }

  splashWindow.close();
  splashWindow = null;
}

function createSplashWindow() {
  if (splashWindow && !splashWindow.isDestroyed()) {
    return splashWindow;
  }

  splashWindow = new BrowserWindow({
    width: 440,
    height: 280,
    frame: false,
    transparent: false,
    resizable: false,
    movable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    show: true,
    center: true,
    backgroundColor: SPLASH_BACKGROUND,
    alwaysOnTop: true,
    webPreferences: {
      devTools: false,
    },
  });

  const splashHtml = `
    <!DOCTYPE html>
    <html lang="zh-CN">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>InvestmentTracker</title>
        <style>
          :root {
            color-scheme: light;
          }

          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
            font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB",
              "Helvetica Neue", Arial, sans-serif;
            background:
              radial-gradient(circle at top, rgba(25, 200, 185, 0.16), transparent 38%),
              linear-gradient(180deg, #fbfaf4 0%, #f6f1df 100%);
            color: #725d42;
            overflow: hidden;
          }

          .shell {
            width: 100%;
            height: 100%;
            padding: 28px;
            position: relative;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }

          .card {
            position: relative;
            padding: 24px 24px 20px;
            border-radius: 28px;
            border: 2px solid rgba(159, 146, 125, 0.38);
            background: rgba(255, 252, 245, 0.86);
            box-shadow:
              0 18px 40px rgba(121, 79, 39, 0.08),
              inset 0 -10px 18px rgba(255, 255, 255, 0.55);
            backdrop-filter: blur(6px);
          }

          .badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 8px 14px;
            border-radius: 999px;
            background: #e6f9f6;
            color: #159f93;
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }

          .badge::before {
            content: "";
            width: 8px;
            height: 8px;
            border-radius: 999px;
            background: #19c8b9;
            box-shadow: 0 0 0 6px rgba(25, 200, 185, 0.14);
          }

          h1 {
            margin: 18px 0 8px;
            font-size: 32px;
            line-height: 1.05;
            letter-spacing: -0.04em;
            color: #794f27;
          }

          p {
            margin: 0;
            font-size: 14px;
            line-height: 1.7;
            color: #8a7b66;
          }

          .progress {
            margin-top: 20px;
            height: 10px;
            border-radius: 999px;
            overflow: hidden;
            background: rgba(196, 184, 158, 0.35);
          }

          .progress > span {
            display: block;
            width: 38%;
            height: 100%;
            border-radius: inherit;
            background: linear-gradient(90deg, #19c8b9 0%, #7bc96a 100%);
            animation: load 1.3s ease-in-out infinite;
            transform-origin: left center;
          }

          .footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 14px;
            font-size: 12px;
            color: #9f927d;
          }

          .dots {
            display: inline-flex;
            gap: 6px;
          }

          .dots span {
            width: 6px;
            height: 6px;
            border-radius: 999px;
            background: #d4b030;
            animation: pulse 1.1s ease-in-out infinite;
          }

          .dots span:nth-child(2) {
            animation-delay: 0.16s;
          }

          .dots span:nth-child(3) {
            animation-delay: 0.32s;
          }

          @keyframes load {
            0% {
              transform: translateX(-6%) scaleX(0.62);
            }
            50% {
              transform: translateX(78%) scaleX(1);
            }
            100% {
              transform: translateX(-6%) scaleX(0.62);
            }
          }

          @keyframes pulse {
            0%, 100% {
              opacity: 0.3;
              transform: translateY(0);
            }
            50% {
              opacity: 1;
              transform: translateY(-2px);
            }
          }
        </style>
      </head>
      <body>
        <div class="shell">
          <div class="card">
            <div class="badge">Investment Tracker</div>
            <h1>正在载入你的投资数据</h1>
            <p>初始化账户、交易、快照和统计视图。窗口准备好后会自动进入主界面。</p>
            <div class="progress"><span></span></div>
            <div class="footer">
              <span>Preparing desktop workspace</span>
              <span class="dots"><span></span><span></span><span></span></span>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  splashWindow.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(splashHtml)}`);
  splashWindow.on('closed', () => {
    splashWindow = null;
  });

  return splashWindow;
}

protocol.registerSchemesAsPrivileged([
  {
    scheme: PROTOCOL_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      allowServiceWorkers: true,
      stream: true,
    },
  },
]);

/**
 * 注册协议拦截器
 */
function registerProtocol() {
  protocol.registerFileProtocol(PROTOCOL_SCHEME, (request, callback) => {
    // 解析 URL: app://investment-tracker/path
    const url = new URL(request.url);
    let requestPath = url.pathname;

    console.log('Protocol request:', request.url, '->', requestPath);

    // 移除开头的斜杠
    if (requestPath.startsWith('/')) {
      requestPath = requestPath.slice(1);
    }

    // 根路径返回首页
    if (requestPath === '' || requestPath === '/') {
      const indexPath = path.join(outDir, 'index.html');
      console.log('Serving index.html:', indexPath);
      callback({ path: indexPath });
      return;
    }

    // Next 静态导出路由通常对应 foo.html
    if (!path.extname(requestPath)) {
      const routeHtmlPath = path.join(outDir, `${requestPath}.html`);

      if (fs.existsSync(routeHtmlPath) && fs.statSync(routeHtmlPath).isFile()) {
        console.log('Serving route html:', routeHtmlPath);
        callback({ path: routeHtmlPath });
        return;
      }

      const indexPath = path.join(outDir, 'index.html');
      console.log('Falling back to index.html:', indexPath);
      callback({ path: indexPath });
      return;
    }

    // 构建完整文件路径
    const filePath = path.join(outDir, requestPath);

    // 检查文件是否存在
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      console.log('Serving file:', filePath);
      callback({ path: filePath });
    } else {
      console.error('File not found:', filePath);
      // 文件不存在，返回 index.html（SPA 路由）
      const indexPath = path.join(outDir, 'index.html');
      callback({ path: indexPath });
    }
  });
}

/**
 * 创建系统托盘
 */
function createTray() {
  const iconPath = path.join(__dirname, '../assets/icon.png');
  let icon;

  try {
    icon = nativeImage.createFromPath(iconPath);
    if (icon.isEmpty()) {
      icon = nativeImage.createEmpty();
    }
  } catch {
    icon = nativeImage.createEmpty();
  }

  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示窗口',
      click: () => {
        if (mainWindow) {
          if (mainWindow.isMinimized()) {
            mainWindow.restore();
          }
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: '隐藏窗口',
      click: () => {
        if (mainWindow) {
          mainWindow.hide();
        }
      }
    },
    { type: 'separator' },
    {
      label: '退出应用',
      click: () => {
        app.quit();
      }
    }
  ]);

  tray.setToolTip('投资账户管理系统');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });
}

/**
 * 创建原生菜单
 */
function createMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: '投资账户管理',
      submenu: [
        { label: '关于', role: 'about' },
        { type: 'separator' },
        { label: '隐藏', role: 'hide' },
        { label: '显示全部', role: 'unhide' },
        { type: 'separator' },
        { label: '退出', role: 'quit' }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { label: '撤销', role: 'undo' },
        { label: '重做', role: 'redo' },
        { type: 'separator' },
        { label: '剪切', role: 'cut' },
        { label: '复制', role: 'copy' },
        { label: '粘贴', role: 'paste' },
        { label: '全选', role: 'selectAll' }
      ]
    },
    {
      label: '视图',
      submenu: [
        { label: '重新加载', role: 'reload' },
        { label: '强制重新加载', role: 'forceReload' },
        { label: '开发者工具', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: '实际大小', role: 'resetZoom' },
        { label: '放大', role: 'zoomIn' },
        { label: '缩小', role: 'zoomOut' },
        { type: 'separator' },
        { label: '全屏', role: 'togglefullscreen' }
      ]
    },
    {
      label: '窗口',
      submenu: [
        { label: '最小化', role: 'minimize' },
        { label: '关闭', role: 'close' },
        { type: 'separator' },
        { label: '前置所有窗口', role: 'front' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

/**
 * 创建主窗口
 */
async function createWindow() {
  console.log('createWindow() called');

  const { width, height } = windowState;

  console.log('Creating window with size:', width, 'x', height);

  createSplashWindow();

  mainWindow = new BrowserWindow({
    width,
    height,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      devTools: true, // 始终允许打开开发者工具（菜单栏 → 开发者工具），方便调试数据问题
      webSecurity: true, // 启用 web 安全
    },
    title: '投资账户管理系统',
    backgroundColor: SPLASH_BACKGROUND,
    show: false,
    center: true,
  });

  console.log('Window created');

  // 监听加载事件
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Page loaded successfully');
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (!isMainFrame) return;
    console.error('Main frame failed to load:', errorCode, errorDescription, validatedURL);
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer Console] ${message}`);
  });

  mainWindow.once('ready-to-show', () => {
    console.log('Window ready-to-show event fired');
    showMainWindow('ready-to-show');
    setTimeout(() => {
      closeSplashWindow();
    }, 120);
  });

  // 加载页面
  if (isDev) {
    console.log('Loading dev URL:', devUrl);
    await mainWindow.loadURL(devUrl);
    mainWindow.webContents.openDevTools();
  } else {
    // 生产模式：使用自定义协议
    const appUrl = `${PROTOCOL_SCHEME}://${PROTOCOL_HOST}/`;
    console.log('Loading production URL:', appUrl);
    await mainWindow.loadURL(appUrl);
  }

  if (mainWindow && !mainWindow.isVisible()) {
    showMainWindow('post-load');
    closeSplashWindow();
  }

  mainWindow.on('close', () => {
    if (mainWindow) {
      const bounds = mainWindow.getBounds();
      windowState.width = bounds.width;
      windowState.height = bounds.height;
      windowState.x = bounds.x;
      windowState.y = bounds.y;
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * 注册 IPC 事件处理器
 */
function registerIpcHandlers() {
  ipcMain.on('window-minimize', () => {
    mainWindow?.minimize();
  });

  ipcMain.on('window-maximize', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });

  ipcMain.on('window-close', () => {
    mainWindow?.close();
  });

  ipcMain.handle('storage-get', async (_event, key: string) => {
    const storage = getPersistedStorageCache();
    return storage[key] ?? null;
  });

  ipcMain.handle('storage-set', async (_event, key: string, value: string) => {
    try {
      const storage = getPersistedStorageCache();
      storage[key] = value;
      persistedStorageDirty = true;
      schedulePersistedStorageFlush();
      return true;
    } catch (error) {
      console.error(`Failed to persist key "${key}":`, error);
      return false;
    }
  });

  ipcMain.handle('storage-remove', async (_event, key: string) => {
    try {
      const storage = getPersistedStorageCache();
      delete storage[key];
      persistedStorageDirty = true;
      schedulePersistedStorageFlush();
      return true;
    } catch (error) {
      console.error(`Failed to remove persisted key "${key}":`, error);
      return false;
    }
  });
}

/**
 * 应用准备就绪
 */
app.whenReady().then(() => {
  console.log('App is ready, initializing...');
  getPersistedStorageCache();

  registerIpcHandlers();

  // 生产模式：注册本地资源协议
  if (!isDev) {
    console.log('Registering custom protocol:', PROTOCOL_SCHEME);
    registerProtocol();
  }

  createWindow();
  createMenu();
  createTray();
  console.log('App initialization complete');

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow();
      return;
    }

    showMainWindow('app-activate');
  });
}).catch((err) => {
  console.error('Error in app.whenReady():', err);
});

/**
 * 所有窗口关闭时退出应用（macOS 除外）
 */
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/**
 * 应用退出前清理
 */
app.on('will-quit', () => {
  if (persistedStorageFlushTimer) {
    clearTimeout(persistedStorageFlushTimer);
    persistedStorageFlushTimer = null;
  }

  try {
    flushPersistedStorage();
  } catch (error) {
    console.error('Failed to flush persisted storage before quit:', error);
  }

  closeSplashWindow();
  tray?.destroy();
  tray = null;
});

/**
 * 忽略证书错误（仅开发环境）
 */
if (isDev) {
  app.commandLine.appendSwitch('ignore-certificate-errors');
}
