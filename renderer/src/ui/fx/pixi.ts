import * as PIXI from "pixi.js";
import { BlurFilter } from "@pixi/filter-blur";
import { BLEND_MODES } from "@pixi/constants";

export type FxConfig = {
  intensity: number;
  durationMs: number;
  particleMul: number;
  colorMode: "neon" | "rainbow" | "gold";
  bloom: number;
  trail: number;
  fullscreen: boolean;
  reduceMotion: boolean;
};

export function createFxStage(container: HTMLElement) {
  const app = new PIXI.Application();
  const view = document.createElement("canvas");
  view.style.position = "absolute";
  view.style.inset = "0";
  view.style.pointerEvents = "none";
  container.appendChild(view);

  let ready = false;
  let canvasFallback = false;
  let rafId: number | null = null;
  let fallbackState: FallbackState | null = null;
  let destroyed = false;
  let root: PIXI.Container | null = null;
  let blur: BlurFilter | null = null;
  let particleTexture: PIXI.Texture | null = null;

  void (async () => {
    try {
      await app.init({
        canvas: view,
        preference: "webgl",
        backgroundAlpha: 0,
        antialias: true,
        powerPreference: "high-performance"
      });
      if (destroyed) return;
      root = new PIXI.Container();
      root.sortableChildren = true;
      app.stage.addChild(root);

      blur = new BlurFilter({ strength: 6, quality: 2 });
      root.filters = [blur];

      particleTexture = makeParticleTexture(app);
      ready = true;
      resize();
    } catch {
      // WebGL 初始化失败：启用 Canvas 2D 降级（仍保留烟花特效）。
      canvasFallback = true;
      fallbackState = createFallback(view);
    }
  })();

  const resize = () => {
    if (!ready) return;
    const rect = container.getBoundingClientRect();
    app.renderer.resize(Math.max(1, Math.floor(rect.width)), Math.max(1, Math.floor(rect.height)));
  };
  const ro = new ResizeObserver(resize);
  ro.observe(container);

  function applyConfig(cfg: FxConfig) {
    if (!ready) return;
    if (!blur) return;
    const b = cfg.reduceMotion ? 0.2 : cfg.bloom;
    blur.strength = 2 + b * 12;
    blur.quality = cfg.reduceMotion ? 1 : 2;
  }

  function playFireworks(cfg: FxConfig) {
    if (canvasFallback && fallbackState) {
      playFallback(fallbackState, cfg);
      return;
    }
    if (!ready) return;
    if (cfg.intensity <= 0) return;
    if (!root || !particleTexture) return;
    applyConfig(cfg);
    const start = performance.now();
    const duration = cfg.durationMs;
    const targetFps = cfg.reduceMotion ? 30 : 60;
    let lastSpawn = 0;

    const particles: Particle[] = [];

    const spawnBurst = () => {
      const rect = app.renderer.screen;
      const x = Math.random() * rect.width;
      const y = rect.height * (0.10 + Math.random() * 0.55);
      const baseCount = Math.max(10, cfg.intensity * 90 * cfg.particleMul);
      const count = Math.floor(baseCount * (0.75 + Math.random() * 0.7));
      const hueBase = Math.random();

      for (let i = 0; i < count; i++) {
        const speed = (140 + Math.random() * 520) * (cfg.intensity >= 5 ? 1.15 : 1.0);
        const ang = Math.random() * Math.PI * 2;
        const vx = Math.cos(ang) * speed;
        const vy = Math.sin(ang) * speed;
        const life = 900 + Math.random() * 1100;
        const sprite = new PIXI.Sprite(particleTexture);
        sprite.anchor.set(0.5);
        sprite.blendMode = BLEND_MODES.ADD;
        sprite.x = x;
        sprite.y = y;
        sprite.alpha = 0.95;
        const size = (3 + Math.random() * 7) * (cfg.intensity >= 5 ? 1.15 : 1.0);
        sprite.scale.set(size / 32);

        const color = pickColor(cfg.colorMode, hueBase);
        sprite.tint = color;
        root.addChild(sprite);
        particles.push({ sprite, vx, vy, born: performance.now(), life });
      }
    };

    const spawnFinale = () => {
      for (let i = 0; i < Math.max(2, cfg.intensity); i++) spawnBurst();
    };

    const ticker = (dt: number) => {
      const now = performance.now();
      const elapsed = now - start;
      if (elapsed > duration) {
        spawnFinale();
        app.ticker.remove(ticker);
        const fadeStart = performance.now();
        const fade = () => {
          const t = (performance.now() - fadeStart) / 900;
          root.alpha = 1 - Math.min(1, t);
          if (t >= 1) {
            root.removeChildren().forEach((c) => c.destroy());
            root.alpha = 1;
            app.ticker.remove(fade);
          }
        };
        app.ticker.add(fade);
        return;
      }

      if (now - lastSpawn > (cfg.intensity >= 5 ? 90 : 120)) {
        lastSpawn = now;
        spawnBurst();
      }

      const g = 260;
      const friction = 0.985 - cfg.trail * 0.02;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        const age = now - p.born;
        const t = age / p.life;
        if (t >= 1) {
          root.removeChild(p.sprite);
          p.sprite.destroy();
          particles.splice(i, 1);
          continue;
        }
        p.vy += (g * dt) / targetFps;
        p.vx *= friction;
        p.vy *= friction;
        p.sprite.x += (p.vx * dt) / targetFps;
        p.sprite.y += (p.vy * dt) / targetFps;
        p.sprite.alpha = 0.95 * (1 - t);
      }
    };

    app.ticker.add(ticker);
  }

  return {
    app,
    playFireworks,
    applyConfig: (cfg: FxConfig) => {
      if (canvasFallback && fallbackState) {
        fallbackState.config = cfg;
        return;
      }
      applyConfig(cfg);
    },
    destroy: () => {
      destroyed = true;
      ro.disconnect();
      if (rafId) cancelAnimationFrame(rafId);
      if (!canvasFallback) app.destroy(true, { children: true });
      try {
        container.removeChild(view);
      } catch {
        // ignore
      }
    }
  };
}

