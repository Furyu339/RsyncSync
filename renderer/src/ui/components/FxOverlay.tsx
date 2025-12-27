import React, { useEffect, useMemo, useRef } from "react";
import type { FxConfig } from "../fx/pixi";
import { createCelebrateStage } from "../fx/celebrate";

export function FxOverlay(props: { config: FxConfig; triggerKey: number }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const fxRef = useRef<ReturnType<typeof createCelebrateStage> | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    fxRef.current = createCelebrateStage(host);
    fxRef.current.applyConfig({
      intensity: props.config.intensity,
      durationMs: props.config.durationMs,
      colorMode: props.config.colorMode,
      reduceMotion: props.config.reduceMotion
    });
    return () => fxRef.current?.destroy();
  }, []);

  useEffect(() => {
    fxRef.current?.applyConfig({
      intensity: props.config.intensity,
      durationMs: props.config.durationMs,
      colorMode: props.config.colorMode,
      reduceMotion: props.config.reduceMotion
    });
  }, [props.config]);

  useEffect(() => {
    if (props.triggerKey <= 0) return;
    fxRef.current?.play({
      intensity: props.config.intensity,
      durationMs: props.config.durationMs,
      colorMode: props.config.colorMode,
      reduceMotion: props.config.reduceMotion
    });
  }, [props.triggerKey]);

  const style = useMemo(() => {
    if (props.config.fullscreen) {
      return "pointer-events-none fixed inset-0 z-40";
    }
    return "pointer-events-none absolute inset-0 z-40";
  }, [props.config.fullscreen]);

  return <div ref={hostRef} className={style} />;
}
