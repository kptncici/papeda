import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { MapPin, Plus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { useToast } from '../../contexts/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { getSettings } from '../../services/catalog';
import { groupByStore } from '../../services/cart';
import { listAddresses, createAddress } from '../../services/addresses';
import { checkout } from '../../services/orders';
import { DataState, InlineError, PageLoader, Spinner } from '../../components/ui/Feedback';
import { Modal } from '../../components/ui/Modal';
import AddressForm from '../../components/AddressForm';
import { PAYMENT_METHOD, imageOf, rupiah } from '../../utils/format';

export default function Checkout() {
  const { profile } = useAuth();
  const cart = useCart();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  // Barang yang dicentang di keranjang dikirim lewat ?item=id1,id2. Tanpa parameter berarti seluruh keranjang.
  const selectedIds = (params.get('item') || '').split(',').filter(Boolean);
  const state = useAsync(async () => {
    const [addresses, settings] = await Promise.all([listAddresses(), getSettings()]);
    return { addresses, settings };
  }, []);
  const [addressId, setAddressId] = useState('');
  const [method, setMethod] = useState('bank_transfer');
  const [notes, setNotes] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [placed, setPlaced] = useState(false);

  useEffect(() => {
    const list = state.data?.addresses || [];
    if (!addressId && list.length) setAddressId((list.find((a) => a.is_default) || list[0]).id);
  }, [state.data, addressId]);

  if (cart.loading && cart.items.length === 0) return <div className="container-page py-12"><PageLoader label="Memuat keranjang" /></div>;
  const chosen = (selectedIds.length ? cart.items.filter((item) => selectedIds.includes(item.id)) : cart.items).filter((item) => item.available);
  if (!placed && !cart.loading && chosen.length === 0) return <Navigate to="/keranjang" replace />;

  const groups = groupByStore(chosen);
  const subtotal = groups.reduce((sum, group) => sum + group.subtotal, 0);

  const placeOrder = async (event) => {
    event.preventDefault();
    if (!addressId) {
      setError('Pilih atau tambahkan alamat pengiriman.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const orderId = await checkout(addressId, method, notes.trim(), selectedIds.length ? chosen.map((item) => item.id) : null);
      setPlaced(true);
      await cart.reload();
      toast.success('Pesanan dibuat. Lanjutkan ke pembayaran.');
      navigate(`/pembayaran/${orderId}`, { replace: true });
    } catch (e) {
      setError(e.message);
      cart.reload();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container-page py-10">
      <div className="mb-8 border-b border-cream-300 pb-6">
        <p className="eyebrow mb-1.5">Penyelesaian Pesanan</p>
        <h1 className="font-display text-3xl font-normal tracking-tight text-charcoal">Checkout</h1>
      </div>
      <DataState state={state}>
        {({ addresses, settings }) => {
          const shipping = Number(settings?.shipping_flat_fee || 0) * groups.length;
          return (
            <>
              <form onSubmit={placeOrder} className="grid gap-8 lg:grid-cols-[1fr_360px]">
                <div className="space-y-6">
                  <section className="card p-6">
                    <div className="flex items-center justify-between gap-3 border-b border-cream-200 pb-4">
                      <div>
                        <p className="eyebrow">Langkah 01</p>
                        <h2 className="mt-1 font-display text-lg font-normal text-charcoal">Alamat pengiriman</h2>
                      </div>
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowForm(true)}>
                        <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />Tambah alamat
                      </button>
                    </div>
                    {addresses.length === 0 ? (
                      <p className="mt-4 flex items-center gap-2 border border-cream-300 bg-cream-50 px-4 py-3.5 text-xs text-charcoal-600">
                        <MapPin className="h-4 w-4 shrink-0 text-earth-500" strokeWidth={1.5} />Belum ada alamat tersimpan. Tambahkan alamat pengiriman untuk melanjutkan.
                      </p>
                    ) : (
                      <div className="mt-4 space-y-2.5">
                        {addresses.map((address) => (
                          <label key={address.id} className={`flex cursor-pointer gap-3.5 border p-4 transition-colors ${addressId === address.id ? 'border-charcoal bg-cream-50/70' : 'border-cream-300 hover:border-charcoal-300'}`}>
                            <input type="radio" name="address" className="mt-1 accent-charcoal" checked={addressId === address.id} onChange={() => setAddressId(address.id)} />
                            <span className="text-xs leading-relaxed">
                              <span className="font-medium uppercase tracking-wider text-charcoal">{address.recipient_name}</span>{' '}
                              <span className="text-charcoal-500">({address.label}) • {address.phone}</span>
                              <span className="mt-1 block text-charcoal-600">{address.address_line}, {address.city}, {address.province} {address.postal_code || ''}</span>
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </section>

                  <section className="card p-6">
                    <div className="border-b border-cream-200 pb-4">
                      <p className="eyebrow">Langkah 02</p>
                      <h2 className="mt-1 font-display text-lg font-normal text-charcoal">Metode pembayaran</h2>
                      <p className="mt-1 text-xs text-charcoal-500">Semua metode di bawah ini adalah simulasi prototipe. Tidak ada dana nyata yang berpindah.</p>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      {Object.entries(PAYMENT_METHOD).map(([value, info]) => (
                        <label key={value} className={`flex cursor-pointer gap-3 border p-4 transition-colors ${method === value ? 'border-charcoal bg-cream-50/70' : 'border-cream-300 hover:border-charcoal-300'}`}>
                          <input type="radio" name="method" className="mt-0.5 accent-charcoal" checked={method === value} onChange={() => setMethod(value)} />
                          <span>
                            <span className="block text-xs font-medium uppercase tracking-wider text-charcoal">{info.label}</span>
                            <span className="mt-1 block text-[11px] leading-relaxed text-charcoal-500">{info.hint}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </section>

                  <section className="card p-6">
                    <div className="border-b border-cream-200 pb-4">
                      <p className="eyebrow">Langkah 03</p>
                      <h2 className="mt-1 font-display text-lg font-normal text-charcoal">Rincian karya</h2>
                      <p className="mt-1 text-xs text-charcoal-500">Pesanan dipisah otomatis per toko pengrajin. Setiap toko mengirimkan paketnya masing-masing.</p>
                    </div>
                    <div className="mt-4 space-y-4">
                      {groups.map((group) => (
                        <div key={group.store.id} className="border border-cream-300">
                          <p className="border-b border-cream-200 bg-cream-50/60 px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-charcoal">{group.store.name}</p>
                          <ul className="divide-y divide-cream-200">
                            {group.items.map((item) => (
                              <li key={item.id} className="flex items-center gap-3.5 px-4 py-3 text-sm">
                                <div className="h-14 w-12 shrink-0 overflow-hidden border border-cream-300 bg-cream-200">
                                  <img src={imageOf(item.image)} alt="" className="h-full w-full object-cover" />
                                </div>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate font-medium text-charcoal">{item.product.name}</span>
                                  <span className="text-xs text-charcoal-500">{item.quantity} × {rupiah(item.product.price)}</span>
                                </span>
                                <span className="font-display text-sm font-medium text-charcoal">{rupiah(Number(item.product.price) * item.quantity)}</span>
                              </li>
                            ))}
                          </ul>
                          <p className="flex justify-between border-t border-cream-200 bg-cream-50/40 px-4 py-2.5 text-xs text-charcoal-500">
                            <span>Ongkos kirim toko ini</span>
                            <span className="font-medium text-charcoal">{rupiah(settings?.shipping_flat_fee)}</span>
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-5">
                      <label htmlFor="notes" className="label">Catatan untuk penjual (opsional)</label>
                      <textarea id="notes" rows={2} maxLength={500} className="input" placeholder="Tulis instruksi khusus bila ada" value={notes} onChange={(event) => setNotes(event.target.value)} />
                    </div>
                  </section>
                </div>

                <aside className="card h-fit p-6 lg:sticky lg:top-24">
                  <p className="eyebrow mb-1">Tagihan</p>
                  <h2 className="font-display text-xl font-normal text-charcoal">Ringkasan pembayaran</h2>
                  <dl className="mt-5 space-y-2.5 text-xs">
                    <div className="flex justify-between"><dt className="text-charcoal-500">Subtotal produk</dt><dd className="font-medium text-charcoal">{rupiah(subtotal)}</dd></div>
                    <div className="flex justify-between"><dt className="text-charcoal-500">Ongkos kirim ({groups.length} toko)</dt><dd className="font-medium text-charcoal">{rupiah(shipping)}</dd></div>
                    <div className="flex items-baseline justify-between border-t border-cream-300 pt-3.5 text-sm font-medium">
                      <dt className="uppercase tracking-wider text-charcoal">Total pembayaran</dt>
                      <dd className="font-display text-xl text-earth-500">{rupiah(subtotal + shipping)}</dd>
                    </div>
                  </dl>
                  <div className="mt-4"><InlineError>{error}</InlineError></div>
                  <button type="submit" className="btn btn-primary mt-5 w-full py-3" disabled={busy || addresses.length === 0}>
                    {busy && <Spinner className="h-4 w-4" />}Buat pesanan
                  </button>
                  <Link to="/keranjang" className="btn btn-ghost mt-2 w-full">Kembali ke keranjang</Link>
                </aside>
              </form>

              <Modal open={showForm} title="Tambah alamat pengiriman" onClose={() => setShowForm(false)}>
                <AddressForm initial={{ recipient_name: profile.full_name, phone: profile.phone || '', is_default: addresses.length === 0 }}
                  onCancel={() => setShowForm(false)}
                  onSubmit={async (values) => {
                    const created = await createAddress(profile.id, values);
                    setAddressId(created.id);
                    setShowForm(false);
                    toast.success('Alamat disimpan.');
                    state.reload();
                  }} />
              </Modal>
            </>
          );
        }}
      </DataState>
    </div>
  );
}
