import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, FileQuestion, Truck } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { getOrder, listOrderHistory, updateStoreOrderStatus } from '../../services/orders';
import { useToast } from '../../contexts/ToastContext';
import { DataState, EmptyState } from '../../components/ui/Feedback';
import { ConfirmDialog } from '../../components/ui/Modal';
import { StatusBadge } from '../../components/ui/Badge';
import OrderTimeline from '../../components/OrderTimeline';
import { ORDER_STATUS, PAYMENT_METHOD, PAYMENT_STATUS, imageOf, rupiah, tanggal } from '../../utils/format';

const STEPS = ['paid', 'processing', 'shipped', 'completed'];

function Progress({ status }) {
  if (status === 'pending_payment' || status === 'cancelled') return null;
  const current = STEPS.indexOf(status);
  return (
    <ol className="mt-4 grid grid-cols-4 gap-2 text-left text-[11px]">
      {STEPS.map((step, index) => (
        <li key={step}>
          <span className={`block h-1 ${index <= current ? 'bg-charcoal' : 'bg-cream-300'}`} />
          <span className={`mt-1.5 block uppercase tracking-wider ${index <= current ? 'font-medium text-charcoal' : 'text-charcoal-400'}`}>
            0{index + 1}. {ORDER_STATUS[step].label}
          </span>
        </li>
      ))}
    </ol>
  );
}

