export type SyncStage = "idle" | "scan" | "transfer" | "finishing" | "done" | "error" | "canceled";

export type ProgressEvent =
  | { type: "stage"; stage: SyncStage; detail: string }
  | { type: "progress"; stage: SyncStage; percent: number; detail: string; speed?: string; eta?: string }
  | { type: "log"; line: string; level: "info" | "warn" | "error" }
  | { type: "finished"; ok: boolean; exitCode: number; stage: SyncStage; summary: Summary };

export type Summary = {
  filesTotal?: string;
  filesTransferred?: string;
  filesDeleted?: string;
  totalSize?: string;
  totalTransferred?: string;
};

// 注意：rsync 的 progress 行在不同版本/场景下可能以 “0% …” 开头，
// 也可能带有前置字节计数与多空格，所以这里用更宽松的匹配。
const PERCENT_RE = /(?:^|\s)(\d{1,3})%/;
const SPEED_RE = /(?:^|\s)(\d+(?:\.\d+)?[KMGT]?B\/s)(?:\s|$)/;
const ETA_RE = /(?:^|\s)(\d+:\d+:\d+)(?:\s|$)/;

export function parseProgressLine(line: string): { percent?: number; speed?: string; eta?: string; scanning: boolean } {
  const percentMatch = PERCENT_RE.exec(line);
  const speedMatch = SPEED_RE.exec(line);
  const etaMatch = ETA_RE.exec(line);
  const scanning = line.includes("to-chk=") || line.includes("ir-chk=");
  const percent = percentMatch ? Math.max(0, Math.min(100, Number(percentMatch[1]))) : undefined;
  return {
    percent,
    speed: speedMatch ? speedMatch[1] : undefined,
    eta: etaMatch ? etaMatch[1] : undefined,
    scanning
  };
}

export function parseStats(output: string): Summary {
  const pick = (prefix: string) => {
    const line = output.split("\n").find((l) => l.startsWith(prefix));
    if (!line) return undefined;
    return line.split(":", 2)[1]?.trim();
  };
  return {
    filesTotal: pick("Number of files"),
    filesTransferred: pick("Number of regular files transferred"),
    filesDeleted: pick("Number of deleted files"),
    totalSize: pick("Total file size"),
    totalTransferred: pick("Total transferred file size")
  };
}
