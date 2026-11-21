import { useState } from 'react';
import { Search, Users as UsersIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { listUsers, setUserActive } from '../../services/admin';
import { DataState, EmptyState } from '../../components/ui/Feedback';
import { ConfirmDialog } from '../../components/ui/Modal';
import { FilterTabs, PageHeader } from '../../components/ui/Layout';
import { Badge } from '../../components/ui/Badge';
import { ROLE_LABEL, tanggal } from '../../utils/format';

const TABS = [{ value: '', label: 'Semua' }, { value: 'buyer', label: 'Pembeli' }, { value: 'seller', label: 'Penjual' }, { value: 'admin', label: 'Admin' }];

export default function AdminUsers() {
  const { profile } = useAuth();
  const toast = useToast();
  const [role, setRole] = useState('');
  const [term, setTerm] = useState('');
  const [search, setSearch] = useState('');
  const state = useAsync(() => listUsers({ role, search }), [role, search]);
  const [target, setTarget] = useState(null);
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    setBusy(true);
    try {
      await setUserActive(target.id, !target.is_active);
      toast.success(target.is_active ? 'Akun dinonaktifkan.' : 'Akun diaktifkan kembali.');
      setTarget(null);
      state.reload();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Manajemen Akun"
        title="Pengguna"
        description="Kelola status aktif akun pengguna. Hak akses admin hanya dapat diberikan melalui prosedur provisioning server."
      />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <form className="flex w-full max-w-md gap-2" onSubmit={(event) => { event.preventDefault(); setSearch(term.trim()); }}>
          <label htmlFor="user-search" className="sr-only">Cari email</label>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-400" strokeWidth={1.5} />
            <input id="user-search" type="search" className="input pl-10" placeholder="Cari berdasarkan alamat email..." value={term} onChange={(e) => setTerm(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-outline">Cari</button>
        </form>
      </div>
      <FilterTabs options={TABS} value={role} onChange={setRole} />
      <DataState state={state}>
        {(users) => users.length === 0 ? (
          <EmptyState icon={UsersIcon} title="Tidak ada pengguna" description="Tidak ada akun yang cocok dengan filter atau pencarian ini." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Nama lengkap</th>
                  <th>Email</th>
                  <th>Telepon</th>
                  <th>Peran</th>
                  <th>Terdaftar</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="font-medium text-charcoal">{user.full_name || '-'}</td>
                    <td className="text-charcoal-600">{user.email}</td>
                    <td className="text-charcoal-500">{user.phone || '-'}</td>
                    <td><Badge tone={user.role === 'admin' ? 'earth' : user.role === 'seller' ? 'blue' : 'gray'}>{ROLE_LABEL[user.role]}</Badge></td>
                    <td className="whitespace-nowrap text-charcoal-500">{tanggal(user.created_at)}</td>
                    <td>{user.is_active ? <Badge tone="green">Aktif</Badge> : <Badge tone="red">Nonaktif</Badge>}</td>
                    <td className="text-right">
                      {user.id === profile.id
                        ? <span className="text-[11px] uppercase tracking-wider text-charcoal-400">Akun Anda</span>
                        : <button type="button" className={`btn btn-sm ${user.is_active ? 'btn-danger-outline' : 'btn-outline'}`} onClick={() => setTarget(user)}>{user.is_active ? 'Nonaktifkan' : 'Aktifkan'}</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DataState>
      <ConfirmDialog open={Boolean(target)} loading={busy} danger={target?.is_active}
        title={target?.is_active ? 'Nonaktifkan akun' : 'Aktifkan akun'} confirmLabel={target?.is_active ? 'Nonaktifkan akun' : 'Aktifkan akun'}
        message={target?.is_active
          ? `${target?.email} tidak akan bisa bertransaksi atau mengelola toko sampai diaktifkan kembali.`
          : `${target?.email} akan dapat memakai akunnya kembali.`}
        onConfirm={toggle} onClose={() => setTarget(null)} />
    </>
  );
}
