import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: {
      "main/index": "electron/main/index.ts",
      "preload/index": "electron/preload/index.ts"
    },
    outDir: "dist-electron",
    format: ["cjs"],
    splitting: false,
    sourcemap: true,
    clean: true,
    target: "node20",
    platform: "node",
    external: ["electron"]
  }
]);

