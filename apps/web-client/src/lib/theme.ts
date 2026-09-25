/**
 * Applies the signed-in account's accent as CSS custom properties on <html>.
 * Pages use Tailwind court-400 / court-600 which read --theme / --theme-strong.
 */

import { DEFAULT_THEME_COLOR } from "@volleyball-manager/shared-types";

/** Brand green used before login and when a stored value is missing. */
export const FALLBACK_THEME = DEFAULT_THEME_COLOR;

/** Accepts #rgb or #rrggbb (with or without #) and returns lowercase #rrggbb, or null. */
export function normalizeThemeHex(value: string): string | null {
  const trimmed = value.trim();
  const six = trimmed.match(/^#?([0-9a-fA-F]{6})$/);
  if (six) {
    return `#${six[1].toLowerCase()}`;
  }
  const three = trimmed.match(/^#?([0-9a-fA-F]{3})$/);
  if (!three) {
    return null;
  }
  const [r, g, b] = three[1].split("");
  return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
}

/** Darkens a #rrggbb hex toward black for buttons and hover states. */
export function darkenHex(hex: string, amount: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const scale = 1 - amount;
  const r = Math.round(((n >> 16) & 255) * scale);
  const g = Math.round(((n >> 8) & 255) * scale);
  const b = Math.round((n & 255) * scale);
  return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Writes --theme and --theme-strong on the document so every module inherits the accent.
 */
export function applyThemeColor(hex: string | null | undefined): void {
  if (typeof document === "undefined") {
    return;
  }
  const color = normalizeThemeHex(hex ?? "") ?? FALLBACK_THEME;
  const root = document.documentElement;
  root.style.setProperty("--theme", color);
  root.style.setProperty("--theme-strong", darkenHex(color, 0.35));
}
