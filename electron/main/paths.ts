import path from "node:path";
import { app } from "electron";

export function vendorRsyncPath(): string {
  if (!app.isPackaged) {
    return path.join(app.getAppPath(), "vendor", "rsync", "rsync");
  }
  return path.join(process.resourcesPath, "vendor", "rsync", "rsync");
}

export function vendorRsyncLibDir(): string {
  if (!app.isPackaged) {
    return path.join(app.getAppPath(), "vendor", "rsync", "lib");
  }
  return path.join(process.resourcesPath, "vendor", "rsync", "lib");
}

export function isPackaged(): boolean {
  return app.isPackaged;
}
