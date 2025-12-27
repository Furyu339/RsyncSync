import React from "react";

export function TextField(props: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
  onPick: () => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="t-muted text-xs font-semibold uppercase tracking-wider">{props.label}</div>
        <button
          type="button"
          className="t-btn-ghost rounded-lg px-3 py-1.5 text-xs"
          onClick={props.onPick}
        >
          选择…
        </button>
      </div>
      <input
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        className="t-control t-input w-full appearance-none rounded-xl px-4 py-3 text-sm outline-none ring-0 focus:border-sky-400/50"
      />
    </div>
  );
}
