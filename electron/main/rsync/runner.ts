import { spawn, ChildProcessWithoutNullStreams } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

import { vendorRsyncLibDir, vendorRsyncPath } from "../paths";
import { parseProgressLine, parseStats, ProgressEvent, SyncStage } from "./parse";

export type SyncOptions = {
  source: string;
  dest: string;
  delete: boolean;
  dryRun: boolean;
  checksum: boolean;
};

class SyncRunner {
  private proc: ChildProcessWithoutNullStreams | null = null;
  private stage: SyncStage = "idle";
  private allLines: string[] = [];

  async start(options: SyncOptions, emit: (event: ProgressEvent) => void): Promise<void> {
    if (this.proc) throw new Error("同步已在运行中");

    let rsync = vendorRsyncPath();
    let libDir = vendorRsyncLibDir();
    if (!existsSync(rsync)) {
      const fallback = "/opt/homebrew/bin/rsync";
      if (existsSync(fallback)) {
        rsync = fallback;
        libDir = "";
      } else {
        throw new Error("未找到内置 rsync（也未找到 /opt/homebrew/bin/rsync）");
      }
    }

    const source = options.source.endsWith(path.sep) ? options.source : options.source + path.sep;
    const dest = options.dest.endsWith(path.sep) ? options.dest : options.dest + path.sep;

    const args = ["-a", "-h", "--stats", "--info=progress2"];
    if (options.checksum) args.push("--checksum");
    if (options.delete) args.push("--delete");
    if (options.dryRun) args.push("--dry-run");
    args.push(source, dest);

    this.stage = "scan";
    emit({ type: "stage", stage: this.stage, detail: "扫描中…" });

    this.allLines = [];
    const env = { ...process.env } as Record<string, string>;
    if (libDir) {
      env.DYLD_LIBRARY_PATH = libDir + (process.env.DYLD_LIBRARY_PATH ? `:${process.env.DYLD_LIBRARY_PATH}` : "");
    }
    this.proc = spawn(rsync, args, { env });

    const onLine = (line: string, level: "info" | "warn" | "error") => {
      const trimmed = line.trim();
      if (!trimmed) return;
      const p = parseProgressLine(trimmed);
      if (p.percent !== undefined) {
        this.stage = "transfer";
        emit({ type: "progress", stage: this.stage, percent: p.percent, detail: trimmed, speed: p.speed, eta: p.eta });
        return;
      }
      if (p.scanning && this.stage !== "transfer") {
        this.stage = "scan";
        emit({ type: "stage", stage: this.stage, detail: trimmed });
        this.allLines.push(trimmed);
        emit({ type: "log", line: trimmed, level });
        return;
      }

      this.allLines.push(trimmed);
      emit({ type: "log", line: trimmed, level });
    };

    this.proc.stdout.setEncoding("utf8");
    this.proc.stderr.setEncoding("utf8");

    let stdoutBuf = "";
    let stderrBuf = "";

    this.proc.stdout.on("data", (chunk: string) => {
      stdoutBuf += chunk;
      // rsync 的 --info=progress2 经常用 \r 刷新同一行（不带 \n）
      // 这里按 \r 与 \n 都切分，才能拿到 1%~99% 的实时进度。
      const parts = stdoutBuf.split(/[\r\n]+/);
      stdoutBuf = parts.pop() || "";
      for (const l of parts) onLine(l, "info");
    });

    this.proc.stderr.on("data", (chunk: string) => {
      stderrBuf += chunk;
      const parts = stderrBuf.split(/[\r\n]+/);
      stderrBuf = parts.pop() || "";
      for (const l of parts) onLine(l, "warn");
    });

    await new Promise<void>((resolve) => {
      this.proc?.on("close", (code) => {
        const output = this.allLines.join("\n");
        const summary = parseStats(output);
        const ok = code === 0;
        const finalStage: SyncStage = ok ? "done" : this.stage === "canceled" ? "canceled" : "error";
        emit({ type: "finished", ok, exitCode: code ?? -1, stage: finalStage, summary });
        this.proc = null;
        this.stage = "idle";
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    if (!this.proc) return;
    this.stage = "canceled";
    this.proc.kill("SIGTERM");
    await new Promise<void>((resolve) => setTimeout(resolve, 1500));
    if (this.proc) this.proc.kill("SIGKILL");
  }
}

export const syncRunner = new SyncRunner();
