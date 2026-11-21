import { rupiah } from '../utils/format';

/** Grafik batang sederhana tanpa pustaka tambahan. data: [{ date, orders, sales }] */
export default function BarChart({ data = [], valueKey = 'sales', height = 180 }) {
  const max = Math.max(...data.map((d) => Number(d[valueKey]) || 0), 0);
  if (!data.length || max === 0) {
    return <p className="py-10 text-center text-sm text-charcoal-400">Belum ada transaksi pada rentang ini.</p>;
  }
  const step = Math.ceil(data.length / 8);
  return (
    <div>
      <div className="flex items-end gap-1 sm:gap-1.5" style={{ height }} role="img" aria-label="Grafik penjualan harian">
        {data.map((d) => {
          const value = Number(d[valueKey]) || 0;
          const label = new Date(d.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
          return (
            <div key={d.date} className="group relative flex h-full flex-1 items-end">
              <div className="w-full rounded-t bg-charcoal group-hover:bg-earth-500" style={{ height: `${Math.max((value / max) * 100, value > 0 ? 3 : 0)}%` }} />
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-charcoal px-2 py-1 text-xs text-white group-hover:block">
                {label}: {rupiah(value)} ({d.orders} pesanan)
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-1 border-t border-cream-300 pt-1.5 text-[10px] text-charcoal-400 sm:gap-1.5">
        {data.map((d, index) => (
          <span key={d.date} className="flex-1 truncate text-center">
            {index % step === 0 ? new Date(d.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : ''}
          </span>
        ))}
      </div>
    </div>
  );
}
