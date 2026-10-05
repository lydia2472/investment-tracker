const { app, BrowserWindow } = require('electron');
const fs = require('fs');

app.whenReady().then(async () => {
  // 直接读 localStorage 需要 dev server；这里改读 persist-store.json 的 electron storage
  // 但其实渲染进程的 localStorage 才是真数据。我们用隐藏窗口加载 dev url 读 localStorage
  const win = new BrowserWindow({ show: false, webPreferences: { contextIsolation: true } });
  try {
    await win.loadURL('http://localhost:3000');
    // 等数据加载
    await new Promise(r => setTimeout(r, 4000));
    const data = await win.webContents.executeJavaScript(`localStorage.getItem('snapshot-storage')`);
    if (!data) {
      console.log('NO snapshot-storage in localStorage');
    } else {
      const parsed = JSON.parse(data);
      const snaps = parsed.state.snapshots;
      const out = snaps.map(s => ({
        accountId: s.accountId,
        snapshotDate: s.snapshotDate,
        createdAt: s.createdAt,
        balance: s.balance,
        note: s.note,
      }));
      console.log('TOTAL SNAPSHOTS:', out.length);
      console.log(JSON.stringify(out.slice(0, 30), null, 2));
      // 统计
      let same = 0, diff = 0;
      out.forEach(s => {
        const a = new Date(s.snapshotDate).getTime();
        const b = new Date(s.createdAt).getTime();
        if (Math.abs(a-b) < 12*3600*1000) same++; else diff++;
      });
      console.log(`\nsnapshotDate≈createdAt(同日): ${same}/${out.length}, 不同: ${diff}/${out.length}`);
    }
  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    win.destroy();
    app.quit();
  }
});
