const { app, BrowserWindow, session } = require('electron');
const path = require('path');

// 关键：用和运行中 app 相同的 userData，确保读到同一份 localStorage
app.setPath('userData', path.join(app.getPath('appData'), 'investment-tracker-temp'));

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, webPreferences: { contextIsolation: true, partition: 'persist:default' } });
  try {
    await win.loadURL('http://localhost:3000');
    await new Promise(r => setTimeout(r, 5000));
    const keys = await win.webContents.executeJavaScript(`JSON.stringify(Object.keys(localStorage))`);
    console.log('localStorage keys:', keys);
    const data = await win.webContents.executeJavaScript(`localStorage.getItem('snapshot-storage')`);
    if (!data) { console.log('snapshot-storage: NULL'); }
    else {
      const parsed = JSON.parse(data);
      const snaps = parsed?.state?.snapshots || [];
      console.log('TOTAL SNAPSHOTS:', snaps.length);
      const out = snaps.map(s => ({
        snapshotDate: new Date(s.snapshotDate).toISOString(),
        createdAt: new Date(s.createdAt).toISOString(),
        balance: s.balance,
        note: s.note,
      }));
      console.log(JSON.stringify(out.slice(0, 20), null, 2));
      let sameDay=0, diffDay=0;
      snaps.forEach(s=>{
        if(new Date(s.snapshotDate).toDateString()===new Date(s.createdAt).toDateString()) sameDay++;
        else diffDay++;
      });
      console.log(`\n同日: ${sameDay}/${snaps.length}, 不同日: ${diffDay}/${snaps.length}`);
    }
  } catch(e) { console.error('ERR:', e.message); }
  finally { win.destroy(); app.quit(); }
});