type Particle = { sprite: PIXI.Sprite; vx: number; vy: number; born: number; life: number };

type FallbackParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  born: number;
  life: number;
  color: string;
  size: number;
};

type FallbackState = {
  ctx: CanvasRenderingContext2D;
  particles: FallbackParticle[];
  playing: boolean;
  endAt: number;
  lastSpawn: number;
  config: FxConfig;
};

function createFallback(canvas: HTMLCanvasElement): FallbackState | null {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.globalCompositeOperation = "lighter";
  return {
    ctx,
    particles: [],
    playing: false,
    endAt: 0,
    lastSpawn: 0,
    config: {
      intensity: 4,
      durationMs: 2500,
      particleMul: 1.25,
      colorMode: "neon",
      bloom: 0.65,
      trail: 0.6,
      fullscreen: true,
      reduceMotion: false
    }
  };
}

function playFallback(state: FallbackState, cfg: FxConfig) {
  state.config = cfg;
  if (cfg.intensity <= 0) return;
  state.playing = true;
  const now = performance.now();
  state.endAt = now + cfg.durationMs;
  state.lastSpawn = 0;

  const tick = () => {
    const t = performance.now();
    const { ctx } = state;
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    const fade = 0.18 + (1 - cfg.trail) * 0.35;
    ctx.fillStyle = `rgba(0,0,0,${fade})`;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    ctx.globalCompositeOperation = "lighter";

    if (t - state.lastSpawn > (cfg.intensity >= 5 ? 90 : 120)) {
      state.lastSpawn = t;
      spawnBurst2d(state, w, h);
    }

    const g = 260;
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      const age = t - p.born;
      const u = age / p.life;
      if (u >= 1) {
        state.particles.splice(i, 1);
        continue;
      }
      p.vy += g * 0.016;
      p.vx *= 0.985;
      p.vy *= 0.985;
      p.x += p.vx * 0.016;
      p.y += p.vy * 0.016;

      const alpha = (1 - u) * 0.9;
      ctx.beginPath();
      ctx.fillStyle = p.color.replace("ALPHA", alpha.toFixed(3));
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    if (t > state.endAt && state.particles.length < 20) {
      state.playing = false;
      return;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function spawnBurst2d(state: FallbackState, w: number, h: number) {
  const cfg = state.config;
  const x = Math.random() * w;
  const y = h * (0.10 + Math.random() * 0.55);
  const baseCount = Math.max(12, cfg.intensity * 80 * cfg.particleMul);
  const count = Math.floor(baseCount * (0.75 + Math.random() * 0.7));
  const hueBase = Math.random();
  const now = performance.now();

  for (let i = 0; i < count; i++) {
    const speed = (160 + Math.random() * 520) * (cfg.intensity >= 5 ? 1.15 : 1.0);
    const ang = Math.random() * Math.PI * 2;
    const vx = Math.cos(ang) * speed;
    const vy = Math.sin(ang) * speed;
    const life = 900 + Math.random() * 1100;
    const size = (1.5 + Math.random() * 3.8) * (cfg.intensity >= 5 ? 1.15 : 1.0);
    const color = pickCssColor(cfg.colorMode, hueBase);
    state.particles.push({ x, y, vx, vy, born: now, life, color, size });
  }
}

function pickCssColor(mode: FxConfig["colorMode"], hueBase: number): string {
  if (mode === "gold") return "rgba(255,209,102,ALPHA)";
  if (mode === "rainbow") {
    const h = Math.floor(Math.random() * 360);
    return `hsla(${h},95%,60%,ALPHA)`;
  }
  const h = Math.floor(((hueBase + Math.random() * 0.25) % 1) * 360);
  return `hsla(${h},95%,62%,ALPHA)`;
}

function makeParticleTexture(app: PIXI.Application): PIXI.Texture {
  const g = new PIXI.Graphics();
  g.circle(16, 16, 14).fill({ color: 0xffffff, alpha: 1 });
  g.circle(16, 16, 10).fill({ color: 0xffffff, alpha: 1 });
  const tex = app.renderer.generateTexture(g, { resolution: 2 });
  g.destroy();
  return tex;
}

function pickColor(mode: FxConfig["colorMode"], hueBase: number): number {
  if (mode === "gold") return 0xffd166;
  if (mode === "rainbow") return hslToRgbInt(Math.random(), 0.95, 0.6);
  const hue = (hueBase + Math.random() * 0.25) % 1;
  return hslToRgbInt(hue, 0.95, 0.62);
}

function hslToRgbInt(h: number, s: number, l: number): number {
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  const ri = Math.round(r * 255);
  const gi = Math.round(g * 255);
  const bi = Math.round(b * 255);
  return (ri << 16) + (gi << 8) + bi;
}
