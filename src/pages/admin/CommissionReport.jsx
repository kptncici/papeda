import { useState } from 'react';
import { BadgeCheck, Clock, Percent } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { listCommissions } from '../../services/admin';
import { DataState } from '../../components/ui/Feedback';
import { FilterTabs, PageHeader, StatCard } from '../../components/ui/Layout';
import { StatusBadge } from '../../components/ui/Badge';
import { COMMISSION_STATUS, isoDate, rupiah, tanggal } from '../../utils/format';

const TABS = [{ value: '', label: 'Semua' }, { value: 'earned', label: 'Diterima' }, { value: 'pending', label: 'Menunggu pembayaran' }, { value: 'cancelled', label: 'Batal' }];
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return isoDate(d); };
const sum = (rows, key) => rows.reduce((total, row) => total + Number(row[key]), 0);

export default function AdminCommissionReport() {
  const [status, setStatus] = useState('');
  const [range, setRange] = useState({ from: daysAgo(29), to: isoDate(new Date()) });
  const [draft, setDraft] = useState(range);
  const state = useAsync(() => listCommissions({ ...range, status }), [range.from, range.to, status]);

  return (
    <>
      <PageHeader
        eyebrow="Analitik Pendapatan"
        title="Laporan komisi"
        description="Rincian komisi PAPEDA per pesanan toko. Persentase dan nilai komisi dikunci saat transaksi dibuat."
      />
      <form className="card mb-6 flex flex-wrap items-end gap-4 p-5" onSubmit={(event) => { event.preventDefault(); setRange(draft.from <= draft.to ? draft : { from: draft.to, to: draft.from }); }}>
        <div><label htmlFor="k-from" className="label">Dari tanggal</label><input id="k-from" type="date" required className="input" value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })} /></div>
        <div><label htmlFor="k-to" className="label">Sampai tanggal</label><input id="k-to" type="date" required className="input" value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} /></div>
        <button type="submit" className="btn btn-primary">Terapkan periode</button>
      </form>
      <FilterTabs options={TABS} value={status} onChange={setStatus} />
      <DataState state={state}>
        {(rows) => {
          const earned = rows.filter((row) => row.status === 'earned');
          const pending = rows.filter((row) => row.status === 'pending');
          return (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard icon={Percent} label="Komisi diterima" value={rupiah(sum(earned, 'amount'))} note={`${earned.length} pesanan toko`} tone="forest" />
                <StatCard icon={BadgeCheck} label="Dasar komisi (nilai produk)" value={rupiah(sum(earned, 'base_amount'))} tone="earth" />
                <StatCard icon={Clock} label="Komisi menunggu bayar" value={rupiah(sum(pending, 'amount'))} note={`${pending.length} pesanan toko`} tone="amber" />
              </div>
              <div className="table-wrap mt-6">
                <table className="table">
                  <thead><tr><th>Pesanan toko</th><th>Toko pengrajin</th><th>Tanggal</th><th>Nilai produk</th><th>Tarif</th><th>Komisi</th><th>Bersih penjual</th><th>Status</th></tr></thead>
                  <tbody>
                    {rows.length === 0 && <tr><td colSpan={8} className="py-10 text-center text-xs uppercase tracking-eyebrow text-charcoal-400">Tidak ada komisi pada periode ini.</td></tr>}
                    {rows.map((row) => (
                      <tr key={row.id}>
                        <td className="font-medium text-charcoal">{row.store_order?.store_order_number || '-'}</td>
                        <td className="text-charcoal-600">{row.store_order?.store_name || '-'}</td>
                        <td className="whitespace-nowrap text-charcoal-500">{tanggal(row.earned_at || row.created_at)}</td>
                        <td>{rupiah(row.base_amount)}</td>
                        <td className="text-charcoal-500">{Number(row.rate)}%</td>
                        <td className="font-display font-medium text-earth-500">{rupiah(row.amount)}</td>
                        <td className="text-charcoal-700">{rupiah(row.seller_net)}</td>
                        <td><StatusBadge map={COMMISSION_STATUS} value={row.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          );
        }}
      </DataState>
    </>
  );
}
