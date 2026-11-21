import { History } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { listActivityLogs } from '../../services/admin';
import { DataState, EmptyState } from '../../components/ui/Feedback';
import { PageHeader } from '../../components/ui/Layout';
import { tanggal } from '../../utils/format';

const ACTIONS = {
  'admin.provisioned': 'Admin diprovisi',
  'store.approved': 'Toko disetujui',
  'store.rejected': 'Toko ditolak',
  'store.suspended': 'Toko ditangguhkan',
  'user.activated': 'Akun diaktifkan',
  'user.deactivated': 'Akun dinonaktifkan',
  'product.blocked': 'Produk diblokir',
  'product.approved': 'Blokir produk dibuka',
  'settings.updated': 'Pengaturan diubah',
  'category.insert': 'Kategori ditambahkan',
  'category.update': 'Kategori diubah',
  'category.delete': 'Kategori dihapus',
  'store_order.cancelled': 'Pesanan dibatalkan',
};

const describe = (details) =>
  Object.entries(details || {}).filter(([, value]) => value != null && value !== '').map(([key, value]) => `${key}: ${value}`).join(', ');

export default function AdminLogs() {
  const state = useAsync(listActivityLogs, []);
  return (
    <>
      <PageHeader
        eyebrow="Jejak Audit"
        title="Log aktivitas"
        description="200 tindakan administratif terakhir. Catatan audit ini ditulis otomatis oleh basis data dan bersifat permanen."
      />
      <DataState state={state}>
        {(logs) => logs.length === 0 ? (
          <EmptyState icon={History} title="Belum ada aktivitas" description="Tindakan admin seperti verifikasi toko dan moderasi produk akan tercatat di sini." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Waktu</th><th>Pelaku</th><th>Tindakan</th><th>Rincian</th></tr></thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="whitespace-nowrap text-xs text-charcoal-500">{tanggal(log.created_at, true)}</td>
                    <td className="font-mono text-xs text-charcoal-600">{log.actor_email || 'sistem'}</td>
                    <td className="font-medium text-charcoal">{ACTIONS[log.action] || log.action}</td>
                    <td className="text-xs text-charcoal-500">{describe(log.details) || '-'}</td>
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
