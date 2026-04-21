/** @type {import('tailwindcss').Config} */
export default {
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
      },
    },
  },
  plugins: [],
};
