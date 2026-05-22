import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain } from 'electron';
import * as path from 'path';

// 添加调试日志
console.log('Electron main process starting...');
console.log('Node version:', process.version);
console.log('Platform:', process.platform);
console.log('CWD:', process.cwd());
console.log('__dirname in source:', __dirname);

let mainWindow: BrowserWindow | null = null;
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
const prodUrl = `file://${path.join(__dirname, '../out/index.html')}`;

console.log('isDev:', isDev);
console.log('devUrl:', devUrl);
console.log('prodUrl:', prodUrl);

/**
 * 创建系统托盘
 */
function createTray() {
  // 临时使用 Electron 默认图标，稍后替换为自定义图标
  const iconPath = path.join(__dirname, '../assets/icon.png');
  let icon;

  try {
    icon = nativeImage.createFromPath(iconPath);
    if (icon.isEmpty()) {
      // 如果自定义图标不存在，使用默认图标
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

  // 点击托盘图标显示/隐藏窗口
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
function createWindow() {
  console.log('createWindow() called');

  // 加载保存的窗口状态
  const { width, height, x, y } = windowState;

  console.log('Creating window with size:', width, 'x', height);

  mainWindow = new BrowserWindow({
    width,
    height,
    // x,  // 不指定位置，让系统自动居中
    // y,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      devTools: isDev, // 开发模式自动打开 DevTools
    },
    title: '投资账户管理系统',
    backgroundColor: '#ffffff',
    show: false, // 先不显示，等窗口准备好后再显示
    center: true, // 强制窗口居中
  });

  console.log('Window created');

  // 加载页面
  if (isDev) {
    console.log('Loading dev URL:', devUrl);
    mainWindow.loadURL(devUrl)
      .then(() => console.log('Dev URL loaded successfully'))
      .catch((err) => console.error('Failed to load dev URL:', err));
    // 开发模式自动打开 DevTools
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadURL(prodUrl);
  }

  // 窗口准备好后显示
  mainWindow.once('ready-to-show', () => {
    console.log('Window ready-to-show event fired');
    console.log('Showing window...');
    mainWindow?.show();
    mainWindow?.focus(); // 确保窗口获得焦点
    console.log('Window shown, isVisible:', mainWindow?.isVisible());
    console.log('Window bounds:', mainWindow?.getBounds());
  });

  // 监听窗口事件
  mainWindow.on('show', () => {
    console.log('Window show event fired');
  });

  mainWindow.on('focus', () => {
    console.log('Window focus event fired');
  });

  // 保存窗口状态
  mainWindow.on('close', () => {
    console.log('Window close event fired');
    if (mainWindow) {
      const bounds = mainWindow.getBounds();
      windowState.width = bounds.width;
      windowState.height = bounds.height;
      windowState.x = bounds.x;
      windowState.y = bounds.y;
    }
  });

  mainWindow.on('closed', () => {
    console.log('Window closed event fired');
    mainWindow = null;
  });

  // 窗口最小化到托盘（可选）
  mainWindow.on('minimize', () => {
    console.log('Window minimized event fired');
    // macOS：不隐藏到托盘，保持最小化状态
    if (!app.dock) {
      // 其他平台：可以选择隐藏到托盘
      // mainWindow?.hide();
    }
  });
}

/**
 * 注册 IPC 事件处理器
 */
function registerIpcHandlers() {
  // 窗口控制
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
}

/**
 * 应用准备就绪
 */
app.whenReady().then(() => {
  console.log('App is ready, initializing...');
  createWindow();
  console.log('Creating menu...');
  createMenu();
  console.log('Creating tray...');
  createTray();
  console.log('Registering IPC handlers...');
  registerIpcHandlers();
  console.log('App initialization complete');

  app.on('activate', () => {
    console.log('Activate event fired');
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
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
  tray?.destroy();
  tray = null;
});

/**
 * 忽略证书错误（仅开发环境）
 */
if (isDev) {
  app.commandLine.appendSwitch('ignore-certificate-errors');
}
