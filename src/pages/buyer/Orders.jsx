import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { listMyOrders } from '../../services/orders';
import { DataState, EmptyState } from '../../components/ui/Feedback';
import { FilterTabs, PageHeader } from '../../components/ui/Layout';
import { StatusBadge } from '../../components/ui/Badge';
import { ORDER_STATUS, PAYMENT_METHOD, imageOf, rupiah, tanggal } from '../../utils/format';

const TABS = [{ value: '', label: 'Semua' }, ...Object.entries(ORDER_STATUS).filter(([key]) => key !== 'shipped').map(([value, info]) => ({ value, label: info.label }))];

export default function BuyerOrders() {
  const { profile } = useAuth();
  const [status, setStatus] = useState('');
  const state = useAsync(() => listMyOrders(profile.id), [profile.id]);

  return (
    <>
      <PageHeader
        eyebrow="Akun Pembeli"
        title="Pesanan saya"
        description="Riwayat transaksi, rincian toko pengrajin, dan status pengiriman setiap pesanan."
      />
      <FilterTabs options={TABS} value={status} onChange={setStatus} />
      <DataState state={state}>
        {(orders) => {
          const list = status ? orders.filter((order) => order.status === status) : orders;
          if (list.length === 0) {
            return <EmptyState icon={ClipboardList} title="Tidak ada pesanan" description={status ? 'Tidak ada pesanan dengan status ini.' : 'Anda belum pernah berbelanja.'}
              action={<Link to="/produk" className="btn btn-primary">Mulai belanja</Link>} />;
          }
          return (
            <ul className="space-y-4">
              {list.map((order) => {
                const items = order.store_orders.flatMap((so) => so.items);
                const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
                return (
                  <li key={order.id} className="card transition-colors hover:border-charcoal-300">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cream-200 bg-cream-50/60 px-5 py-3.5">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        <p className="text-xs font-medium uppercase tracking-wider text-charcoal">{order.order_number}</p>
                        <span className="text-cream-400">|</span>
                        <p className="text-xs text-charcoal-500">{tanggal(order.created_at, true)}</p>
                        <span className="text-cream-400">|</span>
                        <p className="text-xs text-charcoal-500">{PAYMENT_METHOD[order.payment_method]?.label}</p>
                      </div>
                      <StatusBadge map={ORDER_STATUS} value={order.status} />
                    </div>
                    <div className="flex flex-wrap items-center gap-5 p-5">
                      <div className="flex gap-2">
                        {items.slice(0, 4).map((item) => (
                          <div key={item.id} className="h-16 w-14 shrink-0 overflow-hidden border border-cream-300 bg-cream-200">
                            <img src={imageOf(item.product_image)} alt="" className="h-full w-full object-cover" />
                          </div>
                        ))}
                        {items.length > 4 && (
                          <div className="flex h-16 w-14 shrink-0 items-center justify-center border border-cream-300 bg-cream-100 text-xs font-medium text-charcoal-500">
                            +{items.length - 4}
                          </div>
                        )}
                      </div>
                      <div className="min-w-[200px] flex-1">
                        <p className="text-xs uppercase tracking-eyebrow text-earth-500">
                          {order.store_orders.length} Toko Pengrajin • {totalQty} Barang
                        </p>
                        <p className="mt-1 line-clamp-1 text-sm font-medium text-charcoal">
                          {items.map((i) => i.product_name).join(', ')}
                        </p>
                        <p className="mt-0.5 text-xs text-charcoal-500">
                          Toko: {order.store_orders.map((so) => so.store_name).join(', ')}
                        </p>
                      </div>
                      <div className="flex flex-col items-end justify-between gap-3 sm:text-right">
                        <div>
                          <p className="text-[10px] uppercase tracking-eyebrow text-charcoal-400">Total Tagihan</p>
                          <p className="font-display text-lg font-medium text-earth-500">{rupiah(order.grand_total)}</p>
                        </div>
                        <div className="flex gap-2">
                          {order.status === 'pending_payment' && <Link to={`/pembayaran/${order.id}`} className="btn btn-primary btn-sm">Bayar sekarang</Link>}
                          <Link to={`/akun/pesanan/${order.id}`} className="btn btn-outline btn-sm">Rincian</Link>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          );
        }}
      </DataState>
    </>
  );
}
