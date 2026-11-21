import { Link } from 'react-router-dom';

/**
 * LogoMark: Ikon helai daun sagu simpel & minimalis (monochrome line-art).
 */
export function LogoMark({ className = 'h-8 w-8', light = false }) {
  const stroke = light ? '#FAF9F6' : '#181817';

  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true">
      {/* Batang tengah daun sagu */}
      <path
        d="M8 32C14 24 22 16 32 8"
        stroke={stroke}
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      {/* Helai daun kiri */}
      <path
        d="M14 25C12 20 13 15 17 12"
        stroke={stroke}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M20 19C19 14 21 10 25 8"
        stroke={stroke}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      {/* Helai daun kanan */}
      <path
        d="M14 25C19 27 24 26 28 22"
        stroke={stroke}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M20 19C25 20 29 18 32 14"
        stroke={stroke}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Logo({ to = '/', light = false, compact = false }) {
  return (
    <Link to={to} className="group flex items-center gap-2.5" aria-label="PAPEDA, ke beranda">
      <LogoMark light={light} />
      <span className="leading-none">
        <span
          className={`block font-display text-lg font-bold uppercase ${
            light ? 'text-cream-100' : 'text-charcoal'
          }`}
        >
          PAPEDA
        </span>
        {!compact && (
          <span
            className={` block text-[10px] font-normal ${
              light ? 'text-cream-300' : 'text-charcoal-500'
            }`}
          >
            Papua Aksesori &amp; Produk Etnik Daerah Asli
          </span>
        )}
      </span>
    </Link>
  );
}
