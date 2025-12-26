const { contextBridge, ipcRenderer } = require('electron');

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


ipcRenderer.on('send-message', async (_, text) => {
  console.log('[PRELOAD] Received text:', text);
  await injectMessage(text);
});

async function clickSendButton() {
  await new Promise((r) => setTimeout(r, 300));
  const sendBtn = await waitForSelector('button.send-button');
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

async function injectMessage(text) {
  const editor = await waitForSelector('.ql-editor.textarea.new-input-ui');
  if (!editor) return;

  editor.focus();
  
  while (editor.firstChild) editor.removeChild(editor.firstChild);

  const textNode = document.createTextNode(text);
  editor.appendChild(textNode);

  editor.dispatchEvent(
    new InputEvent('input', {
      bubbles: true,
      composed: true,
      inputType: 'insertText',
      data: text,
    })
  );

  await clickSendButton();
}

ipcRenderer.on('send-mic-audio', async () => {
  await clickSendButton();
});