/** @type {import('tailwindcss').Config} */
module.exports = {
  // JIT mode is default in Tailwind v4
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      // Tambahan kustom (warna, radius, dsb.) dapat dimasukkan di sini
    }
  },
  plugins: [
    require("@tailwindcss/typography")
    // plugin lain dapat ditambahkan bila diperlukan
  ],
  safelist: [
    // masukkan class yang dibangkitkan secara dinamis, contoh:
    // "bg-success",
    // "text-primary"
  ]
};
