/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        carbon: {
          50: "#f2f7f4",
          100: "#dce9e1",
          200: "#b8d3c3",
          300: "#8fb9a1",
          400: "#65967d",
          500: "#45725f",
          600: "#325546",
          700: "#244036",
          800: "#152a24",
          900: "#0c1715",
        },
        accent: {
          400: "#f2b84b",
          500: "#e99821",
          600: "#c97910",
        },
      },
      boxShadow: {
        glow: "0 24px 80px rgba(15, 23, 22, 0.18)",
      },
      backgroundImage: {
        "dashboard-grid":
          "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};