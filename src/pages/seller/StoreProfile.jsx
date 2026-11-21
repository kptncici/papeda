import { Link } from 'react-router-dom';
import { ExternalLink, Mail, MapPin, Phone, Settings, Store } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { PageHeader } from '../../components/ui/Layout';
import { StatusBadge } from '../../components/ui/Badge';
import { STORE_STATUS, tanggal } from '../../utils/format';

export default function SellerStoreProfile() {
  const { store } = useAuth();
  return (
    <>
      <PageHeader title="Profil toko" description="Beginilah data toko Anda terlihat oleh pembeli."
        actions={
          <>
            <Link to={`/toko/${store.id}`} className="btn btn-outline"><ExternalLink className="h-4 w-4" />Lihat halaman publik</Link>
            <Link to="/seller/pengaturan" className="btn btn-primary"><Settings className="h-4 w-4" />Ubah data toko</Link>
          </>
        } />
      <div className="card overflow-hidden">
        <div className="weave-band" aria-hidden="true" />
        <div className="flex flex-col gap-5 p-6 sm:flex-row">
          <span className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-cream-200 text-charcoal-600">
            {store.image_url ? <img src={store.image_url} alt={`Foto ${store.name}`} className="h-full w-full object-cover" /> : <Store className="h-9 w-9" />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-semibold">{store.name}</h2>
              <StatusBadge map={STORE_STATUS} value={store.status} />
            </div>
            <p className="mt-2 max-w-prose whitespace-pre-line text-sm leading-6 text-charcoal-600">{store.description || 'Belum ada deskripsi.'}</p>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex gap-2"><dt><MapPin className="h-4 w-4 text-earth-500" /><span className="sr-only">Alamat</span></dt><dd>{[store.address, store.city, store.region].filter(Boolean).join(', ') || '-'}</dd></div>
              <div className="flex gap-2"><dt><Phone className="h-4 w-4 text-earth-500" /><span className="sr-only">Telepon</span></dt><dd>{store.phone || '-'}</dd></div>
              <div className="flex gap-2"><dt><Mail className="h-4 w-4 text-earth-500" /><span className="sr-only">Email</span></dt><dd>{store.email || '-'}</dd></div>
            </dl>
            <p className="mt-4 text-xs text-charcoal-400">Terdaftar {tanggal(store.created_at)}{store.verified_at ? `, diverifikasi ${tanggal(store.verified_at)}` : ''}</p>
          </div>
        </div>
      </div>
    </>
  );
}
