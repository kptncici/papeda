import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, Pencil, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { listStoreProducts, deleteProduct } from '../../services/seller';
import { DataState, EmptyState } from '../../components/ui/Feedback';
import { ConfirmDialog } from '../../components/ui/Modal';
import { PageHeader } from '../../components/ui/Layout';
import { Badge } from '../../components/ui/Badge';
import { imageOf, rupiah } from '../../utils/format';

const primaryImage = (product) =>
  [...(product.images || [])].sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order)[0]?.url;

export default function SellerProducts() {
  const { store } = useAuth();
  const toast = useToast();
  const state = useAsync(() => listStoreProducts(store.id), [store.id]);
  const [search, setSearch] = useState('');
  const [removing, setRemoving] = useState(null);
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    setBusy(true);
    try {
      await deleteProduct(removing);
      toast.success('Produk dihapus.');
      setRemoving(null);
      state.reload();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Produk" description="Kelola produk, harga, dan stok toko Anda."
        actions={<Link to="/seller/produk/tambah" className="btn btn-primary"><Plus className="h-4 w-4" />Tambah produk</Link>} />
      <DataState state={state}>
        {(products) => {
          if (products.length === 0) {
            return <EmptyState icon={Package} title="Belum ada produk" description="Tambahkan produk pertama Anda lengkap dengan foto, harga, dan stok."
              action={<Link to="/seller/produk/tambah" className="btn btn-primary">Tambah produk</Link>} />;
          }
          const list = products.filter((product) => product.name.toLowerCase().includes(search.trim().toLowerCase()));
          return (
            <>
              <label htmlFor="product-search" className="sr-only">Cari produk</label>
              <input id="product-search" type="search" className="input mb-4 max-w-sm" placeholder="Cari nama produk" value={search} onChange={(e) => setSearch(e.target.value)} />
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Produk</th><th>Kategori</th><th>Harga</th><th>Stok</th><th>Terjual</th><th>Status</th><th /></tr></thead>
                  <tbody>
                    {list.length === 0 && <tr><td colSpan={7} className="py-6 text-center text-charcoal-400">Tidak ada produk dengan nama itu.</td></tr>}
                    {list.map((product) => (
                      <tr key={product.id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <img src={imageOf(primaryImage(product))} alt="" className="h-12 w-12 shrink-0 rounded-lg bg-cream-200 object-cover" />
                            <span className="line-clamp-2 min-w-[140px] font-medium">{product.name}</span>
                          </div>
                        </td>
                        <td>{product.category?.name || '-'}</td>
                        <td className="font-semibold">{rupiah(product.price)}</td>
                        <td className={product.stock <= 3 ? 'font-semibold text-amber-700' : ''}>{product.stock}</td>
                        <td>{product.sold_count}</td>
                        <td>
                          {product.moderation_status === 'blocked'
                            ? <span title={product.moderation_note || ''}><Badge tone="red">Diblokir admin</Badge></span>
                            : product.status === 'active' ? <Badge tone="green">Tayang</Badge> : <Badge tone="gray">Disembunyikan</Badge>}
                        </td>
                        <td>
                          <div className="flex justify-end gap-1">
                            <Link to={`/seller/produk/${product.id}/edit`} aria-label={`Ubah ${product.name}`} className="rounded-full p-2 text-charcoal-600 hover:bg-cream-200"><Pencil className="h-4 w-4" /></Link>
                            <button type="button" aria-label={`Hapus ${product.name}`} onClick={() => setRemoving(product)} className="rounded-full p-2 text-charcoal-600 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          );
        }}
      </DataState>
      <ConfirmDialog open={Boolean(removing)} title="Hapus produk" danger confirmLabel="Hapus produk" loading={busy}
        message={`"${removing?.name}" akan dihapus beserta fotonya. Riwayat pesanan lama tetap tersimpan.`}
        onConfirm={remove} onClose={() => setRemoving(null)} />
    </>
  );
}
