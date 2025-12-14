const { ipcRenderer } = require('electron');

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
    const btn = await waitForSelector('#composer-submit-button', 5000);
    if (btn) {
      btn.click();
      console.log('Button clicked');
    } else {
      console.log('Send button not found');
    }
  }
});
