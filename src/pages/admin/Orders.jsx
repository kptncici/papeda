import { useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { listAllStoreOrders } from '../../services/admin';
import { updateStoreOrderStatus } from '../../services/orders';
import { DataState, EmptyState, InlineError, Spinner } from '../../components/ui/Feedback';
import { Modal } from '../../components/ui/Modal';
import { FilterTabs, PageHeader } from '../../components/ui/Layout';
import { StatusBadge } from '../../components/ui/Badge';
import { ORDER_STATUS, rupiah, tanggal } from '../../utils/format';

const TABS = [{ value: '', label: 'Semua' }, ...Object.entries(ORDER_STATUS).map(([value, info]) => ({ value, label: info.label }))];
// Transisi yang boleh dilakukan admin; aturan yang sama ditegakkan oleh fungsi update_store_order_status.
const NEXT = {
  paid: [{ status: 'processing', label: 'Proses' }, { status: 'cancelled', label: 'Batalkan', danger: true }],
  processing: [{ status: 'shipped', label: 'Kirim' }, { status: 'cancelled', label: 'Batalkan', danger: true }],
  shipped: [{ status: 'completed', label: 'Selesai' }],
};

export default function AdminOrders() {
  const toast = useToast();
  const [status, setStatus] = useState('');
  const state = useAsync(() => listAllStoreOrders(status), [status]);
  const [action, setAction] = useState(null); // { order, next }
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const { order, next } = action;
    if (next.status === 'cancelled' && text.trim().length < 5) return setError('Tulis alasan pembatalan minimal 5 karakter.');
    setBusy(true);
    try {
      await updateStoreOrderStatus(order.id, next.status, next.status === 'shipped' ? { tracking: text.trim() || null } : { note: text.trim() || null });
      toast.success('Status pesanan diperbarui.');
      setAction(null);
      state.reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
    return undefined;
  };

  return (
    <>
      <PageHeader
        eyebrow="Fulfillment & Logistik"
        title="Pesanan"
        description="Daftar paket pesanan per toko dari seluruh marketplace. Pembatalan oleh admin otomatis mengembalikan stok dan membatalkan komisi."
      />
      <FilterTabs options={TABS} value={status} onChange={setStatus} />
      <DataState state={state}>
        {(orders) => orders.length === 0 ? (
          <EmptyState icon={ClipboardList} title="Tidak ada pesanan" description="Tidak ada pesanan dengan status ini." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Nomor paket</th><th>Tanggal</th><th>Toko pengrajin</th><th>Penerima</th><th>Rincian karya</th><th>Total</th><th>Komisi</th><th>Status</th><th /></tr></thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className="font-medium text-charcoal">
                      {order.store_order_number}
                      {order.tracking_number && <span className="mt-0.5 block text-[11px] font-normal text-charcoal-500">Resi: {order.tracking_number}</span>}
                    </td>
                    <td className="whitespace-nowrap text-charcoal-500">{tanggal(order.created_at)}</td>
                    <td className="font-medium text-charcoal">{order.store_name}</td>
                    <td className="text-charcoal-600">{order.shipping_name}</td>
                    <td className="max-w-[220px]"><span className="line-clamp-2 text-xs text-charcoal-600">{order.items.map((item) => `${item.quantity} × ${item.product_name}`).join(', ')}</span></td>
                    <td className="font-display font-medium text-earth-500">{rupiah(order.total)}</td>
                    <td className="text-charcoal-600">{rupiah(order.commission_amount)}</td>
                    <td><StatusBadge map={ORDER_STATUS} value={order.status} /></td>
                    <td>
                      <div className="flex justify-end gap-1.5">
                        {(NEXT[order.status] || []).map((next) => (
                          <button key={next.status} type="button" className={`btn btn-sm ${next.danger ? 'btn-danger-outline' : 'btn-outline'}`}
                            onClick={() => { setAction({ order, next }); setText(''); setError(''); }}>{next.label}</button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DataState>
      <Modal open={Boolean(action)} title={action ? `${action.next.label}: ${action.order.store_order_number}` : ''} onClose={() => setAction(null)} size="max-w-md"
        footer={action && (
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setAction(null)} disabled={busy}>Tutup</button>
            <button type="button" className={`btn ${action.next.danger ? 'btn-danger' : 'btn-primary'}`} onClick={submit} disabled={busy}>{busy && <Spinner className="h-4 w-4" />}{action.next.label}</button>
          </>
        )}>
        {action && (
          <div className="space-y-3">
            <InlineError>{error}</InlineError>
            <p className="text-sm leading-relaxed text-charcoal-600">
              Status berubah dari <strong>{ORDER_STATUS[action.order.status].label}</strong> menjadi <strong>{ORDER_STATUS[action.next.status].label}</strong>. Pembeli dan penjual menerima notifikasi.
            </p>
            <label htmlFor="admin-order-text" className="label">{action.next.status === 'shipped' ? 'Nomor resi (opsional)' : action.next.status === 'cancelled' ? 'Alasan pembatalan' : 'Catatan (opsional)'}</label>
            <input id="admin-order-text" className="input" maxLength={200} value={text} onChange={(e) => setText(e.target.value)} />
          </div>
        )}
      </Modal>
    </>
  );
}
