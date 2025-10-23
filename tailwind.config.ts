import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        csgo: {
          orange: "#FF6B00",
          blue: "#4B69FF",
          purple: "#8847FF",
          red: "#D32CE6",
          gold: "#FFD700",
        },
        gray: {
          750: "#2b2d31",
          950: "#0a0a0a",
        },
      },
      width: {
        '9.5': '2.375rem', // 37.5px for weapon icons
      },
    },
  },
  plugins: [],
};
export default config;
