import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, CircleX, FileQuestion, Info } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { getOrder, simulatePayment } from '../../services/orders';
import { useToast } from '../../contexts/ToastContext';
import { DataState, EmptyState, InlineError, Spinner } from '../../components/ui/Feedback';
import { PAYMENT_METHOD, rupiah, tanggal } from '../../utils/format';

export default function Payment() {
  const { orderId } = useParams();
  const toast = useToast();
  const state = useAsync(() => getOrder(orderId), [orderId]);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');

  const simulate = async (success) => {
    setBusy(success ? 'success' : 'fail');
    setError('');
    try {
      const result = await simulatePayment(orderId, success);
      if (result.status === 'paid') toast.success('Pembayaran berhasil (simulasi).');
      else toast.error(result.reason || 'Pembayaran gagal (simulasi).');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
      state.reload();
    }
  };

  return (
    <div className="container-page max-w-3xl py-12">
      <DataState state={state}>
        {(order) => {
          if (!order) {
            return <EmptyState icon={FileQuestion} title="Pesanan tidak ditemukan" description="Periksa kembali tautan pembayaran Anda."
              action={<Link to="/akun/pesanan" className="btn btn-primary">Lihat pesanan saya</Link>} />;
          }
          const payment = order.payment;
          const summary = (
            <div className="card mt-8">
              <dl className="grid gap-x-6 gap-y-4 border-b border-cream-200 bg-cream-50/50 p-6 text-xs sm:grid-cols-2">
                <div><dt className="uppercase tracking-eyebrow text-charcoal-400">Nomor transaksi</dt><dd className="mt-1 font-medium text-charcoal">{payment?.transaction_number}</dd></div>
                <div><dt className="uppercase tracking-eyebrow text-charcoal-400">Nomor pesanan</dt><dd className="mt-1 font-medium text-charcoal">{order.order_number}</dd></div>
                <div><dt className="uppercase tracking-eyebrow text-charcoal-400">Metode pembayaran</dt><dd className="mt-1 font-medium text-charcoal">{PAYMENT_METHOD[order.payment_method]?.label}</dd></div>
                <div><dt className="uppercase tracking-eyebrow text-charcoal-400">Tanggal dibuat</dt><dd className="mt-1 font-medium text-charcoal">{tanggal(order.created_at, true)}</dd></div>
              </dl>
              <div className="p-6">
                <p className="eyebrow mb-1">Rincian</p>
                <h2 className="font-display text-lg font-normal text-charcoal">Ringkasan pembelian</h2>
                <div className="mt-4 space-y-3">
                  {order.store_orders.map((so) => (
                    <div key={so.id} className="border border-cream-300">
                      <p className="border-b border-cream-200 bg-cream-50/60 px-4 py-2 text-xs font-medium uppercase tracking-wider text-charcoal">{so.store_name}</p>
                      <ul className="divide-y divide-cream-200 px-4 py-1 text-xs">
                        {so.items.map((item) => (
                          <li key={item.id} className="flex justify-between gap-3 py-2.5">
                            <span className="min-w-0 truncate text-charcoal">{item.quantity} × {item.product_name}</span>
                            <span className="font-medium text-charcoal">{rupiah(item.subtotal)}</span>
                          </li>
                        ))}
                        <li className="flex justify-between gap-3 py-2.5 text-charcoal-500">
                          <span>Ongkos kirim</span>
                          <span>{rupiah(so.shipping_fee)}</span>
                        </li>
                      </ul>
                    </div>
                  ))}
                </div>
                <p className="mt-6 flex items-baseline justify-between border-t border-cream-300 pt-4">
                  <span className="text-xs font-medium uppercase tracking-eyebrow text-charcoal">Total pembayaran</span>
                  <span className="font-display text-2xl font-normal text-earth-500 sm:text-3xl">{rupiah(order.grand_total)}</span>
                </p>
              </div>
            </div>
          );

          if (order.payment_status === 'paid') {
            return (
              <>
                <div className="text-center">
                  <CheckCircle2 className="mx-auto h-12 w-12 text-forest-600" strokeWidth={1.25} />
                  <p className="eyebrow mt-4">Pembayaran Diterima</p>
                  <h1 className="mt-2 font-display text-3xl font-normal tracking-tight text-charcoal">Pesanan dikonfirmasi</h1>
                  <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-charcoal-600">
                    Pembayaran (simulasi) diterima pada {tanggal(payment?.paid_at, true)}. Setiap toko pengrajin telah menerima pemberitahuan dan segera menyiapkan karya pesanan Anda.
                  </p>
                </div>
                {summary}
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  <Link to={`/akun/pesanan/${order.id}`} className="btn btn-primary">Lacak pesanan</Link>
                  <Link to="/produk" className="btn btn-outline">Eksplorasi lagi</Link>
                </div>
              </>
            );
          }
          if (order.payment_status === 'failed') {
            return (
              <>
                <div className="text-center">
                  <CircleX className="mx-auto h-12 w-12 text-clay-600" strokeWidth={1.25} />
                  <p className="eyebrow mt-4">Transaksi Dibatalkan</p>
                  <h1 className="mt-2 font-display text-3xl font-normal tracking-tight text-charcoal">Pembayaran gagal</h1>
                  <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-charcoal-600">
                    {payment?.failure_reason || 'Pembayaran tidak berhasil.'} Pesanan dibatalkan dan ketersediaan stok dikembalikan.
                  </p>
                </div>
                {summary}
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  <Link to="/produk" className="btn btn-primary">Belanja kembali</Link>
                  <Link to={`/akun/pesanan/${order.id}`} className="btn btn-outline">Lihat rincian pesanan</Link>
                </div>
              </>
            );
          }
          return (
            <>
              <div className="border-b border-cream-300 pb-6">
                <p className="eyebrow mb-1.5">Simulasi Transaksi</p>
                <h1 className="font-display text-3xl font-normal tracking-tight text-charcoal">Selesaikan pembayaran</h1>
              </div>
              <div className="mt-6 flex gap-3 border border-cream-300 bg-cream-50 px-5 py-4 text-xs leading-relaxed text-charcoal-600">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-earth-500" strokeWidth={1.5} />
                <p>Ini adalah halaman simulasi untuk keperluan prototipe. Tidak ada payment gateway eksternal dan tidak ada dana nyata yang ditagih. Pilih skenario pembayaran yang ingin disimulasikan.</p>
              </div>
              {summary}
              <div className="mt-5"><InlineError>{error}</InlineError></div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <button type="button" className="btn btn-primary py-3" disabled={busy !== null} onClick={() => simulate(true)}>
                  {busy === 'success' && <Spinner className="h-4 w-4" />}Simulasikan pembayaran berhasil
                </button>
                <button type="button" className="btn btn-danger-outline py-3" disabled={busy !== null} onClick={() => simulate(false)}>
                  {busy === 'fail' && <Spinner className="h-4 w-4" />}Simulasikan pembayaran gagal
                </button>
              </div>
            </>
          );
        }}
      </DataState>
    </div>
  );
}
