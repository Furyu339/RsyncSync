import React, { useEffect, useMemo, useRef, useState } from "react";
import { api } from "./ipc";
import type { Settings, SyncEvent, SyncOptions, SyncStage } from "./types";
import { GlassCard } from "./components/GlassCard";
import { TextField } from "./components/TextField";
import { Toggle } from "./components/Toggle";
import { LogDrawer, type LogLine } from "./components/LogDrawer";
import { Toast } from "./components/Toast";
import { ProgressRing } from "./components/ProgressRing";
import { FxOverlay } from "./components/FxOverlay";
import { SettingsModal } from "./components/SettingsModal";

const defaultSettings: Settings = {
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

export function App() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [source, setSource] = useState("");
  const [dest, setDest] = useState("");
  const [deleteMode, setDeleteMode] = useState(true);
  const [dryRun, setDryRun] = useState(false);
  const [checksum, setChecksum] = useState(false);

  const [stage, setStage] = useState<SyncStage>("idle");
  const [percent, setPercent] = useState(0);
  const [detail, setDetail] = useState("就绪");
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [logOpen, setLogOpen] = useState(false);
  const [logFilter, setLogFilter] = useState<"all" | "error" | "changes">("all");

  const [toast, setToast] = useState<{ open: boolean; kind: "success" | "error" | "info"; text: string }>({
    open: false,
    kind: "info",
    text: ""
  });

  const [fireworksKey, setFireworksKey] = useState(0);
  const runningRef = useRef(false);
  const maxPercentRef = useRef(0);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    api.getSettings().then((s) => {
      setSettings(s);
      setSource(s.lastSource || "");
      setDest(s.lastDest || "");
      setDeleteMode(Boolean(s.defaultDelete));
      setDryRun(Boolean(s.defaultDryRun));
    });
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
    try {
      localStorage.setItem("rsyncsync.theme", settings.theme);
    } catch {
      // ignore
    }
  }, [settings.theme]);

  const updateSettings = async (patch: Partial<Settings>) => {
    const next = await api.setSettings(patch);
    setSettings(next);
  };

  useEffect(() => {
    return api.onSyncEvent((event) => {
      if (event.type === "log") {
        setLogs((prev) => [...prev.slice(-2000), { line: event.line, level: event.level, ts: Date.now() }]);
        return;
      }
      if (event.type === "stage") {
        setStage(event.stage);
        setDetail(hudDetailFromStage(event.stage, event.detail));
        setRunning(true);
        runningRef.current = true;
        return;
      }
      if (event.type === "progress") {
        setStage(event.stage);
        // rsync 的 progress2 在“总量变化”时可能会回退，这里强制单调递增，避免 UI 倒退/不同步
        maxPercentRef.current = Math.max(maxPercentRef.current, event.percent);
        setPercent(maxPercentRef.current);
        setDetail(hudDetailFromProgress(event));
        setRunning(true);
        runningRef.current = true;
        return;
      }
      if (event.type === "finished") {
        setRunning(false);
        runningRef.current = false;
        setStage(event.stage);
        // HUD 保持克制：完成态不在环中展示“传输/删除/本次”等摘要（只进日志）
        setDetail("");
        maxPercentRef.current = event.ok ? 100 : maxPercentRef.current;
        setPercent(event.ok ? 100 : percent);
        if (event.ok && !dryRun) {
          setToast({ open: true, kind: "success", text: "同步完成！" });
          setFireworksKey((k) => k + 1);
        } else if (event.ok && dryRun) {
          setToast({ open: true, kind: "info", text: "预演完成（未写入文件）" });
        } else {
          setToast({ open: true, kind: "error", text: "同步失败（可展开日志查看）" });
          setLogOpen(true);
        }
        return;
      }
    });
  }, [dryRun, percent]);

  const fxConfig = useMemo(
    () => ({
      intensity: settings.fxIntensity,
      durationMs: settings.fxDurationMs,
      particleMul: settings.fxParticleMul,
      colorMode: settings.fxColorMode,
      bloom: settings.fxBloom,
      trail: settings.fxTrail,
      fullscreen: settings.fxFullscreen,
      reduceMotion: settings.reduceMotion
    }),
    [settings]
  );

  const title = useMemo(() => {
    if (!running) {
      if (stage === "done") return "完成";
      if (stage === "error") return "失败";
      if (stage === "canceled") return "已取消";
      return "就绪";
    }
    if (stage === "scan") return "扫描中";
    if (stage === "transfer") return "同步中";
    return "运行中";
  }, [running, stage]);

  const pickSource = async () => {
    const picked = await api.selectDirectory(source || undefined);
    if (picked) setSource(picked);
  };

  const pickDest = async () => {
    const picked = await api.selectDirectory(dest || undefined);
    if (picked) setDest(picked);
  };

  const persistBasics = async () => {
    const next = await api.setSettings({
      lastSource: source,
      lastDest: dest,
      defaultDelete: deleteMode,
      defaultDryRun: dryRun
    });
    setSettings(next);
  };

  const start = async () => {
    if (!source || !dest) {
      setToast({ open: true, kind: "error", text: "请先选择源目录与目标目录" });
      return;
    }
    await persistBasics();
    setLogs([]);
    setPercent(0);
    maxPercentRef.current = 0;
    setDetail("准备启动…");
    setStage("scan");
    setRunning(true);
    runningRef.current = true;
    const options: SyncOptions = { source, dest, delete: deleteMode, dryRun, checksum };
    try {
      await api.start(options);
    } catch {
      setRunning(false);
      runningRef.current = false;
      setToast({ open: true, kind: "error", text: "启动失败（请检查内置 rsync）" });
    }
  };

  const stop = async () => {
    await api.stop();
    setToast({ open: true, kind: "info", text: "正在取消…" });
  };

  const saveLog = async () => {
    const text = logs.map((l) => l.line).join("\n");
    const saved = await api.saveText("rsyncsync.log", text);
    if (saved) setToast({ open: true, kind: "success", text: "日志已保存" });
  };

  const copyLog = async () => {
    const text = logs.map((l) => l.line).join("\n");
    await navigator.clipboard.writeText(text);
    setToast({ open: true, kind: "info", text: "日志已复制" });
  };

  const clearLog = () => setLogs([]);

  return (
    <div className="relative h-full">
      <FxOverlay config={fxConfig} triggerKey={fireworksKey} />
      <Toast open={toast.open} kind={toast.kind} text={toast.text} onClose={() => setToast((t) => ({ ...t, open: false }))} />

      <div className={["flex h-full min-h-0 flex-col gap-4 p-6", settingsOpen ? "overflow-hidden" : "overflow-y-auto"].join(" ")}>
        <SettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          settings={settings}
          onChange={updateSettings}
        />
          <div className="flex items-center justify-between">
          <div className="t-text-strong text-lg font-extrabold">RsyncSync</div>
          <div className="flex items-center gap-2">
            <button
              className="t-btn-ghost rounded-xl px-3 py-2 text-xs"
              onClick={() => setLogOpen((v) => !v)}
            >
              {logOpen ? "隐藏日志" : "显示日志"}
            </button>
            <button
              className="t-btn-ghost rounded-xl px-3 py-2 text-xs"
              onClick={() => setSettingsOpen(true)}
            >
              设置
            </button>
          </div>
        </div>

        <div className="grid flex-1 grid-cols-12 gap-4">
          <div className="col-span-7 flex flex-col gap-4">
            <GlassCard title="配置">
              <div className="space-y-5">
                <TextField label="源目录" value={source} onChange={setSource} onPick={pickSource} placeholder="选择要同步的源目录" />
                <TextField label="目标目录" value={dest} onChange={setDest} onPick={pickDest} placeholder="选择镜像目标目录" />

                <div className="grid grid-cols-1 gap-3">
                  <Toggle checked={deleteMode} onChange={setDeleteMode} label="镜像删除（--delete）" hint="删除目标目录中源不存在的文件（默认开启）" />
                  <Toggle checked={dryRun} onChange={setDryRun} label="预演（--dry-run）" hint="不实际写入文件，只查看将要发生的变更" />
                  <Toggle checked={checksum} onChange={setChecksum} label="校验（--checksum）" hint="更慢，但对比更严格（可选）" />
                </div>

                {deleteMode ? (
                  <div className="t-warn-delete rounded-2xl px-4 py-3 text-sm">
                    开启 <span className="font-semibold">--delete</span> 会删除目标目录中源不存在的文件，请确认目标目录无误。
                  </div>
                ) : null}
              </div>
            </GlassCard>
          </div>

          <div className="col-span-5 flex flex-col gap-4">
            <GlassCard title="运行">
              <div className="relative flex flex-col items-center gap-5">
                <div className="relative h-[320px] w-full overflow-hidden rounded-2xl border border-[rgb(var(--c-border)/var(--a-border))] bg-[var(--hud-panel)]">
                  <div className="flex h-full w-full items-center justify-center">
                    <ProgressRing stage={stage} percent={percent} title={title} theme={settings.theme} />
                  </div>
                </div>

                <div className="grid w-full grid-cols-2 gap-3">
                  <button
                    className="rounded-xl bg-gradient-to-r from-sky-500/90 to-violet-500/85 px-4 py-3 text-sm font-bold text-white shadow-[0_16px_40px_rgba(0,0,0,0.35)] hover:from-sky-400/95 hover:to-violet-400/90 disabled:opacity-50"
                    disabled={running}
                    onClick={start}
                  >
                    开始同步
                  </button>
                  <button
                    className="t-btn-ghost rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-50"
                    disabled={!running}
                    onClick={stop}
                  >
                    停止
                  </button>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>

        <LogDrawer
          open={logOpen}
          onToggle={() => setLogOpen((v) => !v)}
          lines={logs}
          filter={logFilter}
          setFilter={setLogFilter}
          onClear={clearLog}
          onSave={saveLog}
          onCopy={copyLog}
        />
      </div>
    </div>
  );
}

