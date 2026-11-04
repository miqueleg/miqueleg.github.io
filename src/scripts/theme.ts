// Theme tokens read from CSS, refreshed when the colour scheme changes, plus
// the small canvas helper every animated panel uses.

export type Tokens = Record<"paper" | "paper2" | "card" | "ink" | "ink2" | "ink3" | "rule" | "neg" | "pos" | "mid" | "mono", string>;

export const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

const listeners: Array<() => void> = [];
export let T: Tokens = read();

function read(): Tokens {
  const cs = getComputedStyle(document.documentElement);
  const g = (n: string) => cs.getPropertyValue(n).trim();
  return {
    paper: g("--paper"), paper2: g("--paper-2"), card: g("--card"), ink: g("--ink"), ink2: g("--ink-2"), ink3: g("--ink-3"),
    rule: g("--rule"), neg: g("--neg"), pos: g("--pos"), mid: g("--mid"), mono: g("--mono"),
  };
}
const refresh = () => {
  T = read();
  listeners.forEach((f) => f());
};
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", refresh);
new MutationObserver(refresh).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

export const onTheme = (f: () => void) => listeners.push(f);

export type RGB = [number, number, number];
export const hex = (h: string): RGB => {
  h = h.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;
};
export const mix = (a: RGB, b: RGB, t: number): RGB => a.map((v, i) => Math.round(v + (b[i] - v) * t)) as RGB;
export const rgb = (c: RGB) => `rgb(${c[0]},${c[1]},${c[2]})`;
/** ESP-style diverging map, q in [-1, 1]: red negative, blue positive. */
export const diverge = (q: number): RGB => {
  const m = hex(T.mid);
  return q < 0 ? mix(m, hex(T.neg), Math.min(1, -q)) : mix(m, hex(T.pos), Math.min(1, q));
};
export const font = (px: number) => `${px}px ${T.mono}`;

/** DPR-aware canvas that only animates while on screen. */
export function panel(cv: HTMLCanvasElement, draw: (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => void) {
  const ctx = cv.getContext("2d")!;
  let w = 0, h = 0, visible = false, raf = 0;
  const t0 = performance.now();
  const size = () => {
    const r = cv.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1);
    w = r.width; h = r.height;
    cv.width = Math.round(w * d); cv.height = Math.round(h * d);
    ctx.setTransform(d, 0, 0, d, 0, 0);
  };
  const frame = (now: number) => {
    draw(ctx, w, h, (now - t0) / 1000);
    if (visible && !reduceMotion) raf = requestAnimationFrame(frame);
  };
  const kick = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
  };
  new ResizeObserver(() => { size(); kick(); }).observe(cv);
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible) kick(); }).observe(cv);
  onTheme(kick);
  return { kick };
}
