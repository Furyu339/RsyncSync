import React, { useMemo } from "react";

export function CircularHud(props: {
  stage: "idle" | "scan" | "transfer" | "done" | "error" | "canceled";
  percent: number;
  title: string;
  detail: string;
}) {
  const ring = useMemo(() => {
    const pct = Math.max(0, Math.min(100, props.percent));
    const dash = 2 * Math.PI * 54;
    const filled = (pct / 100) * dash;
    return { dash, filled };
  }, [props.percent]);

  const indeterminate = props.stage === "scan";

  return (
    <div className="relative flex w-full flex-col items-center justify-center">
      <div className="relative flex h-[280px] w-[280px] items-center justify-center">
        <svg width="280" height="280" viewBox="0 0 280 280" className={indeterminate ? "animate-spin-slow" : ""}>
          <defs>
            <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="rgba(56,189,248,0.95)" />
              <stop offset="55%" stopColor="rgba(167,139,250,0.92)" />
              <stop offset="100%" stopColor="rgba(16,185,129,0.88)" />
            </linearGradient>
          </defs>
          <circle cx="140" cy="140" r="54" fill="transparent" stroke="var(--hud-track)" strokeWidth="18" />
          <circle
            cx="140"
            cy="140"
            r="54"
            fill="transparent"
            stroke="url(#grad)"
            strokeWidth="18"
            strokeLinecap="round"
            strokeDasharray={`${ring.filled} ${ring.dash - ring.filled}`}
            transform="rotate(-90 140 140)"
            style={{ filter: "drop-shadow(0 0 16px rgba(56,189,248,0.18))" }}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <div className="t-text text-sm font-semibold">{props.title}</div>
          <div className="t-text-strong mt-1 text-4xl font-extrabold">{indeterminate ? "…" : `${Math.round(props.percent)}%`}</div>
          <div className="t-muted mt-2 max-w-[240px] text-xs leading-relaxed">{props.detail}</div>
        </div>
      </div>
    </div>
  );
}
