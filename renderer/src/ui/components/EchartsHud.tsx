import React, { useEffect, useMemo, useRef } from "react";
import * as echarts from "echarts/core";
import { GraphicComponent } from "echarts/components";
import { GaugeChart } from "echarts/charts";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([GaugeChart, GraphicComponent, CanvasRenderer]);

function readCssRgb(varName: string, fallback: string) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  if (!raw) return fallback;
  // ECharts 对 “rgb(11 13 18 / 1)” 这类 CSS4 写法兼容不好，这里输出逗号分隔
  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length >= 3) return `rgb(${parts[0]},${parts[1]},${parts[2]})`;
  return fallback;
}

export function EchartsHud(props: {
  stage: "idle" | "scan" | "transfer" | "done" | "error" | "canceled";
  percent: number;
  title: string;
  detail: string;
  theme: "dark" | "light";
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  const pct = useMemo(() => Math.max(0, Math.min(100, props.percent)), [props.percent]);

  const option = useMemo(() => {
    const fg = readCssRgb("--c-fg", "rgb(232 234 240 / 1)");
    const track = getComputedStyle(document.documentElement).getPropertyValue("--hud-track").trim() || "rgba(255,255,255,0.10)";
    const isLight = props.theme === "light";
    const reduce = isLight;
    const titleColor = reduce ? "rgba(11,13,18,0.90)" : "rgba(232,234,240,0.88)";
    const detailColor = reduce ? "rgba(11,13,18,0.60)" : "rgba(232,234,240,0.60)";

    const grad = new echarts.graphic.LinearGradient(0, 0, 1, 1, [
      { offset: 0, color: "rgba(56,189,248,0.95)" },
      { offset: 0.55, color: "rgba(167,139,250,0.92)" },
      { offset: 1, color: "rgba(16,185,129,0.88)" }
    ]);

    const isIndeterminate = props.stage === "scan";
    const percentText = isIndeterminate ? "…" : `${Math.round(pct)}%`;
    // HUD 保持克制：不在环内显示细节行（速度/ETA 等可放日志或别处）
    const showDetail = false;
    const showProgress = pct > 0 && !isIndeterminate;

    return {
      animation: true,
      animationDuration: 520,
      animationEasing: "cubicOut",
      series: [
        {
          type: "gauge",
          startAngle: 90,
          endAngle: -270,
          radius: "78%",
          pointer: { show: false },
          axisLine: {
            lineStyle: {
              width: 18,
              color: [[1, track]]
            }
          },
          progress: {
            show: showProgress,
            width: 18,
            // 只有在有进度时才使用 roundCap，避免 0% 出现彩色端点/小点
            roundCap: true,
            itemStyle: { color: grad }
          },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { show: false },
          anchor: { show: false },
          title: {
            show: true,
            offsetCenter: [0, "-18%"],
            color: titleColor,
            fontSize: 14,
            fontWeight: 600,
            formatter: () => props.title
          },
          detail: {
            show: true,
            offsetCenter: [0, "6%"],
            color: fg,
            fontSize: 44,
            fontWeight: 800,
            formatter: () => percentText
          },
          data: [{ value: pct, name: props.title, title: props.title }]
        }
      ],
      graphic: showDetail
        ? [
            {
              type: "text",
              left: "center",
              top: "66%",
              style: {
                text: props.detail,
                fill: detailColor,
                font: "500 12px system-ui",
                textAlign: "center"
              }
            }
          ]
        : []
    };
  }, [pct, props.stage, props.title, props.theme]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const chart = echarts.init(host, undefined, { renderer: "canvas" });
    chartRef.current = chart;
    chart.setOption(option, { notMerge: true, lazyUpdate: true });

    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(host);

    return () => {
      ro.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    chartRef.current?.setOption(option, { notMerge: false, lazyUpdate: true });
  }, [option]);

  return <div ref={hostRef} className="h-[280px] w-[280px]" />;
}
