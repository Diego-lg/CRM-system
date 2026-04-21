/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#f7f7f7",
          100: "#e3e3e3",
          500: "#525252",
          600: "#404040",
          700: "#262626",
        },
        accent: "#171717",
        dark: {
          bg: "#0f172a",
          card: "#1e293b",
          border: "#334155",
          muted: "#94a3b8",
        },
      },
    },
  },
  plugins: [],
}
