// Lazy-loads 3Dmol only on pages that show a structure.
let lib: Promise<any> | null = null;
export const load3Dmol = (): Promise<any> =>
  (lib ??= import("3dmol").then((m: any) => (m.createViewer ? m : m.default)));

export const hasWebGL = () => {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
};

/** Shared viewer setup: transparent background, page keeps scrolling over it. */
export async function createViewer(el: HTMLElement, fallback: HTMLElement | null) {
  if (!hasWebGL()) {
    if (fallback) fallback.textContent = "This 3D view needs WebGL, which is turned off in this browser.";
    return null;
  }
  try {
    const $3Dmol = await load3Dmol();
    const v = $3Dmol.createViewer(el, { backgroundColor: "#090C12", backgroundAlpha: 0, antialias: true, nomouse: matchMedia("(pointer: coarse)").matches });
    el.addEventListener("wheel", (e) => e.stopPropagation(), { capture: true });
    fallback?.remove();
    return v;
  } catch {
    if (fallback) fallback.textContent = "The 3D viewer could not load.";
    return null;
  }
}

/** Run `play(true/false)` as the element enters and leaves the viewport. */
export const whileVisible = (el: Element, play: (on: boolean) => void, threshold = 0.15) =>
  new IntersectionObserver((es) => play(es[0].isIntersecting), { threshold }).observe(el);
