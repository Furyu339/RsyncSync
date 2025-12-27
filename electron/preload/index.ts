import { contextBridge, ipcRenderer } from "electron";

export type SyncOptions = {
  source: string;
  dest: string;
  delete: boolean;
  dryRun: boolean;
  checksum: boolean;
};

export type ProgressEvent =
  | { type: "stage"; stage: string; detail: string }
  | { type: "progress"; stage: string; percent: number; detail: string; speed?: string; eta?: string }
  | { type: "log"; line: string; level: "info" | "warn" | "error" }
  | { type: "finished"; ok: boolean; exitCode: number; stage: string; summary: any };

contextBridge.exposeInMainWorld("rsyncSync", {
  selectDirectory: (initialPath?: string) => ipcRenderer.invoke("dialog:selectDirectory", initialPath),
  saveText: (defaultName: string, content: string) => ipcRenderer.invoke("dialog:saveText", { defaultName, content }),
  start: (options: SyncOptions) => ipcRenderer.invoke("sync:start", options),
  stop: () => ipcRenderer.invoke("sync:stop"),
  getSettings: () => ipcRenderer.invoke("settings:get"),
  setSettings: (patch: any) => ipcRenderer.invoke("settings:set", patch),
  onSyncEvent: (cb: (event: ProgressEvent) => void) => {
    const listener = (_evt: any, event: ProgressEvent) => cb(event);
    ipcRenderer.on("sync:event", listener);
    return () => ipcRenderer.removeListener("sync:event", listener);
  }
});
