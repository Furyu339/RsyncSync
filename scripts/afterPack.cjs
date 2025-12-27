const fs = require("node:fs");
const path = require("node:path");

exports.default = async function afterPack(context) {
  const logPath = context.appOutDir
    ? path.join(context.appOutDir, "afterPack.log")
    : path.join(process.cwd(), "release", "afterPack.log");
  const log = (line) => {
    try {
      fs.appendFileSync(
        logPath,
        `[${new Date().toISOString()}] ${line}\n`,
        "utf8"
      );
    } catch {
      // ignore
    }
  };

  if (!context.appOutDir || !fs.existsSync(context.appOutDir)) {
    log("skip: missing context.appOutDir");
    return;
  }

  const candidateApps = fs
    .readdirSync(context.appOutDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.endsWith(".app"))
    .map((d) => path.join(context.appOutDir, d.name));

  if (candidateApps.length === 0) {
    log(`skip: no .app found in ${context.appOutDir}`);
    return;
  }

  for (const appPath of candidateApps) {
    try {
      const resourcesDir = path.join(appPath, "Contents", "Resources");
      const resourcesIcu = path.join(resourcesDir, "icudtl.dat");

      const candidates = [
        path.join(
          appPath,
          "Contents",
          "Frameworks",
          "Electron Framework.framework",
          "Versions",
          "A",
          "Resources",
          "icudtl.dat"
        ),
        path.join(
          appPath,
          "Contents",
          "Frameworks",
          "Electron Framework.framework",
          "Resources",
          "icudtl.dat"
        ),
        path.join(
          appPath,
          "Contents",
          "Frameworks",
          "Electron Framework.framework",
          "icudtl.dat"
        ),
      ];

      const src = candidates.find((p) => fs.existsSync(p));
      if (!src) {
        log(`warn: icudtl.dat not found for ${appPath}`);
        continue;
      }

      if (fs.existsSync(resourcesIcu)) {
        log(`ok: icudtl.dat already exists at ${resourcesIcu}`);
        continue;
      }

      fs.mkdirSync(resourcesDir, { recursive: true });
      fs.copyFileSync(src, resourcesIcu);
      log(`ok: copied ${src} -> ${resourcesIcu}`);
    } catch (err) {
      log(`error: ${appPath}: ${err?.stack || String(err)}`);
    }
  }
};
