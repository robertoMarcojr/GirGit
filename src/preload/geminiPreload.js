const { ipcRenderer } = require('electron');

// console.log('Gemini preload loaded');
ipcRenderer.on('send-message', async (_, text) => {
  console.log('[PRELOAD] Received text:', text);
  await injectMessage(text);
});

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
  console.log('[PRELOAD] Injecting message safely');

  const editor = await waitForSelector(
    '.ql-editor.textarea.new-input-ui'
  );

  if (!editor) {
    console.error('[PRELOAD] Editor not found');
    return;
  }

  editor.focus();

  while (editor.firstChild) {
    editor.removeChild(editor.firstChild);
  }
  
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

  await new Promise((r) => setTimeout(r, 300));

  const sendBtn = await waitForSelector('button.send-button');
  if (!sendBtn) {
    console.error('[PRELOAD] Send button not found');
    return;
  }

  sendBtn.click();
  console.log('[PRELOAD] Message sent');
}
