/** @type {import('tailwindcss').Config} */
// Palet monokrom minimalis & elegan (khas brand fashion modern):
// 98% netral (warm bone/cream & hitam charcoal/ink), tanpa warna coklat.
// Token `earth` dipetakan ke skala hitam/charcoal agar seluruh halaman konsisten memakai hitam elegan.
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Hutan — hanya untuk status sukses/aktif. Basis: #2F4A3B
        forest: {
          50: "#F1F4F2",
          100: "#DDE5E0",
          200: "#BACBC1",
          300: "#8EA898",
          400: "#5F7D6B",
          500: "#45614F",
          600: "#2F4A3B",
          700: "#263D31",
          800: "#1D3026",
          900: "#14221B",
        },
        // Dipetakan ke skala hitam/ink (menggantikan coklat di seluruh komponen)
        earth: {
          50: "#F5F5F4",
          100: "#E7E6E4",
          200: "#D1CFCC",
          300: "#9E9B96",
          400: "#6E6B66",
          500: "#1C1B1A",
          600: "#141413",
          700: "#0F0F0E",
          800: "#0A0A09",
        },
        // Bone — latar hangat bersih. cream-100 = #FAF9F6 (background halaman)
        cream: {
          50: "#FDFCFA",
          100: "#FAF9F6",
          200: "#F2F0EB",
          300: "#E5E2DA",
          400: "#CFCAC0",
        },
        // Ink hitam elegan — teks, tombol utama, harga, logo.
        charcoal: {
          DEFAULT: "#181817",
          900: "#0F0F0E",
          800: "#181817",
          700: "#292826",
          600: "#4A4845",
          500: "#6E6B66",
          400: "#918E88",
          300: "#B9B6B0",
          200: "#DAD7D1",
        },
        // Merah Tanah — khusus status bahaya/hapus/habis.
        clay: {
          50: "#FAF1EE",
          100: "#F2DDD5",
          200: "#E2B8A9",
          300: "#C98872",
          400: "#B3654A",
          500: "#9E4A2F",
          600: "#843C26",
          700: "#682F1E",
        },
      },
      fontFamily: {
        display: ['"Jost"', "system-ui", "-apple-system", "sans-serif"],
        serif: ['Cormorant Garamond', "Georgia", "serif"],
        sans: [
          '"Jost"',
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
      },
      letterSpacing: {
        eyebrow: "0.2em",
      },
    },
  },
  plugins: [],
};
