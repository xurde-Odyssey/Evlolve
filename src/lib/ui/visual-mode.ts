export type VisualMode = "modern" | "minimal";

export const VISUAL_MODE_STORAGE_KEY = "evolve.visual-mode";

export function isVisualMode(value: string | null): value is VisualMode {
  return value === "modern" || value === "minimal";
}

export function applyVisualMode(mode: VisualMode) {
  document.documentElement.dataset.visualMode = mode;
}

export function saveVisualMode(mode: VisualMode) {
  localStorage.setItem(VISUAL_MODE_STORAGE_KEY, mode);
  applyVisualMode(mode);
  window.dispatchEvent(new CustomEvent("evolve:visual-mode", { detail: mode }));
}
