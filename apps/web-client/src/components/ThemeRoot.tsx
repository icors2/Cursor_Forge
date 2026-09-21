"use client";

/**
 * Loads /auth/me once the shell mounts and paints --theme for the signed-in account.
 * Unauthenticated visits keep the CSS default (brand green).
 */

import { useEffect, type ReactNode } from "react";
import type { PublicUser } from "@volleyball-manager/shared-types";
import { api } from "@/lib/api";
import { applyThemeColor, FALLBACK_THEME } from "@/lib/theme";

/** Client wrapper that applies the account theme globally. */
export function ThemeRoot({ children }: { children: ReactNode }) {
  useEffect(() => {
    let cancelled = false;
    api<PublicUser>("/auth/me")
      .then((user) => {
        if (!cancelled) applyThemeColor(user.themeColor);
      })
      .catch(() => {
        if (!cancelled) applyThemeColor(FALLBACK_THEME);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return children;
}
