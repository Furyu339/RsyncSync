export type Settings = {
  theme: "dark" | "light";
  lastSource: string;
  lastDest: string;
  defaultDelete: boolean;
  defaultDryRun: boolean;
  fxIntensity: number; // 0-5
  fxDurationMs: number; // 1000-5000
  fxParticleMul: number; // 0.5-3
  fxColorMode: "neon" | "rainbow" | "gold";
  fxBloom: number; // 0-1
  fxTrail: number; // 0-1
  fxFullscreen: boolean;
  reduceMotion: boolean;
};

import { app } from "electron";
import { existsSync } from "node:fs";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

const DEFAULT_SETTINGS: Settings = {
  theme: "light",
  lastSource: "",
  lastDest: "",
  defaultDelete: true,
  defaultDryRun: false,
  fxIntensity: 2,
  fxDurationMs: 900,
  fxParticleMul: 1.25,
  fxColorMode: "neon",
  fxBloom: 0.65,
  fxTrail: 0.6,
  fxFullscreen: true,
  reduceMotion: false
};

class SettingsStore {
  private filePath: string;
  private cached: Settings;

  constructor() {
    const dir = app.getPath("userData");
    mkdirSync(dir, { recursive: true });
    this.filePath = path.join(dir, "settings.json");
    this.cached = this.load();
  }

  private load(): Settings {
    try {
      if (!existsSync(this.filePath)) return { ...DEFAULT_SETTINGS };
      const raw = readFileSync(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as Partial<Settings>;
      return { ...DEFAULT_SETTINGS, ...parsed };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  private save(next: Settings): void {
    const dir = path.dirname(this.filePath);
    mkdirSync(dir, { recursive: true });
    const tmp = this.filePath + ".tmp";
    writeFileSync(tmp, JSON.stringify(next, null, 2), "utf8");
    renameSync(tmp, this.filePath);
  }

  getAll(): Settings {
    return this.cached;
  }

  setPatch(patch: Partial<Settings>): Settings {
    const next = { ...this.cached, ...patch };
    this.cached = next;
    this.save(next);
    return next;
  }
}

export const settingsStore = new SettingsStore();
