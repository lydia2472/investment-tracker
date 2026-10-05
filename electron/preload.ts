import { contextBridge, ipcRenderer } from 'electron';

/**
 * 暴露安全的 API 到渲染进程
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // 窗口控制
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  // 持久化存储
  storage: {
    getItem: (key: string) => ipcRenderer.invoke('storage-get', key) as Promise<string | null>,
    setItem: (key: string, value: string) =>
      ipcRenderer.invoke('storage-set', key, value) as Promise<boolean>,
    removeItem: (key: string) => ipcRenderer.invoke('storage-remove', key) as Promise<boolean>,
  },

  // 平台信息
  platform: process.platform,

  // 版本信息
  versions: process.versions,

  // 环境信息
  isDev: process.env.NODE_ENV === 'development',
});

/**
 * TypeScript 类型声明
 */
declare global {
  interface Window {
    electronAPI: {
      minimize: () => void;
      maximize: () => void;
      close: () => void;
      storage: {
        getItem: (key: string) => Promise<string | null>;
        setItem: (key: string, value: string) => Promise<boolean>;
        removeItem: (key: string) => Promise<boolean>;
      };
      platform: string;
      versions: NodeJS.ProcessVersions;
      isDev: boolean;
    };
  }
}
