import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // Paleta da marca: fundo nude, todo o resto em carmim.
      colors: {
        paper: "#EFE3D8",
        ink: "#7A1E43",
        graphite: "#9B4A63",
        line: "#DCC5C9",
        plum: "#7A1E43",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
      },
      borderRadius: {
        none: "0px",
      },
    },
  },
  plugins: [],
};

export default config;
