import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const path = require('path');
const audioAddon = require('./src/audio/build/Release/audio_capture.node');

audioAddon.registerAudioCallback((audioData) => {
  console.log('Received audio frame:', audioData);
});

console.log("Starting capture...");
audioAddon.startCapture();

