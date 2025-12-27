export type SyncStage = "idle" | "scan" | "transfer" | "finishing" | "done" | "error" | "canceled";

export type Summary = {
  filesTotal?: string;
  filesTransferred?: string;
  filesDeleted?: string;
  totalSize?: string;
  totalTransferred?: string;
};

export type SyncEvent =
  | { type: "stage"; stage: SyncStage; detail: string }
  | { type: "progress"; stage: SyncStage; percent: number; detail: string; speed?: string; eta?: string }
  | { type: "log"; line: string; level: "info" | "warn" | "error" }
  | { type: "finished"; ok: boolean; exitCode: number; stage: SyncStage; summary: Summary };

export type Settings = {
  theme: "dark" | "light";
  lastSource: string;
  lastDest: string;
  defaultDelete: boolean;
  defaultDryRun: boolean;
  fxIntensity: number;
  fxDurationMs: number;
  fxParticleMul: number;
  fxColorMode: "neon" | "rainbow" | "gold";
  fxBloom: number;
  fxTrail: number;
  fxFullscreen: boolean;
  reduceMotion: boolean;
};

export type SyncOptions = {
  source: string;
  dest: string;
  delete: boolean;
  dryRun: boolean;
  checksum: boolean;
};