function hudDetailFromStage(stage: SyncStage, raw: string): string {
  // 不在 HUD 中暴露 rsync 的内部字段（xfr#/to-chk 等只进日志）
  if (stage === "scan") return "扫描中…";
  if (stage === "transfer") return "同步中…";
  if (stage === "finishing") return "收尾中…";
  const s = (raw || "").trim();
  if (!s) return "就绪";
  if (s.includes("to-chk=") || s.includes("xfr#") || s.includes("ir-chk=")) return "扫描中…";
  return s;
}

function hudDetailFromProgress(ev: Extract<SyncEvent, { type: "progress" }>): string {
  const parts: string[] = [];
  if (ev.speed) parts.push(`速度：${ev.speed}`);
  if (ev.eta) parts.push(`剩余：${ev.eta}`);
  if (parts.length) return parts.join(" · ");
  return "同步中…";
}

function summaryText(summary: any): string {
  const parts: string[] = [];
  if (summary?.filesTransferred) parts.push(`传输：${summary.filesTransferred}`);
  if (summary?.filesDeleted) parts.push(`删除：${summary.filesDeleted}`);
  if (summary?.totalTransferred) parts.push(`本次：${summary.totalTransferred}`);
  if (parts.length === 0) return "完成";
  return parts.join("；");
}
