import React from "react";

export function GlassCard(props: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="t-card rounded-2xl">
      <div className="flex items-center justify-between px-5 py-4">
        <div className="t-text-strong text-sm font-semibold tracking-wide">{props.title}</div>
        {props.right}
      </div>
      <div className="t-divider" />
      <div className="p-5">{props.children}</div>
    </div>
  );
}
