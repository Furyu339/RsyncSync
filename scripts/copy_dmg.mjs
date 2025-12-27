import fs from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(process.cwd());
const releaseDir = path.join(projectRoot, "release");

function findDmg(dir) {
  if (!fs.existsSync(dir)) return null;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isFile() && e.name.toLowerCase().endsWith(".dmg")) return p;
    if (e.isDirectory()) {
      const found = findDmg(p);
      if (found) return found;
    }
  }
  return null;
}

const dmgPath = findDmg(releaseDir);
if (!dmgPath) {
  console.error("未找到打包产物 .dmg（release/ 下）");
  process.exit(1);
}

const desktopDmg = path.join(process.env.HOME || "", "Desktop", "RsyncSync.dmg");
fs.rmSync(desktopDmg, { force: true });
fs.copyFileSync(dmgPath, desktopDmg);
console.log("已复制到：", desktopDmg);

