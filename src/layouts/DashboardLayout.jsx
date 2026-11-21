import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BarChart3, Bell, ClipboardList, FileCheck2, FolderTree, History, LayoutDashboard, LogOut, MapPin, Menu, Package,
  Percent, Receipt, Settings, ShieldCheck, ShoppingBag, Star, Store, User, Users, X, ExternalLink,
} from 'lucide-react';
import Logo from '../components/Logo';
import NotificationBell from '../components/NotificationBell';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { ROLE_LABEL } from '../utils/format';

const NAV = {
  buyer: [
    { to: '/akun', label: 'Ringkasan', icon: LayoutDashboard, end: true },
    { to: '/akun/pesanan', label: 'Pesanan saya', icon: ClipboardList },
    { to: '/keranjang', label: 'Keranjang', icon: ShoppingBag },
    { to: '/akun/ulasan', label: 'Ulasan produk', icon: Star },
    { to: '/akun/alamat', label: 'Alamat pengiriman', icon: MapPin },
    { to: '/akun/notifikasi', label: 'Notifikasi', icon: Bell },
    { to: '/akun/profil', label: 'Profil', icon: User },
  ],
  seller: [
    { to: '/seller', label: 'Ringkasan', icon: LayoutDashboard, end: true },
    { to: '/seller/produk', label: 'Produk', icon: Package },
    { to: '/seller/pesanan', label: 'Pesanan', icon: ClipboardList },
    { to: '/seller/laporan', label: 'Laporan penjualan', icon: BarChart3 },
    { to: '/seller/toko', label: 'Profil toko', icon: Store },
    { to: '/seller/pengaturan', label: 'Pengaturan toko', icon: Settings },
    { to: '/seller/pengajuan', label: 'Pengajuan toko', icon: FileCheck2 },
    { to: '/seller/notifikasi', label: 'Notifikasi', icon: Bell },
    { to: '/seller/profil', label: 'Profil akun', icon: User },
  ],
  admin: [
    { to: '/admin', label: 'Ringkasan', icon: LayoutDashboard, end: true },
    { to: '/admin/pengguna', label: 'Pengguna', icon: Users },
    { to: '/admin/toko', label: 'Verifikasi toko', icon: ShieldCheck },
    { to: '/admin/kategori', label: 'Kategori', icon: FolderTree },
    { to: '/admin/produk', label: 'Produk & moderasi', icon: Package },
    { to: '/admin/transaksi', label: 'Transaksi', icon: Receipt },
    { to: '/admin/pesanan', label: 'Pesanan', icon: ClipboardList },
    { to: '/admin/laporan-penjualan', label: 'Laporan penjualan', icon: BarChart3 },
    { to: '/admin/laporan-komisi', label: 'Laporan komisi', icon: Percent },
    { to: '/admin/log', label: 'Log aktivitas', icon: History },
    { to: '/admin/pengaturan', label: 'Pengaturan sistem', icon: Settings },
    { to: '/admin/notifikasi', label: 'Notifikasi', icon: Bell },
    { to: '/admin/profil', label: 'Profil akun', icon: User },
  ],
};

export default function DashboardLayout() {
  const { profile, signOut } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const items = NAV[profile.role] || [];

  useEffect(() => { setOpen(false); }, [location.pathname]);

  const logout = async () => {
    await signOut();
    toast.success('Anda sudah keluar.');
    navigate('/');
  };

  const sidebar = (
    <nav className="flex flex-col gap-0.5 p-4" aria-label="Menu dasbor">
      <p className="mb-2 px-3 text-[10px] font-medium uppercase tracking-eyebrow text-charcoal-400">
        Menu {ROLE_LABEL[profile.role]}
      </p>
      {items.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.end}
          className={({ isActive }) => `flex items-center gap-3 border-l-2 px-3 py-2.5 text-xs font-medium uppercase tracking-wider transition-colors ${
            isActive
              ? 'border-charcoal bg-cream-100 text-charcoal'
              : 'border-transparent text-charcoal-500 hover:bg-cream-50 hover:text-charcoal'
          }`}>
          <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />{item.label}
        </NavLink>
      ))}
      <div className="my-4 border-t border-cream-300" />
      <NavLink to="/" className="flex items-center gap-3 border-l-2 border-transparent px-3 py-2.5 text-xs font-medium uppercase tracking-wider text-charcoal-500 transition-colors hover:bg-cream-50 hover:text-charcoal">
        <ExternalLink className="h-4 w-4" strokeWidth={1.5} />Kembali ke toko
      </NavLink>
      <button type="button" onClick={logout} className="flex items-center gap-3 border-l-2 border-transparent px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-clay-600 transition-colors hover:bg-clay-50">
        <LogOut className="h-4 w-4" strokeWidth={1.5} />Keluar
      </button>
    </nav>
  );

  return (
    <div className="min-h-screen bg-cream-100">
      <header className="sticky top-0 z-40 border-b border-cream-300 bg-cream-50/95 backdrop-blur">
        <div className="flex h-16 items-center gap-4 px-4 lg:px-8">
          <button type="button" className="p-2 text-charcoal hover:bg-cream-200 lg:hidden" onClick={() => setOpen(true)} aria-label="Buka menu dasbor">
            <Menu className="h-5 w-5" strokeWidth={1.5} />
          </button>
          <Logo compact />
          <span className="hidden border border-cream-300 bg-white px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-eyebrow text-earth-600 sm:inline">
            {ROLE_LABEL[profile.role]}
          </span>
          <div className="ml-auto flex items-center gap-3">
            <NotificationBell />
            <div className="hidden border-l border-cream-300 pl-3 text-right sm:block">
              <p className="max-w-[180px] truncate text-xs font-medium uppercase tracking-wider text-charcoal">{profile.full_name || profile.email}</p>
              <p className="max-w-[180px] truncate text-[11px] text-charcoal-400">{profile.email}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 overflow-y-auto border-r border-cream-300 bg-white lg:block">{sidebar}</aside>
        <AnimatePresence>
          {open && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 bg-charcoal/40 backdrop-blur-[1px]"
                onClick={() => setOpen(false)}
              />
              <motion.aside
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-y-0 left-0 w-72 max-w-[85vw] overflow-y-auto border-r border-cream-300 bg-white"
              >
                <div className="flex h-16 items-center justify-between border-b border-cream-300 px-4">
                  <Logo compact />
                  <button type="button" onClick={() => setOpen(false)} aria-label="Tutup menu" className="p-2 hover:bg-cream-200">
                    <X className="h-5 w-5" strokeWidth={1.5} />
                  </button>
                </div>
                {sidebar}
              </motion.aside>
            </div>
          )}
        </AnimatePresence>
        <main className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto max-w-6xl"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
