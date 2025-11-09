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
        cs2: {
          orange: '#FF6700',
          blue: '#3B6EA5',
          dark: '#1B2838',
          light: '#F5F5F5',
        },
      },
    },
  },
  plugins: [],
};
export default config;
