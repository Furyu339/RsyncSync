import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Settings } from "../types";

export function SettingsModal(props: {
  open: boolean;
  onClose: () => void;
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
}) {
  const [tab, setTab] = useState<"fx" | "general">("fx");
  const s = props.settings;

  const intensityLabel = useMemo(() => ["关闭", "低", "中", "偏高", "高", "爆炸"][s.fxIntensity] ?? String(s.fxIntensity), [s.fxIntensity]);

  return (
    <AnimatePresence>
      {props.open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={props.onClose} />
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
            className="t-card relative flex w-[760px] max-w-[92vw] flex-col overflow-hidden rounded-3xl"
            style={{ maxHeight: "88vh", boxShadow: "var(--shadow-modal)" }}
          >
            <div className="flex items-center justify-between px-6 py-5">
              <div className="t-text-strong text-base font-bold">设置</div>
              <button
                className="t-btn-ghost rounded-xl px-3 py-2 text-xs"
                onClick={props.onClose}
              >
                关闭
              </button>
            </div>
            <div className="t-divider" />

            <div className="grid min-h-0 flex-1 grid-cols-12 gap-0">
              <div className="col-span-3 border-r border-[rgb(var(--c-border)/0.10)] p-4">
                <button
                  className={navBtn(tab === "fx")}
                  onClick={() => setTab("fx")}
                >
                  烟花与特效
                </button>
                <button
                  className={navBtn(tab === "general")}
                  onClick={() => setTab("general")}
                >
                  通用
                </button>
              </div>
              <div className="col-span-9 min-h-0 overflow-y-auto p-6">
                {tab === "fx" ? (
                  <div className="space-y-5">
                    <SettingRow label="庆祝强度" value={intensityLabel}>
                      <input
                        type="range"
                        min={0}
                        max={5}
                        value={s.fxIntensity}
                        onChange={(e) => props.onChange({ fxIntensity: Number(e.target.value) })}
                        className="w-full"
                      />
                    </SettingRow>

                    <SettingRow label="持续时间" value={`${(s.fxDurationMs / 1000).toFixed(1)}s`}>
                      <input
                        type="range"
                        min={400}
                        max={2200}
                        step={100}
                        value={s.fxDurationMs}
                        onChange={(e) => props.onChange({ fxDurationMs: Number(e.target.value) })}
                        className="w-full"
                      />
                    </SettingRow>

                    <SettingRow label="配色" value={s.fxColorMode}>
                      <select
                        className="t-control w-full rounded-xl px-3 py-2 text-sm"
                        value={s.fxColorMode}
                        onChange={(e) => props.onChange({ fxColorMode: e.target.value as any })}
                      >
                        <option value="neon">霓虹</option>
                        <option value="rainbow">彩虹</option>
                        <option value="gold">金色</option>
                      </select>
                    </SettingRow>

                    <div className="grid grid-cols-2 gap-3">
                      <Check
                        label="减少动态效果"
                        checked={s.reduceMotion}
                        onChange={(v) => props.onChange({ reduceMotion: v })}
                      />
                    </div>
                    <div className="t-muted text-xs">提示：这是“轻量庆祝粒子”，默认不会遮挡界面。</div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="t-card rounded-2xl p-4">
                      <div className="t-text text-sm font-semibold">主题</div>
                      <div className="t-seg mt-2 inline-flex items-center gap-1 rounded-2xl p-1">
                        <button
                          type="button"
                          data-active={s.theme === "dark" ? "true" : "false"}
                          className="t-seg-btn rounded-xl px-3 py-2 text-sm transition"
                          onClick={() => props.onChange({ theme: "dark" })}
                        >
                          深色
                        </button>
                        <button
                          type="button"
                          data-active={s.theme === "light" ? "true" : "false"}
                          className="t-seg-btn rounded-xl px-3 py-2 text-sm transition"
                          onClick={() => props.onChange({ theme: "light" })}
                        >
                          浅色
                        </button>
                      </div>
                      <div className="t-muted mt-2 text-xs">跟随系统可后续补充。</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function navBtn(active: boolean) {
  return [
    "mb-2 w-full rounded-xl px-3 py-2 text-left text-sm",
    active ? "bg-[rgb(var(--c-surface)/0.14)] t-text-strong" : "t-muted hover:bg-[rgb(var(--c-surface)/0.08)]"
  ].join(" ");
}

function SettingRow(props: { label: string; value: string; children: React.ReactNode }) {
  return (
    <div className="t-card rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <div className="t-text text-sm font-semibold">{props.label}</div>
        <div className="t-muted text-xs">{props.value}</div>
      </div>
      <div className="mt-3">{props.children}</div>
    </div>
  );
}

function Check(props: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="t-card flex cursor-pointer items-center justify-between gap-3 rounded-2xl px-4 py-3">
      <div className="t-text text-sm font-medium">{props.label}</div>
      <input type="checkbox" checked={props.checked} onChange={(e) => props.onChange(e.target.checked)} />
    </label>
  );
}