export default function BuyerOrderDetail() {
  const { id } = useParams();
  const toast = useToast();
  const state = useAsync(async () => {
    const order = await getOrder(id);
    return { order, history: order ? await listOrderHistory(id) : [] };
  }, [id]);
  const [confirming, setConfirming] = useState(null);
  const [busy, setBusy] = useState(false);

  const confirmReceived = async () => {
    setBusy(true);
    try {
      await updateStoreOrderStatus(confirming.id, 'completed');
      toast.success('Pesanan selesai. Terima kasih sudah berbelanja.');
      setConfirming(null);
      state.reload();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Link to="/akun/pesanan" className="mb-6 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-eyebrow text-charcoal-600 transition-colors hover:text-charcoal">
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />Kembali ke pesanan
      </Link>
      <DataState state={state}>
        {({ order, history }) => !order ? (
          <EmptyState icon={FileQuestion} title="Pesanan tidak ditemukan" description="Pesanan ini tidak ada atau bukan milik akun Anda." />
        ) : (
          <>
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-cream-300 pb-6">
              <div>
                <p className="eyebrow mb-1.5">Rincian Transaksi</p>
                <h1 className="font-display text-2xl font-normal tracking-tight text-charcoal sm:text-3xl">{order.order_number}</h1>
                <p className="mt-1 text-xs text-charcoal-500">Dibuat pada {tanggal(order.created_at, true)}</p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge map={ORDER_STATUS} value={order.status} />
                {order.status === 'pending_payment' && <Link to={`/pembayaran/${order.id}`} className="btn btn-primary btn-sm">Bayar sekarang</Link>}
              </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
              <div className="space-y-6">
                {order.store_orders.map((so) => (
                  <section key={so.id} className="card">
                    <header className="border-b border-cream-200 bg-cream-50/60 p-5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-[10px] uppercase tracking-eyebrow text-earth-500">Pengiriman Toko</p>
                          <Link to={`/toko/${so.store_id}`} className="mt-0.5 block font-display text-lg font-medium text-charcoal hover:text-earth-500">{so.store_name}</Link>
                          <p className="text-xs text-charcoal-500">No. Paket: {so.store_order_number}</p>
                        </div>
                        <StatusBadge map={ORDER_STATUS} value={so.status} />
                      </div>
                      <Progress status={so.status} />
                      {so.tracking_number && (
                        <div className="mt-4 flex items-center gap-2 border border-cream-300 bg-white px-3.5 py-2.5 text-xs">
                          <Truck className="h-4 w-4 text-earth-500" strokeWidth={1.5} />
                          <span className="text-charcoal-600">Nomor resi pengiriman:</span>
                          <strong className="font-medium uppercase tracking-wider text-charcoal">{so.tracking_number}</strong>
                        </div>
                      )}
                    </header>
                    <ul className="divide-y divide-cream-200">
                      {so.items.map((item) => (
                        <li key={item.id} className="flex items-center gap-4 p-5">
                          <div className="h-20 w-16 shrink-0 overflow-hidden border border-cream-300 bg-cream-200">
                            <img src={imageOf(item.product_image)} alt="" className="h-full w-full object-cover" />
                          </div>
                          <div className="min-w-0 flex-1 text-sm">
                            {item.product_id
                              ? <Link to={`/produk/${item.product_id}`} className="line-clamp-2 font-medium text-charcoal hover:text-earth-500">{item.product_name}</Link>
                              : <p className="line-clamp-2 font-medium text-charcoal">{item.product_name}</p>}
                            <p className="mt-1 text-xs text-charcoal-500">{item.quantity} × {rupiah(item.unit_price)}</p>
                          </div>
                          <p className="font-display text-sm font-medium text-charcoal">{rupiah(item.subtotal)}</p>
                        </li>
                      ))}
                    </ul>
                    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-cream-200 bg-cream-50/60 px-5 py-4 text-xs">
                      <span className="text-charcoal-600">
                        Subtotal {rupiah(so.items_subtotal)} + Ongkir {rupiah(so.shipping_fee)} = <strong className="font-display text-sm font-medium text-earth-500">{rupiah(so.total)}</strong>
                      </span>
                      {so.status === 'shipped' && <button type="button" className="btn btn-primary btn-sm" onClick={() => setConfirming(so)}>Konfirmasi diterima</button>}
                      {so.status === 'completed' && <Link to="/akun/ulasan" className="btn btn-outline btn-sm">Beri ulasan</Link>}
                    </footer>
                  </section>
                ))}
              </div>

              <aside className="space-y-6">
                <section className="card p-5 text-sm">
                  <p className="eyebrow mb-1">Ringkasan</p>
                  <h2 className="font-display text-lg font-normal text-charcoal">Informasi pembayaran</h2>
                  <dl className="mt-4 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between gap-3"><dt className="text-charcoal-500">Status</dt><dd><StatusBadge map={PAYMENT_STATUS} value={order.payment_status} /></dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-charcoal-500">Metode</dt><dd className="font-medium text-charcoal">{PAYMENT_METHOD[order.payment_method]?.label}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-charcoal-500">No. transaksi</dt><dd className="font-medium text-charcoal">{order.payment?.transaction_number}</dd></div>
                    {order.payment?.paid_at && <div className="flex justify-between gap-3"><dt className="text-charcoal-500">Waktu bayar</dt><dd className="text-charcoal">{tanggal(order.payment.paid_at, true)}</dd></div>}
                    {order.payment?.failure_reason && <div className="border-t border-cream-200 pt-2"><dt className="text-charcoal-500">Keterangan</dt><dd className="mt-0.5 text-clay-600">{order.payment.failure_reason}</dd></div>}
                    <div className="flex justify-between gap-3 border-t border-cream-300 pt-3"><dt className="text-charcoal-500">Subtotal produk</dt><dd className="text-charcoal">{rupiah(order.items_subtotal)}</dd></div>
                    <div className="flex justify-between gap-3"><dt className="text-charcoal-500">Ongkos kirim</dt><dd className="text-charcoal">{rupiah(order.shipping_total)}</dd></div>
                    <div className="flex items-baseline justify-between gap-3 border-t border-cream-300 pt-3 text-sm font-medium"><dt className="uppercase tracking-wider text-charcoal">Total</dt><dd className="font-display text-lg text-earth-500">{rupiah(order.grand_total)}</dd></div>
                  </dl>
                </section>
                <section className="card p-5 text-sm">
                  <p className="eyebrow mb-1">Tujuan</p>
                  <h2 className="font-display text-lg font-normal text-charcoal">Alamat pengiriman</h2>
                  <div className="mt-4 space-y-1 text-xs leading-relaxed">
                    <p className="font-medium uppercase tracking-wider text-charcoal">{order.store_orders[0]?.shipping_name}</p>
                    <p className="text-charcoal-500">{order.store_orders[0]?.shipping_phone}</p>
                    <p className="text-charcoal-600">{order.store_orders[0]?.shipping_address}</p>
                    {order.notes && <p className="mt-3 border-t border-cream-200 pt-2 text-charcoal-500">Catatan: {order.notes}</p>}
                  </div>
                </section>
                <section className="card p-5">
                  <p className="eyebrow mb-1">Jejak</p>
                  <h2 className="mb-4 font-display text-lg font-normal text-charcoal">Riwayat status</h2>
                  <OrderTimeline history={history.filter((entry) => entry.scope !== 'store_order')} />
                </section>
              </aside>
            </div>

            <ConfirmDialog open={Boolean(confirming)} title="Konfirmasi pesanan diterima" confirmLabel="Ya, sudah diterima" loading={busy}
              message={`Pastikan barang dari ${confirming?.store_name || 'toko'} sudah Anda terima dengan baik. Setelah dikonfirmasi, pesanan dinyatakan selesai.`}
              onConfirm={confirmReceived} onClose={() => setConfirming(null)} />
          </>
        )}
      </DataState>
    </>
  );
}
