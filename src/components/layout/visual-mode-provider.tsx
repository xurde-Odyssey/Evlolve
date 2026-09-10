"use client";

import { useEffect } from "react";
import {
  applyVisualMode,
  isVisualMode,
  VISUAL_MODE_STORAGE_KEY,
} from "@/lib/ui/visual-mode";

export function VisualModeProvider() {
  useEffect(() => {
    const savedMode = localStorage.getItem(VISUAL_MODE_STORAGE_KEY);
    applyVisualMode(isVisualMode(savedMode) ? savedMode : "minimal");

    function syncMode(event: Event) {
      const mode = (event as CustomEvent<string>).detail;
      if (isVisualMode(mode)) applyVisualMode(mode);
    }

    window.addEventListener("evolve:visual-mode", syncMode);
    return () => window.removeEventListener("evolve:visual-mode", syncMode);
  }, []);

  return null;
}
