export function haltMouseEvent(
  previewWindow,
  miniWindow,
  mainWindow,
  toggleMouse
) {
  if (toggleMouse) {
    mainWindow.setIgnoreMouseEvents(true, { forward: true });
    mainWindow.setFocusable(false);
    miniWindow.setIgnoreMouseEvents(true, { forward: true });
    miniWindow.setFocusable(false);
    previewWindow.setIgnoreMouseEvents(true, { forward: true });
    previewWindow.setFocusable(false);
  } else {
    mainWindow.setIgnoreMouseEvents(false, { forward: true });
    mainWindow.setFocusable(true);
    miniWindow.setIgnoreMouseEvents(false, { forward: true });
    miniWindow.setFocusable(true);
    previewWindow.setIgnoreMouseEvents(false, { forward: true });
    previewWindow.setFocusable(true);
  }
  miniWindow.webContents.send('mouse', toggleMouse);
}
export function scrollControl(mainWindow, direction) {
  const delta = direction === 'Up' ? -250 : 250;

  mainWindow.webContents
    .executeJavaScript(
      `
  (function () {
    const delta = ${delta};

    const main = document.getElementById('main');
    if (main) {
      main.style.overflowY = 'auto';
      main.style.height = '100vh';
    }

    const gptContainer =
      document.querySelector('main.relative.flex-1.overflow-y-auto') ||
      main;

    if (gptContainer && gptContainer.scrollHeight > gptContainer.clientHeight) {
      gptContainer.scrollBy({ top: delta, behavior: 'smooth' });
      return 'Scrolled ChatGPT container';
    }

    const geminiContainer =
      document.querySelector('infinite-scroller.chat-history') ||
      document.querySelector('.chat-history');

    if (geminiContainer) {
      geminiContainer.scrollBy({ top: delta, behavior: 'smooth' });
      return 'Scrolled Gemini container';
    }

    document.documentElement.scrollBy({ top: delta, behavior: 'smooth' });
    return 'Scrolled document';
  })();
`
    )
    .then((res) => console.log('[SCROLL]', res))
    .catch((err) => console.error('[SCROLL ERROR]', err));
}
