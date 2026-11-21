import { Link, useSearchParams } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { listStoreOrders } from '../../services/seller';
import { DataState, EmptyState } from '../../components/ui/Feedback';
import { FilterTabs, PageHeader } from '../../components/ui/Layout';
import { StatusBadge } from '../../components/ui/Badge';
import { ORDER_STATUS, rupiah, tanggal } from '../../utils/format';

const TABS = [
  { value: '', label: 'Semua' },
  { value: 'paid', label: 'Perlu diproses' },
  { value: 'processing', label: 'Diproses' },
  { value: 'shipped', label: 'Dikirim' },
  { value: 'completed', label: 'Selesai' },
  { value: 'pending_payment', label: 'Menunggu pembayaran' },
  { value: 'cancelled', label: 'Dibatalkan' },
];

export default function SellerOrders() {
  const { store } = useAuth();
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || '';
  const state = useAsync(() => listStoreOrders(store.id, status), [store.id, status]);

  return (
    <>
      <PageHeader title="Pesanan" description="Hanya pesanan untuk toko Anda yang tampil di sini." />
      <FilterTabs options={TABS} value={status} onChange={(value) => setParams(value ? { status: value } : {})} />
      <DataState state={state}>
        {(orders) => orders.length === 0 ? (
          <EmptyState icon={ClipboardList} title="Tidak ada pesanan" description={status ? 'Tidak ada pesanan dengan status ini.' : 'Pesanan akan muncul setelah pembeli checkout produk Anda.'} />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Nomor pesanan</th><th>Tanggal</th><th>Pembeli</th><th>Barang</th><th>Subtotal</th><th>Bersih</th><th>Status</th><th /></tr></thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className="font-medium">{order.store_order_number}</td>
                    <td className="whitespace-nowrap">{tanggal(order.created_at)}</td>
                    <td>{order.shipping_name}</td>
                    <td className="max-w-[220px]"><span className="line-clamp-2">{order.items.map((item) => `${item.quantity} x ${item.product_name}`).join(', ')}</span></td>
                    <td>{rupiah(order.items_subtotal)}</td>
                    <td className="font-semibold">{rupiah(order.seller_net)}</td>
                    <td><StatusBadge map={ORDER_STATUS} value={order.status} /></td>
                    <td className="text-right"><Link to={`/seller/pesanan/${order.id}`} className="font-semibold text-charcoal hover:underline">Detail</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DataState>
    </>
  );
}
