import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Insight design system
        navy: {
          950: "#050C18",
          900: "#08111F",
          800: "#0C1A2E",
          700: "#13243D",
          600: "#1B3155",
        },
        orange: {
          DEFAULT: "#E05206",
          400: "#F26A1A",
          300: "#FF8B45",
        },
        ink: {
          DEFAULT: "#E8EEF5",
          dim: "#9BB0C6",
          dimmer: "#5C7591",
        },
        signal: {
          red: "#E74C3C",
          amber: "#F2B33C",
          green: "#3CD389",
          blue: "#3FA9F5",
        },
      },
      fontFamily: {
        sans: ['"Inter Tight"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      letterSpacing: {
        wide2: "0.06em",
      },
    },
  },
  plugins: [],
};

export default config;
