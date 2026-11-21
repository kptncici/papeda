import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowUpRight, Package, Percent, Receipt, ShieldCheck, ShoppingBag, Store, Users, Wallet } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { getAdminStats } from '../../services/admin';
import { DataState } from '../../components/ui/Feedback';
import { PageHeader, StatCard } from '../../components/ui/Layout';
import BarChart from '../../components/BarChart';
import { rupiah } from '../../utils/format';

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

export default function AdminDashboard() {
  const state = useAsync(getAdminStats, []);
  return (
    <>
      <PageHeader
        eyebrow="Panel Administrasi"
        title="Ringkasan marketplace"
        description="Metrik operasional dan transaksi seluruh toko pengrajin yang dihitung langsung secara real-time."
      />
      <DataState state={state}>
        {(stats) => (
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            {stats.pending_stores > 0 && (
              <motion.div variants={fadeUp}>
                <Link
                  to="/admin/toko"
                  className="mb-6 flex items-center justify-between gap-3 border border-earth-200 bg-earth-50 px-5 py-4 text-xs font-medium uppercase tracking-wider text-earth-700 transition-colors hover:border-earth-400"
                >
                  <span className="flex items-center gap-3">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-earth-600" strokeWidth={1.5} />
                    {stats.pending_stores} pengajuan toko pengrajin menunggu verifikasi.
                  </span>
                  <span className="inline-flex items-center gap-1 border-b border-earth-700 pb-0.5">
                    Tinjau sekarang<ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </span>
                </Link>
              </motion.div>
            )}
            <motion.div variants={fadeUp} className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard icon={Users} label="Total pengguna" value={stats.total_users} />
              <StatCard icon={Store} label="Total penjual" value={stats.total_sellers} tone="earth" />
              <StatCard icon={ShoppingBag} label="Total pembeli" value={stats.total_buyers} />
              <StatCard icon={ShieldCheck} label="Toko aktif" value={stats.active_stores} tone="forest" />
              <StatCard icon={Package} label="Total produk" value={stats.total_products} />
              <StatCard icon={Receipt} label="Total transaksi" value={stats.total_transactions} note={`${stats.paid_transactions} lunas`} tone="earth" />
              <StatCard icon={Wallet} label="Nilai penjualan" value={rupiah(stats.total_sales)} />
              <StatCard icon={Percent} label="Total komisi" value={rupiah(stats.total_commission)} tone="earth" />
            </motion.div>
            <motion.div variants={fadeUp} className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
              <section className="card p-6">
                <p className="eyebrow mb-1">Tren Penjualan</p>
                <h2 className="font-display text-lg font-normal text-charcoal">Transaksi 14 hari terakhir</h2>
                <div className="mt-6"><BarChart data={stats.chart} /></div>
              </section>
              <section className="card p-6">
                <p className="eyebrow mb-1">Katalog Unggulan</p>
                <h2 className="font-display text-lg font-normal text-charcoal">Produk terlaris</h2>
                {stats.top_products.length === 0
                  ? <p className="mt-6 text-xs text-charcoal-400">Belum ada produk yang terjual.</p>
                  : (
                    <ol className="mt-4 divide-y divide-cream-200">
                      {stats.top_products.map((product, index) => (
                        <li key={`${product.name}-${product.store_name}`} className="flex items-center gap-3.5 py-3 text-sm first:pt-0 last:pb-0">
                          <span className="w-6 shrink-0 font-display text-xs font-medium text-earth-500">0{index + 1}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium text-charcoal">{product.name}</span>
                            <span className="block truncate text-xs text-charcoal-500">{product.store_name}</span>
                          </span>
                          <span className="shrink-0 text-xs uppercase tracking-wider text-charcoal-600">{product.quantity} terjual</span>
                        </li>
                      ))}
                    </ol>
                  )}
              </section>
            </motion.div>
          </motion.div>
        )}
      </DataState>
    </>
  );
}
