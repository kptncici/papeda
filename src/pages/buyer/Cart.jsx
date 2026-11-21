import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Store, Trash2 } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import { useToast } from '../../contexts/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { getSettings } from '../../services/catalog';
import { groupByStore } from '../../services/cart';
import { EmptyState, ErrorState, PageLoader } from '../../components/ui/Feedback';
import QuantityInput from '../../components/QuantityInput';
import { imageOf, rupiah } from '../../utils/format';

const checkboxClass = 'h-4 w-4 shrink-0 cursor-pointer rounded-none border-cream-400 accent-charcoal';

export default function Cart() {
  const cart = useCart();
  const toast = useToast();
  const settings = useAsync(getSettings, []);
  const [busyId, setBusyId] = useState(null);
  // Yang disimpan adalah barang yang TIDAK dicentang, sehingga barang baru otomatis ikut terpilih.
  const [unchecked, setUnchecked] = useState([]);

  const run = async (itemId, action) => {
    setBusyId(itemId);
    try {
      await action();
    } catch (error) {
      toast.error(error.message);
      cart.reload();
    } finally {
      setBusyId(null);
    }
  };

  if (cart.loading && cart.items.length === 0) return <div className="container-page py-12"><PageLoader label="Memuat tas belanja" /></div>;
  if (cart.error) return <div className="container-page py-12"><ErrorState message={cart.error} onRetry={cart.reload} /></div>;

  if (cart.items.length === 0) {
    return (
      <div className="container-page py-12">
        <div className="mb-8 border-b border-cream-300 pb-6">
          <p className="eyebrow mb-1.5">Tas Belanja</p>
          <h1 className="font-display text-3xl font-normal tracking-tight text-charcoal">Keranjang belanja</h1>
        </div>
        <EmptyState icon={ShoppingBag} title="Keranjang masih kosong" description="Tambahkan karya pilihan dari beberapa pengrajin sekaligus, lalu selesaikan dalam satu transaksi."
          action={<Link to="/produk" className="btn btn-primary">Mulai belanja</Link>} />
      </div>
    );
  }

  const available = cart.items.filter((item) => item.available);
  const unavailable = cart.items.filter((item) => !item.available);
  const groups = groupByStore(cart.items);
  const isChecked = (item) => !unchecked.includes(item.id);
  const setChecked = (items, checked) => {
    const ids = items.map((item) => item.id);
    setUnchecked((current) => (checked ? current.filter((id) => !ids.includes(id)) : [...new Set([...current, ...ids])]));
  };

  const selected = available.filter(isChecked);
  const selectedGroups = groupByStore(selected);
  const subtotal = selectedGroups.reduce((sum, group) => sum + group.subtotal, 0);
  const shipping = Number(settings.data?.shipping_flat_fee || 0) * selectedGroups.length;
  const selectedCount = selected.reduce((sum, item) => sum + item.quantity, 0);
  const overStock = selected.some((item) => item.quantity > item.product.stock);
  const allChecked = available.length > 0 && selected.length === available.length;
  const canCheckout = selected.length > 0 && !overStock;

  return (
    <div className="container-page py-10">
      <div className="mb-8 border-b border-cream-300 pb-6">
        <p className="eyebrow mb-1.5">Tas Belanja</p>
        <h1 className="font-display text-3xl font-normal tracking-tight text-charcoal">Keranjang belanja</h1>
        <p className="mt-1.5 text-sm text-charcoal-600">{cart.count} barang dari {groups.length} toko pengrajin. Pilih barang yang ingin dibayar sekarang; sisanya tetap tersimpan.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {available.length > 0 && (
            <label className="card flex cursor-pointer items-center gap-3 px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-charcoal">
              <input type="checkbox" className={checkboxClass} checked={allChecked} onChange={(event) => setChecked(available, event.target.checked)} />
              Pilih semua ({available.length} produk)
            </label>
          )}

          {groups.map((group) => {
            const groupChecked = group.items.every(isChecked);
            return (
              <section key={group.store.id} className="card">
                <header className="flex items-center gap-3 border-b border-cream-200 bg-cream-50/60 px-5 py-3.5">
                  <input type="checkbox" className={checkboxClass} checked={groupChecked} aria-label={`Pilih semua barang dari ${group.store.name}`}
                    onChange={(event) => setChecked(group.items, event.target.checked)} />
                  <Link to={`/toko/${group.store.id}`} className="flex min-w-0 flex-1 items-center gap-2 text-xs font-medium uppercase tracking-wider text-charcoal hover:text-earth-500">
                    <Store className="h-3.5 w-3.5 shrink-0 text-earth-500" strokeWidth={1.5} /><span className="truncate">{group.store.name}</span>
                  </Link>
                  <span className="shrink-0 text-xs text-charcoal-500">Subtotal {rupiah(group.subtotal)}</span>
                </header>
                <ul className="divide-y divide-cream-200">
                  {group.items.map((item) => (
                    <li key={item.id} className={`flex items-center gap-4 p-5 transition-colors ${isChecked(item) ? '' : 'bg-cream-50/50 opacity-75'}`}>
                      <input type="checkbox" className={checkboxClass} checked={isChecked(item)} aria-label={`Pilih ${item.product.name}`}
                        onChange={(event) => setChecked([item], event.target.checked)} />
                      <Link to={`/produk/${item.productId}`} className="h-24 w-20 shrink-0 overflow-hidden border border-cream-300 bg-cream-200">
                        <img src={imageOf(item.image)} alt={item.product.name} className="h-full w-full object-cover transition-transform duration-500 hover:scale-105" />
                      </Link>
                      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <Link to={`/produk/${item.productId}`} className="line-clamp-2 text-sm font-medium text-charcoal hover:text-earth-500">{item.product.name}</Link>
                          <p className="mt-1 text-xs text-charcoal-500">{rupiah(item.product.price)}</p>
                          {item.quantity > item.product.stock && <p className="mt-1 text-xs font-medium text-clay-600">Stok tersisa {item.product.stock}. Kurangi jumlahnya.</p>}
                        </div>
                        <div className="flex items-center gap-4">
                          <QuantityInput value={item.quantity} max={Math.max(item.product.stock, 1)} disabled={busyId === item.id}
                            onChange={(quantity) => run(item.id, () => cart.setQuantity(item.id, quantity))} />
                          <p className="w-24 text-right font-display text-sm font-medium text-charcoal">{rupiah(Number(item.product.price) * item.quantity)}</p>
                          <button type="button" aria-label={`Hapus ${item.product.name}`} disabled={busyId === item.id}
                            onClick={() => run(item.id, async () => { await cart.remove(item.id); toast.success('Produk dihapus dari keranjang.'); })}
                            className="p-2 text-charcoal-400 transition-colors hover:bg-clay-50 hover:text-clay-600">
                            <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}

          {unavailable.length > 0 && (
            <section className="card border-earth-200 bg-earth-50/50">
              <header className="border-b border-earth-200 px-5 py-3 text-xs font-medium uppercase tracking-wider text-earth-700">Tidak lagi tersedia dan tidak ikut di-checkout</header>
              <ul className="divide-y divide-earth-100">
                {unavailable.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 px-5 py-3.5 text-sm">
                    <span className="text-charcoal-600">{item.product?.name || 'Produk sudah tidak dijual'}</span>
                    <button type="button" className="btn btn-danger-outline btn-sm" disabled={busyId === item.id} onClick={() => run(item.id, () => cart.remove(item.id))}>Hapus</button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="card h-fit p-6 lg:sticky lg:top-24">
          <p className="eyebrow mb-1">Total</p>
          <h2 className="font-display text-xl font-normal text-charcoal">Ringkasan belanja</h2>
          <p className="mt-1 text-xs text-charcoal-500">{selected.length ? `${selectedCount} barang dipilih dari ${selectedGroups.length} toko` : 'Belum ada barang yang dicentang'}</p>
          <dl className="mt-5 space-y-2.5 text-xs">
            <div className="flex justify-between"><dt className="text-charcoal-500">Subtotal produk</dt><dd className="font-medium text-charcoal">{rupiah(subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-charcoal-500">Ongkos kirim ({selectedGroups.length} toko)</dt><dd className="font-medium text-charcoal">{rupiah(shipping)}</dd></div>
            <div className="flex items-baseline justify-between border-t border-cream-300 pt-3.5 text-sm font-medium">
              <dt className="uppercase tracking-wider text-charcoal">Total estimasi</dt>
              <dd className="font-display text-xl text-earth-500">{rupiah(subtotal + shipping)}</dd>
            </div>
          </dl>
          {canCheckout
            ? <Link to={`/checkout?item=${selected.map((item) => item.id).join(',')}`} className="btn btn-primary mt-6 w-full py-3">Lanjut ke Checkout ({selectedCount})</Link>
            : <button type="button" className="btn btn-primary mt-6 w-full py-3" disabled>Lanjut ke Checkout</button>}
          {overStock && <p className="mt-2 text-xs font-medium text-clay-600">Ada barang terpilih yang jumlahnya melebihi stok.</p>}
          <p className="mt-4 border-t border-cream-200 pt-3 text-[11px] leading-relaxed text-charcoal-400">
            Ongkos kirim memakai tarif tetap per toko. Harga dan ketersediaan stok diperiksa ulang oleh server saat checkout.
          </p>
        </aside>
      </div>
    </div>
  );
}
