import { BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createGeminiWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    x: 0,
    y: 251,
    frame: false,
    transparent: true,
    skipTaskbar: true,
    alwaysOnTop: true,
    focusable: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/geminiPreload.js'),
      contextIsolation: true,
      nodeIntegration: true,
      sandbox: false,
    },
  });

  win.loadURL('https://gemini.google.com/app');
  win.setContentProtection(true);
  win.setIgnoreMouseEvents(true);

  if (process.platform === 'darwin') {
    win.setWindowButtonVisibility(false);
    win.setHiddenInMissionControl(true);
    win.setAlwaysOnTop(true, 'screen-saver');
  }
  return win;
}
