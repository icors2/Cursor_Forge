/**
 * Root layout for Volleyball Manager.
 */

import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

/** Default browser tab metadata. */
export const metadata: Metadata = {
  title: "Volleyball Manager",
  description: "Live stats for club volleyball",
};

/** App shell. */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
