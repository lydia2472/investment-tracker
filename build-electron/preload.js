"use strict";

// electron/preload.ts
var import_electron = require("electron");
import_electron.contextBridge.exposeInMainWorld("electronAPI", {
  // 窗口控制
  minimize: () => import_electron.ipcRenderer.send("window-minimize"),
  maximize: () => import_electron.ipcRenderer.send("window-maximize"),
  close: () => import_electron.ipcRenderer.send("window-close"),
  // 持久化存储
  storage: {
    getItem: (key) => import_electron.ipcRenderer.invoke("storage-get", key),
    setItem: (key, value) => import_electron.ipcRenderer.invoke("storage-set", key, value),
    removeItem: (key) => import_electron.ipcRenderer.invoke("storage-remove", key)
  },
  // 平台信息
  platform: process.platform,
  // 版本信息
  versions: process.versions,
  // 环境信息
  isDev: process.env.NODE_ENV === "development"
});
