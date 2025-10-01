export default {
  content: [
  './index.html',
  './src/**/*.{js,ts,jsx,tsx}'
],
  theme: {
    extend: {
      colors: {
        background: "#0a0a0a",
        surface: "#121212",
        border: "#1f1f1f",
        "border-light": "#2a2a2a",
        income: "#00ff41",
        expense: "#ff004d",
        highlight: "#00d9ff",
        warning: "#ffa600",
        balance: "#ffa600",
      },
      fontFamily: {
        mono: ["SF Mono", "JetBrains Mono", "monospace"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
}