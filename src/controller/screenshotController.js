import { extractTextFromImage } from '../core/ocrHelper.js';


// Capture screenshot
export async function onScreenShotTriggered(
  previewWindow,
  miniWindow,
  mainWindow,
  mode,
  helper,
) {
  try {
    previewWindow.hide();
    miniWindow.hide();
    mainWindow.hide();
    const path = await helper.takeScreenShot(mode); // returns file path
    const preview = await helper.getPreview(path); // returns base64 string
    const { x, y } = miniWindow.getBounds();
    previewWindow.setBounds({
      x: x,
      y: y - 120 - 1,
    });
    previewWindow.showInactive();
    miniWindow.showInactive();
    previewWindow.webContents.send('image-preview', preview);
    await extractTextFromImage(path);
    miniWindow.webContents.send('message-col', 'EXTRACTED');
    mainWindow.showInactive();
    miniWindow.webContents.send('command', 'CTRL + ENTER');
  } catch (err) {
    console.error('Failed to take screenshot:', err);
  }
}

export function getCaptureMode(miniWindow, mode) {
  console.log(mode)
  miniWindow.webContents.send('message-col', 'CAPTURE MODE: ' + mode);
}