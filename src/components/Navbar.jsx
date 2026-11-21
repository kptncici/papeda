import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogOut, Menu, Search, ShoppingBag, X } from 'lucide-react';
import Logo from './Logo';
import NotificationBell from './NotificationBell';
import { useAuth, homePathFor } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useToast } from '../contexts/ToastContext';

const LINKS = [
  { to: '/produk', label: 'Koleksi' },
  { to: '/kategori', label: 'Kategori' },
  { to: '/tentang', label: 'Tentang' },
  { to: '/kontak', label: 'Kontak' },
];

function SearchForm({ onDone, compact = false }) {
  const navigate = useNavigate();
  const [term, setTerm] = useState('');
  const submit = (event) => {
    event.preventDefault();
    navigate(term.trim() ? `/produk?q=${encodeURIComponent(term.trim())}` : '/produk');
    onDone?.();
  };
  return (
    <form onSubmit={submit} role="search" className="relative w-full">
      <label htmlFor={compact ? 'nav-search-mobile' : 'nav-search'} className="sr-only">
        Cari produk atau toko
      </label>
      <Search
        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-400"
        strokeWidth={1.5}
      />
      <input
        id={compact ? 'nav-search-mobile' : 'nav-search'}
        type="search"
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        placeholder="Cari noken, ukiran, aksesoris, atau toko pengrajin..."
        className="w-full border border-cream-300 bg-white py-2 pl-10 pr-20 text-xs text-charcoal placeholder:text-charcoal-400 focus:border-charcoal focus:outline-none"
      />
      <button
        type="submit"
        className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-charcoal px-3 py-1 text-[10px] font-semibold uppercase tracking-eyebrow text-cream-100 transition-colors hover:bg-charcoal-700"
      >
        Cari
      </button>
    </form>
  );
}

export default function Navbar() {
  const { profile, signOut } = useAuth();
  const { count } = useCart();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => { setOpen(false); }, [location.pathname, location.search]);

  const logout = async () => {
    await signOut();
    toast.success('Anda sudah keluar.');
    navigate('/');
  };

  const linkClass = ({ isActive }) =>
    `text-xs font-semibold uppercase tracking-eyebrow transition-colors ${
      isActive ? 'text-charcoal link-active' : 'text-charcoal-500 hover:text-charcoal'
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-cream-300 bg-cream-50/95 backdrop-blur">
      {/* Baris Utama: Kiri (Logo) — Tengah (Search Bar Presisi) — Kanan (Navigasi & Akun) */}
      <div className="container-page grid h-16 grid-cols-[auto_1fr_auto] items-center gap-3 md:gap-6">
        <div className="flex items-center">
          <Logo />
        </div>

        {/* Tengah: Search Bar tepat di tengah pada layar Tablet & PC */}
        <div className="mx-auto hidden w-full max-w-md md:block lg:max-w-lg">
          <SearchForm />
        </div>

        {/* Kanan: Menu Navigasi & Ikon Aksi */}
        <div className="ml-auto flex items-center gap-2 lg:gap-5">
          <nav className="hidden items-center gap-5 xl:flex" aria-label="Utama">
            {LINKS.slice(0, 3).map((link) => (
              <NavLink key={link.to} to={link.to} className={linkClass}>
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-1.5">
            {profile?.role === 'buyer' && (
              <Link
                to="/keranjang"
                aria-label={`Keranjang, ${count} barang`}
                className="relative p-2 text-charcoal-600 transition-colors hover:bg-cream-200 hover:text-charcoal"
              >
                <ShoppingBag className="h-5 w-5" strokeWidth={1.5} />
                {count > 0 && (
                  <span className="absolute right-0.5 top-0.5 flex h-4 min-w-[16px] items-center justify-center bg-charcoal px-1 text-[10px] font-bold text-white">
                    {count}
                  </span>
                )}
              </Link>
            )}
            <NotificationBell />
            {profile ? (
              <div className="hidden items-center gap-1.5 md:flex">
                <Link to={homePathFor(profile.role)} className="btn btn-outline btn-sm">
                  <LayoutDashboard className="h-3.5 w-3.5" strokeWidth={1.5} />Dasbor
                </Link>
                <button type="button" onClick={logout} className="btn btn-ghost btn-sm" aria-label="Keluar">
                  <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} />
                </button>
              </div>
            ) : (
              <div className="hidden items-center gap-2 md:flex">
                <Link to="/masuk" className="btn btn-ghost btn-sm">Masuk</Link>
                <Link to="/daftar" className="btn btn-primary btn-sm">Daftar</Link>
              </div>
            )}
            <button
              type="button"
              className="p-2 text-charcoal hover:bg-cream-200 xl:hidden"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-label="Buka menu"
            >
              {open ? <X className="h-5 w-5" strokeWidth={1.5} /> : <Menu className="h-5 w-5" strokeWidth={1.5} />}
            </button>
          </div>
        </div>
      </div>

      {/* Baris Search Compact khusus Mobile (selalu terlihat rapi di tengah bawah header mobile) */}
      <div className="border-t border-cream-200 bg-cream-100/70 px-4 py-2 md:hidden">
        <SearchForm compact />
      </div>

      {/* Drawer Menu Mobile & Tablet */}
      {open && (
        <div className="border-t border-cream-300 bg-cream-50 xl:hidden">
          <div className="container-page space-y-4 py-4">
            <nav className="flex flex-col" aria-label="Menu seluler">
              {LINKS.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className="border-b border-cream-200 py-3 text-xs font-semibold uppercase tracking-eyebrow text-charcoal"
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>
            <div className="flex flex-wrap gap-2 md:hidden">
              {profile ? (
                <>
                  <Link to={homePathFor(profile.role)} className="btn btn-outline flex-1">
                    <LayoutDashboard className="h-4 w-4" strokeWidth={1.5} />Dasbor
                  </Link>
                  <button type="button" onClick={logout} className="btn btn-ghost flex-1">
                    <LogOut className="h-4 w-4" strokeWidth={1.5} />Keluar
                  </button>
                </>
              ) : (
                <>
                  <Link to="/masuk" className="btn btn-outline flex-1">Masuk</Link>
                  <Link to="/daftar" className="btn btn-primary flex-1">Daftar</Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
