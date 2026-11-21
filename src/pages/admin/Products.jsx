import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, Search } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { listProductsForAdmin, moderateProduct } from '../../services/admin';
import { DataState, EmptyState, InlineError, Spinner } from '../../components/ui/Feedback';
import { Modal } from '../../components/ui/Modal';
import { FilterTabs, PageHeader } from '../../components/ui/Layout';
import { Badge } from '../../components/ui/Badge';
import { imageOf, rupiah, tanggal } from '../../utils/format';

const TABS = [{ value: '', label: 'Semua produk' }, { value: 'approved', label: 'Lolos moderasi' }, { value: 'blocked', label: 'Diblokir' }];
const primaryImage = (product) =>
  [...(product.images || [])].sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order)[0]?.url;

export default function AdminProducts() {
  const toast = useToast();
  const [moderation, setModeration] = useState('');
  const [term, setTerm] = useState('');
  const [search, setSearch] = useState('');
  const state = useAsync(() => listProductsForAdmin({ moderation, search }), [moderation, search]);
  const [blocking, setBlocking] = useState(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const moderate = async (product, status, moderationNote) => {
    setBusy(true);
    try {
      await moderateProduct(product.id, status, moderationNote);
      toast.success(status === 'blocked' ? 'Produk diblokir.' : 'Blokir produk dibuka.');
      setBlocking(null);
      state.reload();
    } catch (e) {
      if (status === 'blocked') setError(e.message); else toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const submitBlock = () => {
    if (note.trim().length < 5) return setError('Tulis catatan minimal 5 karakter untuk penjual.');
    return moderate(blocking, 'blocked', note.trim());
  };

  return (
    <>
      <PageHeader
        eyebrow="Kurasi Katalog"
        title="Produk & moderasi"
        description="Daftar seluruh karya dari semua toko pengrajin. Produk yang diblokir tidak akan tampil di katalog publik."
      />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <form className="flex w-full max-w-md gap-2" onSubmit={(event) => { event.preventDefault(); setSearch(term.trim()); }}>
          <label htmlFor="admin-product-search" className="sr-only">Cari produk</label>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-400" strokeWidth={1.5} />
            <input id="admin-product-search" type="search" className="input pl-10" placeholder="Cari nama produk..." value={term} onChange={(e) => setTerm(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-outline">Cari</button>
        </form>
      </div>
      <FilterTabs options={TABS} value={moderation} onChange={setModeration} />
      <DataState state={state}>
        {(products) => products.length === 0 ? (
          <EmptyState icon={Package} title="Tidak ada produk" description="Tidak ada produk yang cocok dengan filter ini." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Produk</th><th>Toko pengrajin</th><th>Kategori</th><th>Harga</th><th>Stok</th><th>Ditambahkan</th><th>Status</th><th /></tr></thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <div className="flex items-center gap-3.5">
                        <div className="h-14 w-12 shrink-0 overflow-hidden border border-cream-300 bg-cream-200">
                          <img src={imageOf(primaryImage(product))} alt="" className="h-full w-full object-cover" />
                        </div>
                        <div className="min-w-[160px]">
                          <Link to={`/produk/${product.id}`} className="line-clamp-2 font-medium text-charcoal hover:text-earth-500">{product.name}</Link>
                          {product.moderation_note && <p className="mt-0.5 text-xs text-clay-600">Catatan: {product.moderation_note}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="text-charcoal-600">{product.store?.name || '-'}</td>
                    <td className="text-charcoal-500">{product.category?.name || '-'}</td>
                    <td className="font-display font-medium text-earth-500">{rupiah(product.price)}</td>
                    <td>{product.stock}</td>
                    <td className="whitespace-nowrap text-charcoal-500">{tanggal(product.created_at)}</td>
                    <td>
                      {product.moderation_status === 'blocked' ? <Badge tone="red">Diblokir</Badge>
                        : product.status === 'active' ? <Badge tone="green">Tayang</Badge> : <Badge tone="gray">Disembunyikan</Badge>}
                    </td>
                    <td className="text-right">
                      {product.moderation_status === 'blocked'
                        ? <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => moderate(product, 'approved')}>Buka blokir</button>
                        : <button type="button" className="btn btn-danger-outline btn-sm" onClick={() => { setBlocking(product); setNote(''); setError(''); }}>Blokir</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DataState>
      <Modal open={Boolean(blocking)} title={`Blokir produk: ${blocking?.name || ''}`} onClose={() => setBlocking(null)} size="max-w-md"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setBlocking(null)} disabled={busy}>Batal</button>
            <button type="button" className="btn btn-danger" onClick={submitBlock} disabled={busy}>{busy && <Spinner className="h-4 w-4" />}Blokir produk</button>
          </>
        }>
        <div className="space-y-3">
          <InlineError>{error}</InlineError>
          <label htmlFor="mod-note" className="label">Catatan moderasi (dikirim ke penjual)</label>
          <textarea id="mod-note" rows={3} className="input" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </Modal>
    </>
  );
}
