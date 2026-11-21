import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, FileQuestion } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { getStoreOrder } from '../../services/seller';
import { updateStoreOrderStatus } from '../../services/orders';
import { DataState, EmptyState, Spinner } from '../../components/ui/Feedback';
import { StatusBadge } from '../../components/ui/Badge';
import OrderTimeline from '../../components/OrderTimeline';
import { ORDER_STATUS, imageOf, rupiah, tanggal } from '../../utils/format';

const NOTE = {
  pending_payment: 'Pembeli belum membayar. Jangan kirim barang sebelum status berubah menjadi Dibayar.',
  shipped: 'Barang dalam perjalanan. Pesanan selesai setelah pembeli mengonfirmasi penerimaan.',
  completed: 'Pesanan selesai dan pendapatan bersih sudah tercatat.',
  cancelled: 'Pesanan dibatalkan. Stok tidak berkurang atau sudah dikembalikan.',
};

export default function SellerOrderDetail() {
  const { id } = useParams();
  const { store } = useAuth();
  const toast = useToast();
  const state = useAsync(() => getStoreOrder(store.id, id), [store.id, id]);
  const [tracking, setTracking] = useState('');
  const [busy, setBusy] = useState(false);

  const advance = async (status) => {
    if (status === 'shipped' && tracking.trim().length < 3) {
      toast.error('Isi nomor resi atau keterangan pengiriman (minimal 3 karakter).');
      return;
    }
    setBusy(true);
    try {
      await updateStoreOrderStatus(id, status, { tracking: tracking.trim() || null });
      toast.success(status === 'processing' ? 'Pesanan diproses.' : 'Pesanan dikirim.');
      state.reload();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Link to="/seller/pesanan" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-charcoal hover:underline"><ArrowLeft className="h-4 w-4" />Daftar pesanan</Link>
      <DataState state={state}>
        {(order) => !order ? (
          <EmptyState icon={FileQuestion} title="Pesanan tidak ditemukan" description="Pesanan ini tidak ada atau bukan milik toko Anda." />
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-semibold sm:text-3xl">{order.store_order_number}</h1>
                <p className="mt-1 text-sm text-charcoal-600">Dibuat {tanggal(order.created_at, true)}</p>
              </div>
              <StatusBadge map={ORDER_STATUS} value={order.status} />
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
              <div className="space-y-4">
                <section className="card p-4">
                  <h2 className="font-display text-lg font-semibold">Tindakan</h2>
                  {order.status === 'paid' && (
                    <div className="mt-3">
                      <p className="text-sm text-charcoal-600">Pesanan sudah dibayar. Mulai siapkan barangnya.</p>
                      <button type="button" className="btn btn-primary mt-3" disabled={busy} onClick={() => advance('processing')}>{busy && <Spinner className="h-4 w-4" />}Proses pesanan</button>
                    </div>
                  )}
                  {order.status === 'processing' && (
                    <div className="mt-3">
                      <label htmlFor="tracking" className="label">Nomor resi atau keterangan pengiriman</label>
                      <div className="flex flex-wrap gap-2">
                        <input id="tracking" className="input max-w-xs" maxLength={60} value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="mis. JNE 1234567890" />
                        <button type="button" className="btn btn-primary" disabled={busy} onClick={() => advance('shipped')}>{busy && <Spinner className="h-4 w-4" />}Kirim pesanan</button>
                      </div>
                    </div>
                  )}
                  {NOTE[order.status] && <p className="mt-3 text-sm text-charcoal-600">{NOTE[order.status]}</p>}
                  {order.tracking_number && <p className="mt-2 text-sm">Nomor resi: <strong>{order.tracking_number}</strong></p>}
                </section>

                <section className="card">
                  <h2 className="border-b border-cream-200 px-4 py-3 font-display text-lg font-semibold">Barang dipesan</h2>
                  <ul>
                    {order.items.map((item) => (
                      <li key={item.id} className="flex items-center gap-3 border-b border-cream-200 p-4 last:border-0">
                        <img src={imageOf(item.product_image)} alt="" className="h-14 w-14 rounded-lg bg-cream-200 object-cover" />
                        <div className="min-w-0 flex-1 text-sm"><p className="font-medium">{item.product_name}</p><p className="text-charcoal-600">{item.quantity} x {rupiah(item.unit_price)}</p></div>
                        <p className="font-semibold">{rupiah(item.subtotal)}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>

              <aside className="space-y-4">
                <section className="card p-4 text-sm">
                  <h2 className="font-display text-lg font-semibold">Kirim ke</h2>
                  <p className="mt-2 font-semibold">{order.shipping_name}</p>
                  <p className="text-charcoal-600">{order.shipping_phone}</p>
                  <p className="text-charcoal-600">{order.shipping_address}</p>
                </section>
                <section className="card p-4 text-sm">
                  <h2 className="font-display text-lg font-semibold">Rincian pendapatan</h2>
                  <dl className="mt-3 space-y-2">
                    <div className="flex justify-between"><dt className="text-charcoal-600">Subtotal produk</dt><dd>{rupiah(order.items_subtotal)}</dd></div>
                    <div className="flex justify-between"><dt className="text-charcoal-600">Komisi PAPEDA ({Number(order.commission_rate)}%)</dt><dd>- {rupiah(order.commission_amount)}</dd></div>
                    <div className="flex justify-between border-t border-cream-200 pt-2 font-semibold"><dt>Pendapatan bersih</dt><dd className="font-display text-lg text-earth-500">{rupiah(order.seller_net)}</dd></div>
                    <div className="flex justify-between text-charcoal-600"><dt>Ongkos kirim dibayar pembeli</dt><dd>{rupiah(order.shipping_fee)}</dd></div>
                  </dl>
                  <p className="mt-2 text-xs text-charcoal-400">Komisi dihitung dari subtotal produk, tidak termasuk ongkos kirim.</p>
                </section>
                <section className="card p-4">
                  <h2 className="mb-3 font-display text-lg font-semibold">Riwayat status</h2>
                  <OrderTimeline history={order.history} />
                </section>
              </aside>
            </div>
          </>
        )}
      </DataState>
    </>
  );
}
