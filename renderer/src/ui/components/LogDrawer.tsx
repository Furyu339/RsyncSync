import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

export type LogLine = { line: string; level: "info" | "warn" | "error"; ts: number };

export function LogDrawer(props: {
  open: boolean;
  onToggle: () => void;
  lines: LogLine[];
  filter: "all" | "error" | "changes";
  setFilter: (f: "all" | "error" | "changes") => void;
  onClear: () => void;
  onSave: () => void;
  onCopy: () => void;
}) {
  const filtered = useMemo(() => {
    if (props.filter === "all") return props.lines;
    if (props.filter === "error") return props.lines.filter((l) => l.level !== "info");
    return props.lines.filter((l) => l.line.includes("deleting") || l.line.startsWith(">f") || l.line.startsWith("*deleting"));
  }, [props.filter, props.lines]);

  return (
    <div className="t-card rounded-2xl">
      <div className="flex items-center justify-between px-5 py-3">
        <button
          type="button"
          onClick={props.onToggle}
          className="t-text text-sm font-semibold hover:opacity-100"
        >
          {props.open ? "▾ 日志" : "▸ 日志"}
        </button>
        {props.open ? (
          <div className="flex items-center gap-2">
            <select
              value={props.filter}
              onChange={(e) => props.setFilter(e.target.value as any)}
              className="t-control rounded-lg px-2 py-1 text-xs"
            >
              <option value="all">全部</option>
              <option value="error">错误/警告</option>
              <option value="changes">变更</option>
            </select>
            <button className="t-btn-ghost rounded-lg px-2 py-1 text-xs" onClick={props.onCopy}>
              复制
            </button>
            <button className="t-btn-ghost rounded-lg px-2 py-1 text-xs" onClick={props.onSave}>
              保存…
            </button>
            <button className="t-btn-ghost rounded-lg px-2 py-1 text-xs" onClick={props.onClear}>
              清空
            </button>
          </div>
        ) : (
          <div className="t-dim text-xs">{props.lines.length} 行</div>
        )}
      </div>
      <AnimatePresence initial={false}>
        {props.open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 240, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
            className="overflow-hidden px-4 pb-4"
          >
            <div className="t-logbox h-full w-full overflow-auto rounded-xl p-3 font-mono text-xs">
              {filtered.length === 0 ? <div className="t-dim">暂无日志</div> : null}
              {filtered.map((l, idx) => (
                <div
                  key={idx}
                  className={
                    l.level === "error"
                      ? "t-log-error"
                      : l.level === "warn"
                        ? "t-log-warn"
                        : "t-log-info"
                  }
                >
                  {l.line}
                </div>
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
