const { contextBridge ,ipcRenderer } = require('electron');


let audioContext = new AudioContext({ sampleRate: 16000 });
let mediaStream;
let audioQueue = [];
contextBridge.exposeInMainWorld('gpAPI', {
  // Useful for visualization, kept as is
  onAudioFrame: (callback) =>
    ipcRenderer.on('custom-audio-frame', (event, buffer) => {
      callback(new Float32Array(buffer));
    }),

  getFakeMicStream: async () => {
    if (mediaStream) return mediaStream;

    const scriptNode = audioContext.createScriptProcessor(4096, 1, 1);
    const dest = audioContext.createMediaStreamDestination();

    scriptNode.connect(dest);
    mediaStream = dest.stream;

    ipcRenderer.on('custom-audio-frame', (event, buffer) => {
      audioQueue.push(new Float32Array(buffer));
    });

    scriptNode.onaudioprocess = (audioProcessingEvent) => {
      const outputBuffer = audioProcessingEvent.outputBuffer.getChannelData(0);
      let outputIndex = 0;

      while (outputIndex < outputBuffer.length) {
        if (audioQueue.length > 0) {
          const nextChunk = audioQueue[0]; 
          const spaceRemaining = outputBuffer.length - outputIndex;
          
          if (nextChunk.length <= spaceRemaining) {
            outputBuffer.set(nextChunk, outputIndex);
            outputIndex += nextChunk.length;
            audioQueue.shift(); // Remove consumed chunk
          } else {
            outputBuffer.set(nextChunk.subarray(0, spaceRemaining), outputIndex);
            audioQueue[0] = nextChunk.subarray(spaceRemaining);
            outputIndex += spaceRemaining;
          }
        } else {
          outputBuffer.fill(0, outputIndex);
          break;
        }
      }
    };

    await audioContext.resume();
    return mediaStream;
  },
});

const origGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);

navigator.mediaDevices.getUserMedia = async (constraints) => {
  if (constraints.audio) {
    try {
      return await window.gpAPI.getFakeMicStream();
    } catch (err) {
      console.error('Error in fake mic stream:', err);
      throw err;
    }
  }
  return origGetUserMedia(constraints);
};

async function clickSendButton() {
  await new Promise((r) => setTimeout(r, 300));
  const sendBtn = await waitForSelector('#composer-submit-button');
  if (sendBtn) {
    sendBtn.click();
    console.log('[PRELOAD] Send button clicked');
  } else {
    console.error('[PRELOAD] Send button not found');
  }
}

async function waitForSelector(selector, timeout = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const el = document.querySelector(selector);
    if (el) return el;
    await new Promise((r) => setTimeout(r, 200));
  }
  return null;
}

ipcRenderer.on('send-message', (_, text) => {
  // Execute inside the   web page
  window.addEventListener('DOMContentLoaded', () => {
    injectMessage(text);
  });

  // If DOM is already loaded
  if (
    document.readyState === 'complete' ||
    document.readyState === 'interactive'
  ) {
    injectMessage(text);
  }
  async function waitForSelector(selector, timeout = 5000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const el = document.querySelector(selector);
      if (el) return el;
      await new Promise((resolve) => setTimeout(resolve, 500)); 
    }
    return null;
  }

  async function injectMessage(text) {
    // console.log('Injecting to DOM:', text);

    const editor = document.querySelector('#prompt-textarea');
    // const btn = document.querySelector('#composer-submit-button');

    if (!editor) {
      console.log('Editor not found');
      return;
    }

    editor.innerHTML = `<p>${text}</p>`;

    editor.dispatchEvent(
      new InputEvent('input', {
        data: text,
        bubbles: true,
        cancelable: true,
        composed: true,
      })
    );
    await clickSendButton();
  }
});

ipcRenderer.on('send-mic-audio', async () => {
  await clickSendButton();
});