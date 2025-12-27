import React, { useMemo } from "react";

export function ProgressRing(props: {
  stage: "idle" | "scan" | "transfer" | "done" | "error" | "canceled";
  percent: number;
  title: string;
  theme: "dark" | "light";
}) {
  const pct = useMemo(() => Math.max(0, Math.min(100, props.percent)), [props.percent]);
  const r = 92;
  const c = 2 * Math.PI * r;
  const filled = (pct / 100) * c;

  const indeterminate = props.stage === "scan";

  return (
    <div className="relative flex h-[280px] w-[280px] items-center justify-center">
      <svg
        width="280"
        height="280"
        viewBox="0 0 280 280"
        className={indeterminate ? "animate-spin-slow" : ""}
      >
        <defs>
          <linearGradient id="hudGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--hud-progress-from)" />
            <stop offset="55%" stopColor="var(--hud-progress-mid)" />
            <stop offset="100%" stopColor="var(--hud-progress-to)" />
          </linearGradient>
        </defs>

        <circle
          cx="140"
          cy="140"
          r={r}
          fill="transparent"
          stroke="var(--hud-track)"
          strokeWidth="18"
        />

        {pct > 0 && !indeterminate ? (
          <circle
            cx="140"
            cy="140"
            r={r}
            fill="transparent"
            stroke="url(#hudGrad)"
            strokeWidth="18"
            strokeLinecap="round"
            strokeDasharray={`${filled} ${c - filled}`}
            transform="rotate(-90 140 140)"
            style={{
              filter: props.theme === "light" ? "none" : "drop-shadow(0 0 18px rgba(56,189,248,0.20))"
            }}
          />
        ) : null}
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <div className="hud-title text-sm font-semibold">{props.title}</div>
        <div className="hud-percent mt-1 text-5xl font-extrabold">
          {indeterminate ? "…" : `${Math.round(pct)}%`}
        </div>
      </div>
    </div>
  );
}

