import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, Check, ExternalLink, MapPin, PauseCircle, Phone, Store, User, X } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { listStoresForAdmin, setStoreStatus } from '../../services/admin';
import { DataState, EmptyState, InlineError, Spinner } from '../../components/ui/Feedback';
import { Modal } from '../../components/ui/Modal';
import { FilterTabs, PageHeader } from '../../components/ui/Layout';
import { StatusBadge } from '../../components/ui/Badge';
import { STORE_STATUS, tanggal } from '../../utils/format';

const TABS = [
  { value: 'pending', label: 'Menunggu verifikasi' },
  { value: 'approved', label: 'Aktif' },
  { value: 'rejected', label: 'Ditolak' },
  { value: 'suspended', label: 'Ditangguhkan' },
  { value: '', label: 'Semua' },
];

const ACTIONS = {
  approved: { label: 'Setujui toko', needsReason: false, button: 'btn-primary' },
  rejected: { label: 'Tolak pengajuan', needsReason: true, button: 'btn-danger' },
  suspended: { label: 'Tangguhkan toko', needsReason: true, button: 'btn-danger' },
};

const LONG_DESCRIPTION = 220;

function InfoItem({ icon: Icon, label, children, className = '' }) {
  return (
    <div className={`flex gap-3 ${className}`}>
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center border border-cream-300 bg-cream-50 text-earth-500">
        <Icon className="h-4 w-4" strokeWidth={1.5} />
      </span>
      <div className="min-w-0">
        <dt className="text-[10px] uppercase tracking-eyebrow text-charcoal-400">{label}</dt>
        <dd className="mt-0.5 break-words text-xs text-charcoal">{children}</dd>
      </div>
    </div>
  );
}

