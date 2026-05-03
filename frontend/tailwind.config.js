/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#e6feff",
          100: "#b3fbff",
          200: "#00d4ff",
          300: "#00b8d9",
          400: "#0095b3",
          500: "#006f85",
        },
        dark: {
          50:  "#e8edf5",
          100: "#c4d4e8",
          200: "#8ba8c4",
          300: "#6b8cae",
          400: "#445d7a",
          500: "#1e3458",
          600: "#1a2e50",
          700: "#111d30",
          800: "#0d1929",
          900: "#0a1525",
          950: "#060d1a",
        },
      },
      fontFamily: {
        sans: ["Manrope", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
        display: ["Space Grotesk", "sans-serif"],
      },
      animation: {
        "spin-slow": "spin 3s linear infinite",
        "fade-in":   "fadeIn 0.3s ease-out",
        "slide-up":  "slideUp 0.3s ease-out",
      },
      keyframes: {
        fadeIn:  { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: "translateY(12px)" }, to: { opacity: 1, transform: "translateY(0)" } },
      },
    },
  },
  plugins: [],
};
