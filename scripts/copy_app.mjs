import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const projectRoot = path.resolve(process.cwd());
const releaseDir = path.join(projectRoot, "release");

function findApp(dir) {
  if (!fs.existsSync(dir)) return null;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory() && e.name.endsWith(".app")) return p;
    if (e.isDirectory()) {
      const found = findApp(p);
      if (found) return found;
    }
  }
  return null;
}

const appPath = findApp(releaseDir);
if (!appPath) {
  console.error("未找到打包产物 .app（release/ 下）");
  process.exit(1);
}

const desktopApp = path.join(process.env.HOME || "", "Desktop", "RsyncSync.app");
fs.rmSync(desktopApp, { recursive: true, force: true });
// 用 ditto 复制 .app，避免 fs.cpSync 在 macOS 上把 bundle 内部相对符号链接改写成绝对路径
execFileSync("ditto", [appPath, desktopApp], { stdio: "inherit" });
console.log("已复制到：", desktopApp);
