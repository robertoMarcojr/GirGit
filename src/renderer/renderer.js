window.api.imagePreview((imgData) => {
  const container = document.getElementById('previewContainer');
  const bubble = document.createElement('div');
  bubble.className = 'previewBubble';

  const imgTag = document.createElement('img');
  imgTag.className = 'previewImg';
  console.log('Image element size:', imgTag.width, imgTag.height);
  console.log('Preview received', imgData.slice(0, 50));

  imgTag.src = imgData;
  bubble.appendChild(imgTag);
  container.appendChild(bubble);

  clearTimeout(window._previewTimeout);
});

window.api.mouseToggle((option) =>{
  console.log(option)
  const el = document.getElementById('mouse-toggle');
  el.innerText = !option? 'ENABLED' : 'DISABLED';
})
window.api.deleteImage(() => {
  const container = document.getElementById('previewContainer');
  if (container.lastChild) {
    container.removeChild(container.lastChild);
  }
});

window.api.deleteQueue(() => {
  const container = document.getElementById('previewContainer');
  container.innerHTML = '';
});

window.api.message((_event, message) => {
  const  container = document.getElementById('operation-status');
  container.innerHTML = '';
  container.innerHTML = message;
});

window.api.command((cmd) =>{
  const el = Document.getElementById('next-command');
  el.innerHTML = '';
  el.innerHTML = cmd;
})