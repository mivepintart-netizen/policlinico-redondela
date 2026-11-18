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
        fondo: "#F6FBFB",
        tinta: {
          DEFAULT: "#12333A",
          suave: "#4A6670",
          tenue: "#7C949B",
        },
        linea: "#DCEBEC",
        brand: {
          50: "#EAF6F7",
          100: "#D2ECEE",
          200: "#A6D8DD",
          300: "#6FBDC5",
          400: "#3A9EA9",
          500: "#0D7C8A",
          600: "#0A6974",
          700: "#09555E",
          800: "#0A434A",
          900: "#0B363C",
        },
        ambar: {
          50: "#FDF4EA",
          100: "#FBE6CF",
          500: "#E8913A",
          600: "#C9731F",
          700: "#9E5815",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        tarjeta: "0 1px 2px rgba(18,51,58,.04), 0 8px 24px -12px rgba(18,51,58,.12)",
        ticket: "0 2px 4px rgba(18,51,58,.04), 0 24px 48px -20px rgba(13,124,138,.35)",
      },
    },
  },
  plugins: [],
};
export default config;
