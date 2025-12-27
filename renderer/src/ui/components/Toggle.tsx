import React from "react";

export function Toggle(props: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="t-control flex cursor-pointer items-start justify-between gap-4 rounded-xl px-4 py-3">
      <div>
        <div className="t-text text-sm font-medium">{props.label}</div>
        {props.hint ? <div className="t-muted mt-1 text-xs">{props.hint}</div> : null}
      </div>
      <button
        type="button"
        aria-pressed={props.checked}
        onClick={() => props.onChange(!props.checked)}
        data-checked={props.checked ? "true" : "false"}
        className="t-switch relative h-6 w-11 rounded-full transition"
      >
        <span
          className={[
            "absolute top-0.5 h-5 w-5 rounded-full bg-white transition",
            props.checked ? "left-5" : "left-0.5"
          ].join(" ")}
        />
      </button>
    </label>
  );
}
