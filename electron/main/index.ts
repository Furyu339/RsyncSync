import { app, BrowserWindow, shell } from "electron";
import path from "node:path";
import { appendFileSync, mkdirSync } from "node:fs";

import { registerIpc } from "./ipc";

const isDev = process.env.NODE_ENV === "development";

// 你的 macOS 环境下 GPU 进程会反复崩溃导致应用直接退出。
// 先禁用硬件加速，避免依赖 GPU 进程；前端会在 WebGL 不可用时自动降级为 Canvas 特效。
app.disableHardwareAcceleration();
app.commandLine.appendSwitch("disable-gpu");
app.commandLine.appendSwitch("disable-gpu-compositing");

function createWindow(): BrowserWindow {
  const logFile = path.join(app.getPath("userData"), "renderer.log");
  const log = (line: string) => {
    try {
      mkdirSync(path.dirname(logFile), { recursive: true });
      appendFileSync(logFile, `[${new Date().toISOString()}] ${line}\n`, "utf8");
    } catch {
      // ignore
    }
  };

  const win = new BrowserWindow({
    width: 1100,
    height: 760,
    backgroundColor: "#0B0D12",
    title: "RsyncSync",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  win.webContents.on("console-message", (_event, level, message, line, sourceId) => {
    log(`console[level=${level}] ${sourceId}:${line} ${message}`);
  });
  win.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    log(`did-fail-load main=${isMainFrame} code=${errorCode} desc=${errorDescription} url=${validatedURL}`);
  });
  win.webContents.on("render-process-gone", (_event, details) => {
    log(`render-process-gone reason=${details.reason} exitCode=${details.exitCode}`);
  });
  win.webContents.on("unresponsive", () => log("unresponsive"));
  win.webContents.on("responsive", () => log("responsive"));
  win.webContents.on("preload-error", (_event, preloadPath, error) => {
    log(`preload-error path=${preloadPath} err=${error?.stack || String(error)}`);
  });
  win.webContents.on("did-finish-load", () => {
    log(`did-finish-load url=${win.webContents.getURL()}`);
    void win.webContents.executeJavaScript("document.getElementById('root')?.childElementCount ?? -1", true)
      .then((n) => log(`root.childElementCount=${n}`))
      .catch((e) => log(`execute-js error: ${e?.stack || String(e)}`));
    void win.webContents.executeJavaScript("typeof window.rsyncSync", true)
      .then((t) => log(`window.rsyncSync type=${t}`))
      .catch((e) => log(`execute-js error: ${e?.stack || String(e)}`));
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  if (isDev) {
    win.loadURL("http://localhost:5173");
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    const indexHtml = path.join(app.getAppPath(), "dist/renderer/index.html");
    win.loadFile(indexHtml);
  }

  registerIpc(win);
  return win;
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
