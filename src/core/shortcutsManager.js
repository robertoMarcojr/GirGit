import { globalShortcut, app } from 'electron';

let currModeIndex = 0;
const modes = ['LEFT', 'RIGHT', 'FULL'];

let toggleMouse = true;

function getCurrentMode() {
  return modes[currModeIndex];
}

function cycleMode() {
  currModeIndex = (currModeIndex + 1) % modes.length;
  const mode = getCurrentMode();
}

export function registerShortCuts(
  helper,
  PROVIDER,
  OCR_PATH,
  PROMPT_FILE,
  previewWindow,
  miniWindow,
  mainWindow,
  getCaptureMode,
  sendPromptToRenderer,
  onScreenShotTriggered,
  scrollControl,
  onDeleteQueue,
  deleteOneScreenshot,
  haltMouseEvent,
) {
  const step = 50;
  //movement
  globalShortcut.register('Control+Up', () => {
    const [mainX, mainY] = mainWindow.getPosition();
    mainWindow.setPosition(mainX, mainY - step);
    const [miniX, miniY] = miniWindow.getPosition();
    miniWindow.setPosition(miniX, miniY - step);
    const [preX, preY] = previewWindow.getPosition();
    previewWindow.setPosition(preX, preY - 50);
  });

  globalShortcut.register('Control+Down', () => {
    const [mainX, mainY] = mainWindow.getPosition();
    mainWindow.setPosition(mainX, mainY + step);
    const [miniX, miniY] = miniWindow.getPosition();
    miniWindow.setPosition(miniX, miniY + step);
    const [preX, preY] = previewWindow.getPosition();
    previewWindow.setPosition(preX, preY + step);
  });

  globalShortcut.register('Control+Left', () => {
    const [mainX, mainY] = mainWindow.getPosition();
    mainWindow.setPosition(mainX - step, mainY);
    const [miniX, miniY] = miniWindow.getPosition();
    miniWindow.setPosition(miniX - step, miniY);
    const [preX, preY] = previewWindow.getPosition();
    previewWindow.setPosition(preX - step, preY);
  });

  globalShortcut.register('Control+Right', () => {
    const [mainX, mainY] = mainWindow.getPosition();
    mainWindow.setPosition(mainX + step, mainY);
    const [miniX, miniY] = miniWindow.getPosition();
    miniWindow.setPosition(miniX + step, miniY);
    const [preX, preY] = previewWindow.getPosition();
    previewWindow.setPosition(preX + step, preY);
  });

  //scroll page
  globalShortcut.register('Control+Shift+Up', () => {
    scrollControl(mainWindow,'Up');
  });
  globalShortcut.register('Control+Shift+Down', () => {
    scrollControl(mainWindow,'Down');
  });

  //off or on
  globalShortcut.register('Control+H', () => {
    mainWindow.hide();
  });
  globalShortcut.register('Control+S', () => {
    
    mainWindow.showInactive();
  });
  globalShortcut.register('Control+Q', () => {
    app.quit();
  });
  globalShortcut.register('Control+R', () => {
    onDeleteQueue(previewWindow, miniWindow, OCR_PATH, helper);
  });
  globalShortcut.register('Control+D', () => {
    deleteOneScreenshot(previewWindow, miniWindow, helper);
  });
  

  //mouse
  globalShortcut.register('Control+Shift+I', () => {
    toggleMouse = !toggleMouse;
    haltMouseEvent(previewWindow,miniWindow, mainWindow,toggleMouse);
  });

  //cycle Capture modes
  globalShortcut.register('Control+M', () => {
    cycleMode();
    const mode = getCurrentMode();
    getCaptureMode(miniWindow, mode);
  });

  globalShortcut.register('Control+L', () => {
    const mode = getCurrentMode();
    onScreenShotTriggered(previewWindow, miniWindow, mainWindow,mode, helper);
  });

  //LLM Caller
  globalShortcut.register('Control+Enter', () => {
    console.log('sending data')
    sendPromptToRenderer(miniWindow, mainWindow, OCR_PATH, PROMPT_FILE, PROVIDER);
  });
}
//Unregister all shortcuts
export function unregisterShortcuts() {
  globalShortcut.unregisterAll();
}
