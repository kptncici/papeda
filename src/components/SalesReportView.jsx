import { useState } from 'react';
import { BadgeCheck, ClipboardList, Percent, Printer, Wallet } from 'lucide-react';
import { useAsync } from '../hooks/useAsync';
import { DataState } from './ui/Feedback';
import { PageHeader, StatCard } from './ui/Layout';
import BarChart from './BarChart';
import { isoDate, rupiah, tanggal } from '../utils/format';

const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return isoDate(d); };

/**
 * Tampilan laporan penjualan untuk admin (semua toko) dan penjual (tokonya sendiri).
 * Datanya berasal dari fungsi SQL sales_report, yang menentukan cakupan berdasarkan role pemanggil.
 */
export default function SalesReportView({ title, description, fetchReport, showStores }) {
  const [range, setRange] = useState({ from: daysAgo(29), to: isoDate(new Date()) });
  const [draft, setDraft] = useState(range);
  const state = useAsync(() => fetchReport(range.from, range.to), [range.from, range.to]);

  const apply = (event) => {
    event.preventDefault();
    if (draft.from && draft.to) setRange(draft.from <= draft.to ? draft : { from: draft.to, to: draft.from });
  };

  return (
    <>
      <PageHeader eyebrow="Analitik & Performa" title={title} description={description} />
      <form onSubmit={apply} className="card mb-6 flex flex-wrap items-end gap-4 p-5">
        <div><label htmlFor="r-from" className="label">Dari tanggal</label><input id="r-from" type="date" className="input" value={draft.from} max={draft.to} onChange={(e) => setDraft({ ...draft, from: e.target.value })} required /></div>
        <div><label htmlFor="r-to" className="label">Sampai tanggal</label><input id="r-to" type="date" className="input" value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} required /></div>
        <button type="submit" className="btn btn-primary">Terapkan periode</button>
        <button type="button" className="btn btn-outline ml-auto" onClick={() => window.print()}>
          <Printer className="h-3.5 w-3.5" strokeWidth={1.5} />Cetak
        </button>
      </form>
      <DataState state={state}>
        {(report) => (
          <>
            <p className="mb-4 text-xs uppercase tracking-eyebrow text-charcoal-400">
              Periode {tanggal(report.from)} — {tanggal(report.to)} • Pesanan lunas
            </p>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard icon={ClipboardList} label="Pesanan dibayar" value={report.summary.orders} />
              <StatCard icon={Wallet} label="Nilai penjualan produk" value={rupiah(report.summary.sales)} tone="earth" />
              <StatCard icon={Percent} label="Komisi marketplace" value={rupiah(report.summary.commission)} tone="earth" />
              <StatCard icon={BadgeCheck} label={showStores ? 'Pendapatan bersih penjual' : 'Pendapatan bersih toko'} value={rupiah(report.summary.net)} tone="forest" />
            </div>

            <section className="card mt-6 p-6">
              <p className="eyebrow mb-1">Tren Harian</p>
              <h2 className="font-display text-lg font-normal text-charcoal">Penjualan harian</h2>
              <div className="mt-6"><BarChart data={report.daily} /></div>
            </section>

            <div className={`mt-6 grid gap-6 ${showStores ? 'lg:grid-cols-2' : ''}`}>
              {showStores && (
                <section>
                  <div className="mb-3">
                    <p className="eyebrow">Mitra Pengrajin</p>
                    <h2 className="mt-1 font-display text-lg font-normal text-charcoal">Penjualan per toko</h2>
                  </div>
                  <div className="table-wrap">
                    <table className="table">
                      <thead><tr><th>Toko</th><th>Pesanan</th><th>Penjualan</th><th>Komisi</th><th>Bersih</th></tr></thead>
                      <tbody>
                        {report.by_store.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-xs uppercase tracking-eyebrow text-charcoal-400">Tidak ada penjualan pada periode ini.</td></tr>}
                        {report.by_store.map((row) => (
                          <tr key={row.store_id}>
                            <td className="font-medium text-charcoal">{row.store_name}</td>
                            <td>{row.orders}</td>
                            <td>{rupiah(row.sales)}</td>
                            <td className="text-charcoal-500">{rupiah(row.commission)}</td>
                            <td className="font-display font-medium text-earth-500">{rupiah(row.net)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
              <section>
                <div className="mb-3">
                  <p className="eyebrow">Katalog Unggulan</p>
                  <h2 className="mt-1 font-display text-lg font-normal text-charcoal">Produk terlaris</h2>
                </div>
                <div className="table-wrap">
                  <table className="table">
                    <thead><tr><th>Produk</th>{showStores && <th>Toko</th>}<th>Terjual</th><th>Nilai</th></tr></thead>
                    <tbody>
                      {report.top_products.length === 0 && <tr><td colSpan={showStores ? 4 : 3} className="py-10 text-center text-xs uppercase tracking-eyebrow text-charcoal-400">Tidak ada produk terjual pada periode ini.</td></tr>}
                      {report.top_products.map((row) => (
                        <tr key={`${row.name}-${row.store_name}`}>
                          <td className="font-medium text-charcoal">{row.name}</td>
                          {showStores && <td className="text-charcoal-600">{row.store_name}</td>}
                          <td>{row.quantity}</td>
                          <td className="font-display font-medium text-earth-500">{rupiah(row.sales)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </>
        )}
      </DataState>
    </>
  );
}
