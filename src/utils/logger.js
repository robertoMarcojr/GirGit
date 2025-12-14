import fs from "fs";
import path from "path";
import { app } from 'electron';
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
//file path logger
const isDev = !app.isPackaged;
const logPath = isDev
  ? path.join(__dirname, "../../path_debug.log")
  : path.join(app.getPath("userData"), "path_debug.log");

function log(msg) {
  fs.appendFileSync(logPath, msg + "\n");
}

export function setupLogger(app, dirname) {
  app.on("ready", () => {
    log("app ready");
    log(`\nisPackaged: ${app.isPackaged}`);
    log(`resourcesPath: ${process.resourcesPath}`);
    log(`dirname (main.js): ${dirname}`);
  });
}

export function logNativeModules(dirname) {
  const nativeDir = isDev
    ? path.join(dirname, "native", "build", "Release")
    : path.join(process.resourcesPath, "native", "build", "Release");
  const blockerPath = path.join(nativeDir, "blocker.node");
  log(process.resourcesPath)
  log(`\nNative Modules:`);
  log(
    `blocker.node ➜ ${blockerPath} ${
      fs.existsSync(blockerPath) ? "found" : "missing"
    }`
  );
}
//function to recursively log all files inside asar
function logAllFilesInDir(startPath, output = []) {
  if (!fs.existsSync(startPath)) return output;

  const files = fs.readdirSync(startPath);
  for (const file of files) {
    const fullPath = path.join(startPath, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      logAllFilesInDir(fullPath, output);
    } else {
      output.push(fullPath);
    }
  }
  return output;
}

export function logAsarContents(dirname){
  // const asarRoot = dirname;
  // const filesInsideAsar = logAllFilesInDir(asarRoot);
  // log('\nFiles inside asar:');
  // log(filesInsideAsar.join('\n'));
}