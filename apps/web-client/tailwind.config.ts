import type { Config } from "tailwindcss";

/** Tailwind content paths for the App Router UI. */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        court: {
          950: "#07140f",
          900: "#0c1f17",
          800: "#143528",
          600: "var(--theme-strong)",
          400: "var(--theme)",
        },
      },
    },
  },
  plugins: [],
};

export default config;
