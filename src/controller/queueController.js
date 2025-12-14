import fs from 'fs';

export function onDeleteQueue(previewWindow, miniWindow,filePath,helper) {
  try {
    const queue = helper.getQueue();
    console.log(queue.length, queue[0])
    if (queue.length > 0) {
      helper.clearQueue();
      fs.writeFileSync(filePath, '');
      if (!previewWindow.isDestroyed()) {
        previewWindow.webContents.send('clear-screenshots');
        miniWindow.webContents.send(
          'message-col',
          'INPUT CLEARED, CAPTURE AGAIN.'
        );
      }
    } else {
      fs.writeFileSync(filePath, '');
      miniWindow.webContents.send('message-col', 'NO SCREENSHOT TO CLEAR.');
    }
  } catch (err) {
    console.log('Error in Emptying Queue.',err);
  }
}

export async function deleteOneScreenshot(previewWin, miniWin, helper){
  try{
    const queue = helper.getQueue();
    for(const val of queue){
      console.log(val)
    }
    if(queue.length > 0){
     await helper.deleteScreenshot(queue[queue.length - 1]);
     previewWin.webContents.send('delete-screenshot');
    }else{
      miniWin.webContents.send('message-col', 'NO SCREENSHOT TO CLEAR.');
    }
}catch(err){
    console.log('Error in Deleting Screenshot.', err)
  }
}