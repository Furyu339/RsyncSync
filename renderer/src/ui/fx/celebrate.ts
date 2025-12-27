export type CelebrateConfig = {
  intensity: number; // 0-5
  durationMs: number; // 300-3000
  colorMode: "neon" | "rainbow" | "gold";
  reduceMotion: boolean;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  rot: number;
  vr: number;
  born: number;
  life: number;
  color: string;
  alpha: number;
};

export function createCelebrateStage(container: HTMLElement) {
  const canvas = document.createElement("canvas");
  canvas.style.position = "absolute";
  canvas.style.inset = "0";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = "40";
  container.appendChild(canvas);

  const ctx = canvas.getContext("2d", { alpha: true });
  let raf: number | null = null;
  let destroyed = false;

  const particles: Particle[] = [];
  let playing = false;
  let endAt = 0;
  let lastT = 0;
  let config: CelebrateConfig = { intensity: 2, durationMs: 900, colorMode: "neon", reduceMotion: false };

  const resize = () => {
    const rect = container.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(rect.width * devicePixelRatio));
    canvas.height = Math.max(1, Math.floor(rect.height * devicePixelRatio));
  };
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  const pickPalette = (mode: CelebrateConfig["colorMode"]) => {
    if (mode === "gold") return ["#FDE68A", "#F59E0B", "#FBBF24", "#FCD34D"];
    if (mode === "rainbow") return ["#60A5FA", "#34D399", "#F472B6", "#FBBF24", "#A78BFA"];
    return ["#38BDF8", "#A78BFA", "#34D399", "#22D3EE"];
  };

  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

  const spawn = () => {
    particles.length = 0;
    const rect = container.getBoundingClientRect();
    const cx = rect.width * 0.5;
    const cy = rect.height * 0.55;

    const base = Math.max(6, Math.floor(config.intensity * 14));
    const count = config.reduceMotion ? Math.floor(base * 0.6) : base;
    const palette = pickPalette(config.colorMode);
    const now = performance.now();

    for (let i = 0; i < count; i++) {
      const a = (-Math.PI / 2) + (Math.random() - 0.5) * (Math.PI * 0.9);
      const speed = (120 + Math.random() * 220) * (config.reduceMotion ? 0.75 : 1.0);
      const vx = Math.cos(a) * speed;
      const vy = Math.sin(a) * speed - (140 + Math.random() * 140);
      const w = 3 + Math.random() * 4;
      const h = 3 + Math.random() * 7;
      particles.push({
        x: cx + (Math.random() - 0.5) * 14,
        y: cy + (Math.random() - 0.5) * 10,
        vx,
        vy,
        w,
        h,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 8,
        born: now,
        life: Math.max(520, Math.min(1600, config.durationMs * (0.85 + Math.random() * 0.45))),
        color: palette[Math.floor(Math.random() * palette.length)],
        alpha: 0.9
      });
    }
  };

  const draw = (t: number) => {
    if (!ctx) return;
    const dt = Math.min(32, t - lastT || 16);
    lastT = t;

    const w = canvas.width;
    const h = canvas.height;
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const now = performance.now();
    const rect = container.getBoundingClientRect();
    const cx = rect.width * 0.5;
    const cy = rect.height * 0.55;

    // 轻微柔光圈（很克制）
    if (playing) {
      const p = Math.max(0, Math.min(1, 1 - (endAt - now) / config.durationMs));
      const r = 46 + 18 * easeOutCubic(p);
      ctx.save();
      ctx.globalAlpha = 0.10 * (1 - p);
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, "rgba(56,189,248,0.9)");
      grad.addColorStop(1, "rgba(56,189,248,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    const g = 820; // px/s^2
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      const age = now - p.born;
      const k = age / p.life;
      if (k >= 1 || now > endAt + 250) {
        particles.splice(i, 1);
        continue;
      }
      const damp = config.reduceMotion ? 0.985 : 0.99;
      p.vx *= damp;
      p.vy = p.vy * damp + (g * dt) / 1000;
      p.x += (p.vx * dt) / 1000;
      p.y += (p.vy * dt) / 1000;
      p.rot += (p.vr * dt) / 1000;

      const a = p.alpha * (1 - easeOutCubic(k));
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      // 圆角小矩形，像“纸屑/小粒子”
      const rr = Math.min(p.w, p.h) * 0.45;
      roundRect(ctx, -p.w / 2, -p.h / 2, p.w, p.h, rr);
      ctx.fill();
      ctx.restore();
    }

    if (playing && now < endAt) {
      raf = requestAnimationFrame(draw);
    } else if (particles.length > 0) {
      raf = requestAnimationFrame(draw);
    } else {
      playing = false;
      raf = null;
      ctx.clearRect(0, 0, w, h);
    }
  };

  const play = (cfg: CelebrateConfig) => {
    config = cfg;
    if (config.intensity <= 0) return;
    playing = true;
    endAt = performance.now() + Math.max(300, Math.min(3000, cfg.durationMs));
    lastT = 0;
    spawn();
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(draw);
  };

  return {
    applyConfig: (cfg: CelebrateConfig) => {
      config = cfg;
    },
    play,
    destroy: () => {
      destroyed = true;
      ro.disconnect();
      if (raf) cancelAnimationFrame(raf);
      if (!destroyed) return;
      try {
        container.removeChild(canvas);
      } catch {
        // ignore
      }
    }
  };
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rr = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

