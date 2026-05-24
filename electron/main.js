import { app, BrowserWindow } from "electron";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, "preload.js"), // 若你也改成 ESM，這樣就可以
    },
  });

  if (process.env.NODE_ENV === "development") {
    // 等待 Vite dev server 就緒
    const tryLoad = async () => {
      try {
        await mainWindow.loadURL("http://localhost:5173");
        mainWindow.webContents.openDevTools();
      } catch (err) {
        console.log("等待開發伺服器啟動...", err?.message ?? err);
        setTimeout(tryLoad, 1000);
      }
    };
    tryLoad();
  } else {
    // 生產模式：載入打包後檔案
    mainWindow.loadFile(join(__dirname, "../dist/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (mainWindow === null) createWindow();
});
