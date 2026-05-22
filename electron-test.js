const electron = require('electron');
const { app, BrowserWindow } = electron;

console.log('Electron test script starting...');
console.log('Node version:', process.version);
console.log('Electron version:', process.versions.electron);
console.log('Platform:', process.platform);
console.log('CWD:', process.cwd());

app.whenReady().then(() => {
  console.log('App is ready!');

  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  console.log('Window created, loading URL...');

  win.loadURL('http://localhost:3000')
    .then(() => console.log('URL loaded successfully!'))
    .catch(err => console.error('Failed to load URL:', err));

  win.once('ready-to-show', () => {
    console.log('Window ready to show!');
    win.show();
  });

  win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Page failed to load:', errorCode, errorDescription);
  });

  win.webContents.on('did-finish-load', () => {
    console.log('Page finished loading!');
  });
});

app.on('window-all-closed', () => {
  console.log('All windows closed');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

console.log('Test script setup complete');
