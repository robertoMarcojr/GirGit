export function setupTray(previewWindow, miniWindow, mainWindow) {
  //Tray setup
  const iconPath =
    process.platform === 'win32'
      ? path.join(__dirname, '../../assets/icons/win/icon.png')
      : path.join(__dirname, '../../assets/icons/mac/icon.icns');
  tray = new Tray(iconPath);
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show',
      click: () => {
        previewWindow.showInactive();
        miniWindow.showInactive();
        mainWindow.showInactive();

      },
    }, //showInactive open's window without loosing the focus on other apps
    {
      label: 'Hide',
      click: () => {
        mainWindow.hide();
      },
    },
    { label: 'Quit', click: () => app.quit() },
  ]);
  tray.setContextMenu(contextMenu);
  tray.setToolTip('StealthWindow');
}