function StoreCard({ store, onAction }) {
  const [expanded, setExpanded] = useState(false);
  const description = store.description || '';
  const isLong = description.length > LONG_DESCRIPTION;
  const address = [store.address, store.city, store.region].filter(Boolean).join(', ');

  return (
    <li className="card transition-colors hover:border-charcoal-300">
      <div className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-cream-200 pb-4">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-eyebrow text-earth-500">Profil Pengrajin</p>
            <h2 className="mt-1 break-words font-display text-xl font-normal tracking-tight text-charcoal">{store.name}</h2>
            <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs text-charcoal-400">
              <CalendarClock className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>Diajukan {tanggal(store.created_at, true)}</span>
              {store.verified_at && <span>• Diperiksa {tanggal(store.verified_at, true)}</span>}
            </p>
          </div>
          <StatusBadge map={STORE_STATUS} value={store.status} />
        </div>

        <dl className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <InfoItem icon={User} label="Pemilik">
            <span className="block font-medium text-charcoal">{store.owner?.full_name || '-'}</span>
            {store.owner?.email && <a href={`mailto:${store.owner.email}`} className="block text-charcoal-500 hover:text-earth-500 hover:underline">{store.owner.email}</a>}
          </InfoItem>
          <InfoItem icon={Phone} label="Kontak toko">
            {store.phone ? <a href={`tel:${store.phone}`} className="block font-medium hover:text-earth-500 hover:underline">{store.phone}</a> : <span className="block">-</span>}
          </InfoItem>
          <InfoItem icon={MapPin} label="Lokasi" className="sm:col-span-2 lg:col-span-1">{address || '-'}</InfoItem>
        </dl>

        <div className="mt-5 border border-cream-200 bg-cream-50/50 p-4">
          <p className="text-[10px] font-medium uppercase tracking-eyebrow text-charcoal-500">Cerita & Deskripsi Toko</p>
          {description ? (
            <>
              <p className={`mt-1.5 max-w-prose whitespace-pre-line text-sm leading-relaxed text-charcoal-700 ${isLong && !expanded ? 'line-clamp-3' : ''}`}>{description}</p>
              {isLong && (
                <button type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}
                  className="mt-2 inline-block border-b border-charcoal pb-0.5 text-xs font-medium uppercase tracking-wider text-charcoal">
                  {expanded ? 'Lebih sedikit' : 'Baca selengkapnya'}
                </button>
              )}
            </>
          ) : <p className="mt-1.5 text-xs text-charcoal-400">Penjual belum menulis deskripsi.</p>}
        </div>

        {store.rejection_reason && (
          <div className="mt-4 border border-clay-200 bg-clay-50 px-4 py-3 text-xs text-clay-700">
            <p className="font-medium uppercase tracking-wider">Catatan moderasi terakhir</p>
            <p className="mt-1">{store.rejection_reason}</p>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 border-t border-cream-200 bg-cream-50/60 px-6 py-3.5 sm:flex-row sm:items-center sm:justify-end">
        {store.status === 'approved' && (
          <Link to={`/toko/${store.id}`} className="btn btn-ghost btn-sm sm:mr-auto"><ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />Lihat halaman toko</Link>
        )}
        {store.status === 'pending' && (
          <button type="button" className="btn btn-danger-outline btn-sm bg-white" onClick={() => onAction(store, 'rejected')}><X className="h-3.5 w-3.5" strokeWidth={1.5} />Tolak pengajuan</button>
        )}
        {store.status === 'approved' && (
          <button type="button" className="btn btn-danger-outline btn-sm bg-white" onClick={() => onAction(store, 'suspended')}><PauseCircle className="h-3.5 w-3.5" strokeWidth={1.5} />Tangguhkan toko</button>
        )}
        {store.status !== 'approved' && (
          <button type="button" className="btn btn-primary btn-sm" onClick={() => onAction(store, 'approved')}>
            <Check className="h-3.5 w-3.5" strokeWidth={1.5} />{store.status === 'suspended' ? 'Aktifkan kembali' : 'Setujui toko'}
          </button>
        )}
      </div>
    </li>
  );
}

export default function AdminStores() {
  const toast = useToast();
  const [status, setStatus] = useState('pending');
  const state = useAsync(() => listStoresForAdmin(status), [status]);
  const [action, setAction] = useState(null); // { store, status }
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const open = (store, nextStatus) => { setAction({ store, status: nextStatus }); setReason(''); setError(''); };

  const submit = async () => {
    const config = ACTIONS[action.status];
    if (config.needsReason && reason.trim().length < 5) {
      setError('Tulis alasan minimal 5 karakter agar penjual tahu apa yang harus diperbaiki.');
      return;
    }
    setBusy(true);
    try {
      await setStoreStatus(action.store.id, action.status, reason.trim());
      toast.success(`${config.label} berhasil.`);
      setAction(null);
      state.reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Produk Pilihan Pengrajin"
        title="Verifikasi toko"
        description="Tinjau dan verifikasi profil toko pengrajin sebelum karya mereka ditayangkan di katalog publik."
      />
      <FilterTabs options={TABS} value={status} onChange={setStatus} />
      <DataState state={state}>
        {(stores) => stores.length === 0 ? (
          <EmptyState icon={Store} title="Tidak ada toko" description={status === 'pending' ? 'Tidak ada pengajuan yang menunggu verifikasi saat ini.' : 'Tidak ada toko dengan status ini.'} />
        ) : (
          <>
            <p className="mb-4 text-xs uppercase tracking-eyebrow text-charcoal-400">Menampilkan {stores.length} toko</p>
            <ul className="space-y-4">
              {stores.map((store) => <StoreCard key={store.id} store={store} onAction={open} />)}
            </ul>
          </>
        )}
      </DataState>

      <Modal open={Boolean(action)} title={action ? `${ACTIONS[action.status].label}: ${action.store.name}` : ''} onClose={() => setAction(null)} size="max-w-md"
        footer={action && (
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setAction(null)} disabled={busy}>Batal</button>
            <button type="button" className={`btn ${ACTIONS[action.status].button}`} onClick={submit} disabled={busy}>{busy && <Spinner className="h-4 w-4" />}{ACTIONS[action.status].label}</button>
          </>
        )}>
        {action && (
          <div className="space-y-3">
            <InlineError>{error}</InlineError>
            {ACTIONS[action.status].needsReason ? (
              <>
                <label htmlFor="reason" className="label">Alasan (dikirim ke penjual)</label>
                <textarea id="reason" rows={3} className="input" value={reason} onChange={(e) => setReason(e.target.value)} />
              </>
            ) : <p className="text-sm leading-relaxed text-charcoal-600">Toko akan aktif dan pengrajin dapat langsung menayangkan produk. Pengrajin akan menerima notifikasi persetujuan.</p>}
          </div>
        )}
      </Modal>
    </>
  );
}
