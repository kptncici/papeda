import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth, homePathFor } from '../contexts/AuthContext';
import { PageLoader } from '../components/ui/Feedback';

/**
 * Penjaga rute di sisi tampilan. Ini hanya untuk pengalaman pengguna;
 * pembatasan data yang sesungguhnya ditegakkan oleh RLS di database.
 */
export function RequireRole({ roles }) {
  const { profile, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoader label="Memeriksa sesi" />;
  if (!profile) return <Navigate to="/masuk" replace state={{ from: location.pathname + location.search }} />;
  if (!roles.includes(profile.role)) return <Navigate to={homePathFor(profile.role)} replace />;
  return <Outlet />;
}

/** Halaman penjual yang butuh toko berstatus aktif. */
export function RequireActiveStore() {
  const { store } = useAuth();
  if (!store || store.status !== 'approved') return <Navigate to="/seller/pengajuan" replace />;
  return <Outlet />;
}

/** Halaman masuk/daftar tidak ditampilkan lagi bila sudah login. */
export function GuestOnly() {
  const { profile, loading } = useAuth();
  if (loading) return <PageLoader label="Memeriksa sesi" />;
  if (profile) return <Navigate to={homePathFor(profile.role)} replace />;
  return <Outlet />;
}
