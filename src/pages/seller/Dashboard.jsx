import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowUpRight, BadgeCheck, ClipboardList, Package, PackageCheck, Percent, Plus, ShoppingCart, Truck, Wallet } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { getSellerStats } from '../../services/seller';
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

export default function SellerDashboard() {
  const { store } = useAuth();
  const state = useAsync(getSellerStats, []);
  return (
    <>
      <PageHeader
        eyebrow="Studio Pengrajin"
        title={store.name}
        description="Ringkasan performa toko berdasarkan pesanan dan pendapatan bersih yang tercatat."
        actions={<Link to="/seller/produk/tambah" className="btn btn-primary"><Plus className="h-4 w-4" strokeWidth={1.5} />Tambah produk</Link>}
      />
      <DataState state={state}>
        {(stats) => (
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            {stats.new_orders > 0 && (
              <motion.div variants={fadeUp}>
                <Link
                  to="/seller/pesanan?status=paid"
                  className="mb-6 flex items-center justify-between gap-3 border border-forest-200 bg-forest-50 px-5 py-4 text-xs font-medium uppercase tracking-wider text-forest-700 transition-colors hover:border-forest-400"
                >
                  <span className="flex items-center gap-3">
                    <ShoppingCart className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                    {stats.new_orders} pesanan baru sudah dibayar dan menunggu diproses.
                  </span>
                  <span className="inline-flex items-center gap-1 border-b border-forest-700 pb-0.5">
                    Buka pesanan<ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </span>
                </Link>
              </motion.div>
            )}
            <motion.div variants={fadeUp} className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard icon={Package} label="Total produk" value={stats.total_products} />
              <StatCard icon={ClipboardList} label="Total pesanan" value={stats.total_orders} />
              <StatCard icon={ShoppingCart} label="Pesanan baru" value={stats.new_orders} tone="amber" />
              <StatCard icon={Truck} label="Diproses / dikirim" value={stats.processing_orders} tone="earth" />
              <StatCard icon={PackageCheck} label="Pesanan selesai" value={stats.completed_orders} tone="forest" />
              <StatCard icon={Wallet} label="Total penjualan" value={rupiah(stats.total_sales)} />
              <StatCard icon={Percent} label="Komisi marketplace" value={rupiah(stats.total_commission)} tone="earth" />
              <StatCard icon={BadgeCheck} label="Pendapatan bersih" value={rupiah(stats.net_income)} tone="forest" />
            </motion.div>

            {stats.low_stock > 0 && (
              <motion.div variants={fadeUp}>
                <Link to="/seller/produk" className="mt-4 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-earth-600 hover:underline">
                  <AlertTriangle className="h-4 w-4" strokeWidth={1.5} />{stats.low_stock} produk memiliki stok 3 atau kurang. Periksa stok.
                </Link>
              </motion.div>
            )}

            <motion.div variants={fadeUp} className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
              <section className="card p-6">
                <p className="eyebrow mb-1">Tren Harian</p>
                <h2 className="font-display text-lg font-normal text-charcoal">Penjualan 14 hari terakhir</h2>
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
                        <li key={product.name} className="flex items-center gap-3.5 py-3 text-sm first:pt-0 last:pb-0">
                          <span className="w-6 shrink-0 font-display text-xs font-medium text-earth-500">0{index + 1}</span>
                          <span className="min-w-0 flex-1 truncate font-medium text-charcoal">{product.name}</span>
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
