"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// electron/main.ts
var import_electron = require("electron");
var path = __toESM(require("path"));
var fs = __toESM(require("fs"));
console.log("Electron main process starting...");
console.log("Node version:", process.version);
console.log("Platform:", process.platform);
console.log("CWD:", process.cwd());
console.log("__dirname in source:", __dirname);
var mainWindow = null;
var splashWindow = null;
var tray = null;
var windowState = {
  width: 1200,
  height: 800,
  x: void 0,
  y: void 0
};
var isDev = process.env.NODE_ENV === "development";
var devUrl = "http://localhost:3000";
var outDir = path.join(__dirname, "../out");
console.log("isDev:", isDev);
console.log("devUrl:", devUrl);
console.log("outDir:", outDir);
var PROTOCOL_SCHEME = "app";
var PROTOCOL_HOST = "investment-tracker";
var SPLASH_BACKGROUND = "#f8f8f0";
var PERSISTED_STORAGE_FLUSH_DELAY_MS = 200;
var persistedStorageCache = null;
var persistedStorageDirty = false;
var persistedStorageFlushTimer = null;
function getPersistedStoragePath() {
  return path.join(import_electron.app.getPath("userData"), "persist-store.json");
}
function readPersistedStorageFromDisk() {
  const storagePath = getPersistedStoragePath();
  try {
    if (!fs.existsSync(storagePath)) {
      return {};
    }
    const raw = fs.readFileSync(storagePath, "utf8");
    if (!raw.trim()) {
      return {};
    }
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
  } catch (error) {
    console.error("Failed to read persisted storage:", error);
  }
  return {};
}
function writePersistedStorageToDisk(storage) {
  const storagePath = getPersistedStoragePath();
  try {
    fs.mkdirSync(path.dirname(storagePath), { recursive: true });
    fs.writeFileSync(storagePath, JSON.stringify(storage, null, 2), "utf8");
  } catch (error) {
    console.error("Failed to write persisted storage:", error);
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
      console.error("Failed to flush persisted storage:", error);
    }
  }, PERSISTED_STORAGE_FLUSH_DELAY_MS);
}
function showMainWindow(reason) {
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
  splashWindow = new import_electron.BrowserWindow({
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
      devTools: false
    }
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
            <h1>\u6B63\u5728\u8F7D\u5165\u4F60\u7684\u6295\u8D44\u6570\u636E</h1>
            <p>\u521D\u59CB\u5316\u8D26\u6237\u3001\u4EA4\u6613\u3001\u5FEB\u7167\u548C\u7EDF\u8BA1\u89C6\u56FE\u3002\u7A97\u53E3\u51C6\u5907\u597D\u540E\u4F1A\u81EA\u52A8\u8FDB\u5165\u4E3B\u754C\u9762\u3002</p>
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
  splashWindow.on("closed", () => {
    splashWindow = null;
  });
  return splashWindow;
}
import_electron.protocol.registerSchemesAsPrivileged([
  {
    scheme: PROTOCOL_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      allowServiceWorkers: true,
      stream: true
    }
  }
]);
function registerProtocol() {
  import_electron.protocol.registerFileProtocol(PROTOCOL_SCHEME, (request, callback) => {
    const url = new URL(request.url);
    let requestPath = url.pathname;
    console.log("Protocol request:", request.url, "->", requestPath);
    if (requestPath.startsWith("/")) {
      requestPath = requestPath.slice(1);
    }
    if (requestPath === "" || requestPath === "/") {
      const indexPath = path.join(outDir, "index.html");
      console.log("Serving index.html:", indexPath);
      callback({ path: indexPath });
      return;
    }
    if (!path.extname(requestPath)) {
      const routeHtmlPath = path.join(outDir, `${requestPath}.html`);
      if (fs.existsSync(routeHtmlPath) && fs.statSync(routeHtmlPath).isFile()) {
        console.log("Serving route html:", routeHtmlPath);
        callback({ path: routeHtmlPath });
        return;
      }
      const indexPath = path.join(outDir, "index.html");
      console.log("Falling back to index.html:", indexPath);
      callback({ path: indexPath });
      return;
    }
    const filePath = path.join(outDir, requestPath);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      console.log("Serving file:", filePath);
      callback({ path: filePath });
    } else {
      console.error("File not found:", filePath);
      const indexPath = path.join(outDir, "index.html");
      callback({ path: indexPath });
    }
  });
}
function createTray() {
  const iconPath = path.join(__dirname, "../assets/icon.png");
  let icon;
  try {
    icon = import_electron.nativeImage.createFromPath(iconPath);
    if (icon.isEmpty()) {
      icon = import_electron.nativeImage.createEmpty();
    }
  } catch {
    icon = import_electron.nativeImage.createEmpty();
  }
  tray = new import_electron.Tray(icon);
  const contextMenu = import_electron.Menu.buildFromTemplate([
    {
      label: "\u663E\u793A\u7A97\u53E3",
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
      label: "\u9690\u85CF\u7A97\u53E3",
      click: () => {
        if (mainWindow) {
          mainWindow.hide();
        }
      }
    },
    { type: "separator" },
    {
      label: "\u9000\u51FA\u5E94\u7528",
      click: () => {
        import_electron.app.quit();
      }
    }
  ]);
  tray.setToolTip("\u6295\u8D44\u8D26\u6237\u7BA1\u7406\u7CFB\u7EDF");
  tray.setContextMenu(contextMenu);
  tray.on("click", () => {
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
function createMenu() {
  const template = [
    {
      label: "\u6295\u8D44\u8D26\u6237\u7BA1\u7406",
      submenu: [
        { label: "\u5173\u4E8E", role: "about" },
        { type: "separator" },
        { label: "\u9690\u85CF", role: "hide" },
        { label: "\u663E\u793A\u5168\u90E8", role: "unhide" },
        { type: "separator" },
        { label: "\u9000\u51FA", role: "quit" }
      ]
    },
    {
      label: "\u7F16\u8F91",
      submenu: [
        { label: "\u64A4\u9500", role: "undo" },
        { label: "\u91CD\u505A", role: "redo" },
        { type: "separator" },
        { label: "\u526A\u5207", role: "cut" },
        { label: "\u590D\u5236", role: "copy" },
        { label: "\u7C98\u8D34", role: "paste" },
        { label: "\u5168\u9009", role: "selectAll" }
      ]
    },
    {
      label: "\u89C6\u56FE",
      submenu: [
        { label: "\u91CD\u65B0\u52A0\u8F7D", role: "reload" },
        { label: "\u5F3A\u5236\u91CD\u65B0\u52A0\u8F7D", role: "forceReload" },
        { label: "\u5F00\u53D1\u8005\u5DE5\u5177", role: "toggleDevTools" },
        { type: "separator" },
        { label: "\u5B9E\u9645\u5927\u5C0F", role: "resetZoom" },
        { label: "\u653E\u5927", role: "zoomIn" },
        { label: "\u7F29\u5C0F", role: "zoomOut" },
        { type: "separator" },
        { label: "\u5168\u5C4F", role: "togglefullscreen" }
      ]
    },
    {
      label: "\u7A97\u53E3",
      submenu: [
        { label: "\u6700\u5C0F\u5316", role: "minimize" },
        { label: "\u5173\u95ED", role: "close" },
        { type: "separator" },
        { label: "\u524D\u7F6E\u6240\u6709\u7A97\u53E3", role: "front" }
      ]
    }
  ];
  const menu = import_electron.Menu.buildFromTemplate(template);
  import_electron.Menu.setApplicationMenu(menu);
}
async function createWindow() {
  console.log("createWindow() called");
  const { width, height } = windowState;
  console.log("Creating window with size:", width, "x", height);
  createSplashWindow();
  mainWindow = new import_electron.BrowserWindow({
    width,
    height,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
      devTools: true,
      // 始终允许打开开发者工具（菜单栏 → 开发者工具），方便调试数据问题
      webSecurity: true
      // 启用 web 安全
    },
    title: "\u6295\u8D44\u8D26\u6237\u7BA1\u7406\u7CFB\u7EDF",
    backgroundColor: SPLASH_BACKGROUND,
    show: false,
    center: true
  });
  console.log("Window created");
  mainWindow.webContents.on("did-finish-load", () => {
    console.log("Page loaded successfully");
  });
  mainWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (!isMainFrame) return;
    console.error("Main frame failed to load:", errorCode, errorDescription, validatedURL);
  });
  mainWindow.webContents.on("console-message", (event, level, message, line, sourceId) => {
    console.log(`[Renderer Console] ${message}`);
  });
  mainWindow.once("ready-to-show", () => {
    console.log("Window ready-to-show event fired");
    showMainWindow("ready-to-show");
    setTimeout(() => {
      closeSplashWindow();
    }, 120);
  });
  if (isDev) {
    console.log("Loading dev URL:", devUrl);
    await mainWindow.loadURL(devUrl);
    mainWindow.webContents.openDevTools();
  } else {
    const appUrl = `${PROTOCOL_SCHEME}://${PROTOCOL_HOST}/`;
    console.log("Loading production URL:", appUrl);
    await mainWindow.loadURL(appUrl);
  }
  if (mainWindow && !mainWindow.isVisible()) {
    showMainWindow("post-load");
    closeSplashWindow();
  }
  mainWindow.on("close", () => {
    if (mainWindow) {
      const bounds = mainWindow.getBounds();
      windowState.width = bounds.width;
      windowState.height = bounds.height;
      windowState.x = bounds.x;
      windowState.y = bounds.y;
    }
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
function registerIpcHandlers() {
  import_electron.ipcMain.on("window-minimize", () => {
    mainWindow?.minimize();
  });
  import_electron.ipcMain.on("window-maximize", () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });
  import_electron.ipcMain.on("window-close", () => {
    mainWindow?.close();
  });
  import_electron.ipcMain.handle("storage-get", async (_event, key) => {
    const storage = getPersistedStorageCache();
    return storage[key] ?? null;
  });
  import_electron.ipcMain.handle("storage-set", async (_event, key, value) => {
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
  import_electron.ipcMain.handle("storage-remove", async (_event, key) => {
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
import_electron.app.whenReady().then(() => {
  console.log("App is ready, initializing...");
  getPersistedStorageCache();
  registerIpcHandlers();
  if (!isDev) {
    console.log("Registering custom protocol:", PROTOCOL_SCHEME);
    registerProtocol();
  }
  createWindow();
  createMenu();
  createTray();
  console.log("App initialization complete");
  import_electron.app.on("activate", () => {
    if (import_electron.BrowserWindow.getAllWindows().length === 0) {
      void createWindow();
      return;
    }
    showMainWindow("app-activate");
  });
}).catch((err) => {
  console.error("Error in app.whenReady():", err);
});
import_electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    import_electron.app.quit();
  }
});
import_electron.app.on("will-quit", () => {
  if (persistedStorageFlushTimer) {
    clearTimeout(persistedStorageFlushTimer);
    persistedStorageFlushTimer = null;
  }
  try {
    flushPersistedStorage();
  } catch (error) {
    console.error("Failed to flush persisted storage before quit:", error);
  }
  closeSplashWindow();
  tray?.destroy();
  tray = null;
});
if (isDev) {
  import_electron.app.commandLine.appendSwitch("ignore-certificate-errors");
}
