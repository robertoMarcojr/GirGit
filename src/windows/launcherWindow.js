import { BrowserWindow, app } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export function createLauncherWindow() {
  let allowQuit = false;
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    resizable: true,
    movable: true,
    alwaysOnTop: false,
    frame: true,
    skipTaskbar: false,
    transparent: true,
    backgroundColor: '#00000000',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/launcherPreload.js'),
      // contextIsolation: true,
      nodeIntegration: false,
      // sandbox: false,
    },
  });

  win.loadFile(path.join(__dirname, '../ui/launcherWindow.html'));
  win.on('close', (e) => {
    if (!allowQuit) {
      app.quit();
    }
  });
  return {
    win,
    closeProgrammatically: () => {
      allowQuit = true;
      win.close();
    },
  };
}
