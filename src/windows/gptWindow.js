import { BrowserWindow } from "electron";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createChatGPTWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    x:0,
    y:251,
    frame: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    focusable: false,
    resizable:true,
    webPreferences: {
      preload: path.join(__dirname, "../preload/gptPreload.js"),
      nodeIntegration: true,
      contextIsolation: true,
      webSecurity: false,
      sandbox: false,
    },
  });

  win.loadURL("https://chatgpt.com");
  win.setContentProtection(true);
  win.setIgnoreMouseEvents(true);

  if (process.platform === 'darwin') {
    win.setWindowButtonVisibility(false);
    win.setHiddenInMissionControl(true);
    win.setAlwaysOnTop(true, 'screen-saver');
  }
  return win;
}