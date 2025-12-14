import { BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createMiniWindow() {
  const win = new BrowserWindow({
    width: 600,
    height: 100,
    x: 0,
    y: 150,
    frame: false,
    backgroundColor: '#00000000',
    hasShadow: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    focusable: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      nodeIntegration: true,
      contextIsolation: true,
      webSecurity: false,
      sandbox: false,
    },
  });

  win.setMenu(null);
  win.loadFile(path.join(__dirname, '../ui/miniWindow.html'));
  win.setContentProtection(true);
  win.setIgnoreMouseEvents(true);

  if (process.platform === 'darwin') {
    win.setWindowButtonVisibility(false);
    win.setHiddenInMissionControl(true);
    win.setAlwaysOnTop(true, 'screen-saver');
  }

  // win.hide();
  return win;
}
export function createPreviewWindow() {
  const win = new BrowserWindow({
    maxWidth: 600,
    maxHeight: 100,
    
    frame: false,
    hasShadow: false,
    backgroundColor: '#00000000',
    // transparent:true,
    skipTaskbar: true,
    alwaysOnTop: true,
    focusable: false,
    resizable:true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      nodeIntegration: true,
      contextIsolation: true,
      webSecurity: false,
      sandbox: false,
    },
  });

  win.loadFile(path.join(__dirname, '../ui/previewWindow.html'));
  win.setContentProtection(true);
  win.setIgnoreMouseEvents(true);
  if (process.platform === 'darwin') {
    win.setWindowButtonVisibility(false);
    win.setHiddenInMissionControl(true);
    win.setAlwaysOnTop(true, 'screen-saver');
  }
  win.hide();
  return win;
}
