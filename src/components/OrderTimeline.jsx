import { tanggal, ORDER_STATUS, PAYMENT_STATUS } from '../utils/format';

const labelOf = (entry) => {
  const map = entry.scope === 'payment' ? PAYMENT_STATUS : ORDER_STATUS;
  const prefix = entry.scope === 'payment' ? 'Pembayaran: ' : entry.scope === 'order' ? 'Transaksi: ' : '';
  return prefix + (map[entry.to_status]?.label || entry.to_status);
};

/** Riwayat perubahan status dari tabel order_status_history. */
export default function OrderTimeline({ history = [] }) {
  if (!history.length) return <p className="text-xs text-charcoal-400">Belum ada riwayat.</p>;
  return (
    <ol className="relative space-y-4 border-l border-cream-300 pl-4">
      {history.map((entry, idx) => (
        <li key={entry.id} className="relative text-xs">
          <span className={`absolute -left-[20.5px] top-1 h-2 w-2 border border-white ${idx === 0 ? 'bg-charcoal' : 'bg-cream-400'}`} />
          <p className="font-medium uppercase tracking-wider text-charcoal">{labelOf(entry)}</p>
          <p className="mt-0.5 text-[11px] text-charcoal-500">{tanggal(entry.created_at, true)}{entry.note ? ` • ${entry.note}` : ''}</p>
        </li>
      ))}
    </ol>
  );
}
