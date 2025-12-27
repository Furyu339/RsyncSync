import { BrowserWindow, dialog, ipcMain } from "electron";
import { promises as fs } from "node:fs";
import path from "node:path";
import { syncRunner } from "./rsync/runner";
import { settingsStore } from "./settings/store";

let registered = false;
let mainWindowRef: BrowserWindow | null = null;

export function registerIpc(mainWindow: BrowserWindow): void {
  // 允许窗口被重建，但 IPC handler 只能注册一次，否则会报：
  // "Attempted to register a second handler for 'xxx'"
  mainWindowRef = mainWindow;
  if (registered) return;
  registered = true;

  const resolveWindow = (evt: Electron.IpcMainInvokeEvent): BrowserWindow => {
    const fromSender = BrowserWindow.fromWebContents(evt.sender);
    return fromSender || mainWindowRef || BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
  };

  ipcMain.handle("dialog:selectDirectory", async (evt, initialPath?: string) => {
    const win = resolveWindow(evt);
    const result = await dialog.showOpenDialog(win, {
      title: "选择目录",
      defaultPath: initialPath || undefined,
      properties: ["openDirectory"]
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle("dialog:saveText", async (evt, params: { defaultName: string; content: string }) => {
    const win = resolveWindow(evt);
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: "保存",
      defaultPath: path.join(process.env.HOME || "", params.defaultName),
      filters: [{ name: "文本", extensions: ["txt", "log"] }]
    });
    if (canceled || !filePath) return null;
    await fs.writeFile(filePath, params.content, "utf8");
    return filePath;
  });

  ipcMain.handle("settings:get", async () => settingsStore.getAll());
  ipcMain.handle("settings:set", async (_evt, patch) => settingsStore.setPatch(patch));

  ipcMain.handle("sync:start", async (_evt, options) => {
    await syncRunner.start(options, (event) => {
      const win = mainWindowRef || BrowserWindow.getAllWindows()[0];
      win?.webContents.send("sync:event", event);
    });
  });

  ipcMain.handle("sync:stop", async () => {
    await syncRunner.stop();
  });
}
