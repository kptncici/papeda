import { useState } from 'react';
import { Receipt } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { listTransactions } from '../../services/admin';
import { one } from '../../lib/supabase';
import { DataState, EmptyState } from '../../components/ui/Feedback';
import { FilterTabs, PageHeader } from '../../components/ui/Layout';
import { StatusBadge } from '../../components/ui/Badge';
import { ORDER_STATUS, PAYMENT_METHOD, PAYMENT_STATUS, rupiah, tanggal } from '../../utils/format';

const TABS = [{ value: '', label: 'Semua' }, { value: 'pending', label: 'Menunggu pembayaran' }, { value: 'paid', label: 'Lunas' }, { value: 'failed', label: 'Gagal' }];

export default function AdminTransactions() {
  const [status, setStatus] = useState('');
  const state = useAsync(() => listTransactions(status), [status]);
  return (
    <>
      <PageHeader
        eyebrow="Keuangan & Pembayaran"
        title="Transaksi"
        description="Daftar transaksi utama pembeli beserta status pembayarannya. Satu transaksi dapat memuat pesanan ke beberapa toko pengrajin."
      />
      <FilterTabs options={TABS} value={status} onChange={setStatus} />
      <DataState state={state}>
        {(orders) => orders.length === 0 ? (
          <EmptyState icon={Receipt} title="Tidak ada transaksi" description="Tidak ada transaksi dengan status pembayaran ini." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Nomor pesanan</th><th>No. transaksi</th><th>Tanggal</th><th>Pembeli</th><th>Toko</th><th>Metode</th><th>Total</th><th>Komisi</th><th>Pembayaran</th><th>Status</th></tr></thead>
              <tbody>
                {orders.map((order) => {
                  const payment = one(order.payment);
                  return (
                    <tr key={order.id}>
                      <td className="font-medium text-charcoal">{order.order_number}</td>
                      <td className="font-mono text-xs text-charcoal-500">{payment?.transaction_number || '-'}</td>
                      <td className="whitespace-nowrap text-charcoal-500">{tanggal(order.created_at, true)}</td>
                      <td>
                        <span className="block font-medium text-charcoal">{order.buyer?.full_name || '-'}</span>
                        <span className="block text-xs text-charcoal-500">{order.buyer?.email}</span>
                      </td>
                      <td className="max-w-[200px]"><span className="line-clamp-2 text-charcoal-600">{order.store_orders.map((so) => so.store_name).join(', ')}</span></td>
                      <td className="text-charcoal-600">{PAYMENT_METHOD[order.payment_method]?.label}</td>
                      <td className="font-display font-medium text-earth-500">{rupiah(order.grand_total)}</td>
                      <td className="text-charcoal-600">{rupiah(order.commission_total)}</td>
                      <td>
                        <StatusBadge map={PAYMENT_STATUS} value={order.payment_status} />
                        {payment?.paid_at && <span className="mt-1 block text-[11px] text-charcoal-400">{tanggal(payment.paid_at, true)}</span>}
                        {payment?.failure_reason && <span className="mt-1 block max-w-[180px] text-[11px] text-clay-600">{payment.failure_reason}</span>}
                      </td>
                      <td><StatusBadge map={ORDER_STATUS} value={order.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </DataState>
    </>
  );
}
