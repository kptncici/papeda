import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowUpRight, CheckCircle2, ClipboardList, Clock, PackageCheck, ShoppingBag, Wallet } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useAsync } from '../../hooks/useAsync';
import { getBuyerStats, listMyOrders } from '../../services/orders';
import { DataState, EmptyState } from '../../components/ui/Feedback';
import { PageHeader, StatCard } from '../../components/ui/Layout';
import { StatusBadge } from '../../components/ui/Badge';
import { ORDER_STATUS, rupiah, tanggal } from '../../utils/format';

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

export default function BuyerDashboard() {
  const { profile } = useAuth();
  const state = useAsync(async () => {
    const [stats, orders] = await Promise.all([getBuyerStats(), listMyOrders(profile.id, 5)]);
    return { stats, orders };
  }, [profile.id]);

  return (
    <>
      <PageHeader
        eyebrow="Akun Pembeli"
        title={`Halo, ${profile.full_name || 'pembeli'}`}
        description="Ringkasan aktivitas belanja dan status pesanan terbaru Anda di PAPEDA."
        actions={<Link to="/produk" className="btn btn-primary"><ShoppingBag className="h-4 w-4" strokeWidth={1.5} />Eksplorasi Koleksi</Link>}
      />
      <DataState state={state}>
        {({ stats, orders }) => (
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            <motion.div variants={fadeUp} className="grid grid-cols-2 gap-4 lg:grid-cols-5">
              <StatCard icon={ClipboardList} label="Total pesanan" value={stats.total_orders} />
              <StatCard icon={Clock} label="Menunggu bayar" value={stats.pending_payment} tone="amber" />
              <StatCard icon={PackageCheck} label="Sedang diproses" value={stats.processing} tone="earth" />
              <StatCard icon={CheckCircle2} label="Selesai" value={stats.completed} tone="forest" />
              <StatCard icon={Wallet} label="Total belanja" value={rupiah(stats.total_spent)} tone="earth" />
            </motion.div>

            <motion.div variants={fadeUp} className="mb-4 mt-10 flex items-end justify-between border-b border-cream-300 pb-3">
              <div>
                <p className="eyebrow">Riwayat</p>
                <h2 className="mt-1 font-display text-xl font-normal tracking-tight text-charcoal">Transaksi terakhir</h2>
              </div>
              <Link to="/akun/pesanan" className="inline-flex items-center gap-1 border-b border-charcoal pb-0.5 text-xs font-medium uppercase tracking-eyebrow text-charcoal transition-opacity hover:opacity-60">
                Semua pesanan<ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.5} />
              </Link>
            </motion.div>

            <motion.div variants={fadeUp}>
              {orders.length === 0 ? (
                <EmptyState icon={ShoppingBag} title="Belum ada pesanan" description="Pesanan Anda akan tercatat di sini setelah melakukan checkout."
                  action={<Link to="/produk" className="btn btn-primary">Lihat koleksi</Link>} />
              ) : (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Nomor pesanan</th>
                        <th>Tanggal</th>
                        <th>Toko pengrajin</th>
                        <th>Total</th>
                        <th>Status</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => (
                        <tr key={order.id}>
                          <td className="font-medium text-charcoal">{order.order_number}</td>
                          <td className="whitespace-nowrap text-charcoal-500">{tanggal(order.created_at)}</td>
                          <td className="max-w-[220px] truncate">{order.store_orders.map((so) => so.store_name).join(', ')}</td>
                          <td className="font-display font-medium text-earth-500">{rupiah(order.grand_total)}</td>
                          <td><StatusBadge map={ORDER_STATUS} value={order.status} /></td>
                          <td className="text-right">
                            <Link
                              to={order.status === 'pending_payment' ? `/pembayaran/${order.id}` : `/akun/pesanan/${order.id}`}
                              className="inline-block border-b border-charcoal pb-0.5 text-xs font-medium uppercase tracking-wider text-charcoal transition-opacity hover:opacity-60"
                            >
                              {order.status === 'pending_payment' ? 'Bayar' : 'Detail'}
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </DataState>
    </>
  );
}
