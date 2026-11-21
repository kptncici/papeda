import { Link } from 'react-router-dom';
import { ArrowUpRight, MapPin } from 'lucide-react';
import Logo from './Logo';
import footerAsset from '../assets/footer-ornament.png';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-20 overflow-hidden bg-charcoal text-cream-200">
      <div className="weave-band relative z-10" aria-hidden="true" />

      {/* Gambar ornamen transparan di kanan bawah footer */}
      <img
        src={footerAsset}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 right-0 z-0 h-56 w-auto select-none bg-transparent object-contain opacity-10 sm:h-72 lg:h-80"
      />

      {/* Top Editorial Banner */}
      <div className="relative z-10 border-b border-white/10">
        <div className="container-page flex flex-col items-start justify-between gap-6 py-12 md:flex-row md:items-end md:py-16">
          <div className="max-w-xl">
            <p className="text-[11px] font-medium uppercase tracking-eyebrow text-earth-300">
              Mitra Pengrajin &amp; UMKM Papua
            </p>
            <h2 className="mt-3 font-display text-2xl font-light tracking-tight text-cream-100 sm:text-4xl">
              Bawa karya anyaman dan ukiran autentik Anda ke panggung nasional.
            </h2>
          </div>
          <Link
            to="/daftar?peran=seller"
            className="inline-flex items-center gap-2 border border-cream-200 bg-transparent px-6 py-3 text-xs font-medium uppercase tracking-eyebrow text-cream-100 transition-colors hover:bg-cream-100 hover:text-charcoal"
          >
            Buka Toko Pengrajin
            <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.5} />
          </Link>
        </div>
      </div>

      {/* Main Footer Grid */}
      <div className="container-page relative z-10 py-14 md:py-20">
        <div className="grid gap-12 lg:grid-cols-12">
          {/* Brand Column */}
          <div className="lg:col-span-5">
            <Logo light />
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-cream-300/80">
              Ruang kurasi digital tempat pengrajin dan UMKM Papua menghadirkan noken, aksesoris, ukiran, serta kriya tangan autentik langsung kepada apresiator di seluruh Indonesia.
            </p>
            <div className="mt-6 flex items-center gap-2 text-xs text-cream-300/70">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-earth-300" strokeWidth={1.5} />
              <span>Jayapura &amp; Tanah Papua — Indonesia</span>
            </div>
          </div>

          {/* Navigation Columns */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-7">
            <nav aria-label="Koleksi">
              <p className="text-[11px] font-medium uppercase tracking-eyebrow text-earth-300">Koleksi</p>
              <ul className="mt-5 space-y-3 text-xs uppercase tracking-wider text-cream-200/80">
                <li><Link to="/produk" className="transition-colors hover:text-white">Semua Karya</Link></li>
                <li><Link to="/produk?urut=newest" className="transition-colors hover:text-white">Rilis Terbaru</Link></li>
                <li><Link to="/produk?urut=bestseller" className="transition-colors hover:text-white">Karya Terlaris</Link></li>
                <li><Link to="/kategori" className="transition-colors hover:text-white">Indeks Kategori</Link></li>
              </ul>
            </nav>

            <nav aria-label="Tentang PAPEDA">
              <p className="text-[11px] font-medium uppercase tracking-eyebrow text-earth-300">Rumah PAPEDA</p>
              <ul className="mt-5 space-y-3 text-xs uppercase tracking-wider text-cream-200/80">
                <li><Link to="/tentang" className="transition-colors hover:text-white">Cerita &amp; Filosofi</Link></li>
                <li><Link to="/kontak" className="transition-colors hover:text-white">Hubungi Kami</Link></li>
                <li><Link to="/daftar?peran=seller" className="transition-colors hover:text-white">Menjadi Pengrajin</Link></li>
              </ul>
            </nav>

            <nav aria-label="Akun">
              <p className="text-[11px] font-medium uppercase tracking-eyebrow text-earth-300">Layanan</p>
              <ul className="mt-5 space-y-3 text-xs uppercase tracking-wider text-cream-200/80">
                <li><Link to="/masuk" className="transition-colors hover:text-white">Masuk Akun</Link></li>
                <li><Link to="/daftar" className="transition-colors hover:text-white">Daftar Pembeli</Link></li>
                <li><Link to="/keranjang" className="transition-colors hover:text-white">Tas Belanja</Link></li>
              </ul>
            </nav>
          </div>
        </div>
      </div>

      {/* Bottom Legal & Editorial Signature */}
      <div className="relative z-10 border-t border-white/10">
        <div className="container-page flex flex-col items-center justify-between gap-3 py-6 text-[11px] uppercase tracking-eyebrow text-cream-300/60 sm:flex-row">
          <p>© {year} PAPEDA — Papua Aksesori &amp; Produk Etnik Daerah Asli</p>
          <p className="text-cream-300/50">Connecting Papuan Crafts to the World</p>
        </div>
      </div>
    </footer>
  );
}
