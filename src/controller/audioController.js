import { speechGate } from './speechGate.js';

function emitToAI(evt, mainWindow) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  if (evt && evt.audio) {
    mainWindow.webContents.send('custom-audio-frame', evt.audio);
  } else if (evt.type !== 'audio') {
    // console.log('[AUDIO EVT]', evt);
  }
}

export function audioStartController(audioAddon, mainWindow, PROVIDER) {
   if (!mainWindow || mainWindow.isDestroyed()) return;
    console.log(PROVIDER);
    if (PROVIDER === 'gemini') {
      mainWindow.webContents
        .executeJavaScript(
          `
        (function () {
          const micBtn = document.querySelector('button[data-node-type="speech_dictation_mic_button"]');
          if (micBtn) micBtn.click();
          })();
          `
        )
        .catch(() => {});
    } else if (PROVIDER === 'chatgpt') {
      console.log('starting in gpt');
      mainWindow.webContents
        .executeJavaScript(
          `
     (function () {
        const micBtn = document.querySelector('button[aria-label="Dictate button"]');
        if (micBtn) {
          micBtn.click();
        }
      })();
    `
        )
        .then(() => console.log('Mic ON'))
        .catch(() => {});
}

  const handleGateEvent = (evt) => emitToAI(evt, mainWindow);
  const micGate = new speechGate('user', handleGateEvent);
  const systemGate = new speechGate('system', handleGateEvent);

  audioAddon.registerAudioCallback((audioData) => {
    if (!mainWindow || mainWindow.isDestroyed()) return;

    try {
      if (audioData.isLoopback) {
        systemGate.handleFrame(audioData);
      } else {
        micGate.handleFrame(audioData);
      }
    } catch (err) {
      // console.error("Audio Processing Error:", err);
    }
  });

  audioAddon.startCapture();

  mainWindow.once('closed', () => {
    try {
      audioAddon.stopCapture();
    } catch (e) {
      /* ignore */
    }
  });
}

export async function audioStopController(audioAddon, mainWindow, PROVIDER) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  try {
    audioAddon.stopCapture();
  } catch (e) {
    /* ignore */
  }
  if (PROVIDER === 'gemini') {
    mainWindow.webContents
      .executeJavaScript(
        `
      (function () {
        const micBtn = document.querySelector('button[data-node-type="speech_dictation_mic_button"]');
        if (micBtn) micBtn.click();
        })();
        `
      )
      .catch(() => {});
    try {
      mainWindow.webContents.send('send-mic-audio');
    } catch (e) {}
  } else {
    mainWindow.webContents
      .executeJavaScript(
        `
     (function () {
        const micBtn = document.querySelector('button[aria-label="Submit dictation"]');
        if (micBtn) {
          micBtn.click();
        }
      })();
    `
      )
      .catch(() => {});
    try {
      mainWindow.webContents.send('send-mic-audio');
    } catch (e) {}
  }
}
