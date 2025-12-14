import path from 'path';
import fs from 'fs';
import { app, ipcMain, session } from 'electron';
import { fileURLToPath } from 'url';
import {
  createMiniWindow,
  createPreviewWindow,
} from './src/windows/windows.js';
import { createLauncherWindow } from './src/windows/launcherWindow.js';
import { createChatGPTWindow } from './src/windows/gptWindow.js';
import { createGeminiWindow } from './src/windows/geminiWindow.js';
import {
  registerShortCuts,
  unregisterShortcuts,
} from './src/core/shortcutsManager.js';
import {
  onScreenShotTriggered,
  getCaptureMode,
} from './src/controller/screenshotController.js';
import {
  onDeleteQueue,
  deleteOneScreenshot,
} from './src/controller/queueController.js';
import {
  haltMouseEvent,
  scrollControl,
} from './src/controller/interactiveController.js';
import { sendPromptToRenderer } from './src/controller/senderController.js';
import {
  setupLogger,
  logNativeModules,
  logAsarContents,
} from './src/utils/logger.js';
import { WindowsScreenShotHelper } from './src/core/screenshotHelper.js';
const helper = new WindowsScreenShotHelper();
//Locating dir in dev env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let launcherWin, miniWin, previewWin;
let mainWindow, PROVIDER;

const isDev = !app.isPackaged;
const OCR_PATH = isDev
  ? path.join(__dirname, './ocr_output.txt')
  : path.join(app.getPath('userData'), 'ocr_output.txt');

if (!fs.existsSync(OCR_PATH)) {
  fs.writeFileSync(OCR_PATH, '');
}

const PROMPT_FILE = isDev
  ? path.join(__dirname, './prompt.json')
  : path.join(app.getPath('userData'), 'prompt.json');

if (!fs.existsSync(PROMPT_FILE)) {
  fs.writeFileSync(
    PROMPT_FILE,
    JSON.stringify(
      {
        chatgpt: '',
        gemini: '',
        updatedAt: Date.now(),
      },
      null,
      2
    )
  );
}
// App startup
app.whenReady().then(() => {
  const launcher = createLauncherWindow();
  launcherWin = launcher.win;

  ipcMain.on('provider:choose', (event, provider) => {
    if (provider === 'chatgpt') {
      miniWin = createMiniWindow();
      previewWin = createPreviewWindow();
      mainWindow = createChatGPTWindow();
      PROVIDER = 'chatgpt';
      // mainWindow.webContents.openDevTools({mode: 'detach' })
    } else {
      previewWin = createPreviewWindow();
      miniWin = createMiniWindow();
      mainWindow = createGeminiWindow();
      PROVIDER = 'gemini';
      // mainWindow.webContents.openDevTools({mode: 'detach' })
    }
    launcher.closeProgrammatically();
    unregisterShortcuts();
    registerShortCuts(
      helper,
      PROVIDER,
      OCR_PATH,
      PROMPT_FILE,
      previewWin,
      miniWin,
      mainWindow,
      getCaptureMode,
      sendPromptToRenderer,
      onScreenShotTriggered,
      scrollControl,
      onDeleteQueue,
      deleteOneScreenshot,
      haltMouseEvent
    );
    session.defaultSession.setPermissionRequestHandler(
      (webContents, permission, callback) => {
        if (permission === 'media') {
          callback(true); // allow mic
        } else {
          callback(false);
        }
      }
    );
  });
  ipcMain.on('prompt:custom:set', (_, { provider, prompt }) => {
    if (!provider || typeof prompt !== 'string') return;

    const data = JSON.parse(fs.readFileSync(PROMPT_FILE, 'utf-8'));

    data[provider] = prompt.trim();
    data.updatedAt = Date.now();

    fs.writeFileSync(PROMPT_FILE, JSON.stringify(data, null, 2));
  });
  ipcMain.handle('prompt:get', () => {
    return JSON.parse(fs.readFileSync(PROMPT_FILE, 'utf-8'));
  });

  // setupLogger(app, __dirname);
  // logNativeModules(__dirname, app);

  //not dev env _ log asar
  if (!app.isPackaged) logAsarContents(__dirname, app);
  // mainWindow.webContents.openDevTools({ mode: 'detach' });
});
app.commandLine.appendSwitch('high-dpi-support', '1');
app.commandLine.appendSwitch('force-device-scale-factor', '1');
//Prevent app from closing on mac
app.on('window-all-closed', () => {
  unregisterShortcuts();
  if (process.platform !== 'darwin') app.quit();
});
