import { useState } from 'react';
import { MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { listAddresses, createAddress, updateAddress, deleteAddress, setDefaultAddress } from '../../services/addresses';
import { DataState, EmptyState } from '../../components/ui/Feedback';
import { ConfirmDialog, Modal } from '../../components/ui/Modal';
import { PageHeader } from '../../components/ui/Layout';
import { Badge } from '../../components/ui/Badge';
import AddressForm from '../../components/AddressForm';

export default function Addresses() {
  const { profile } = useAuth();
  const toast = useToast();
  const state = useAsync(listAddresses, []);
  const [editing, setEditing] = useState(null); // null | 'new' | address
  const [removing, setRemoving] = useState(null);
  const [busy, setBusy] = useState(false);

  const act = async (action, message) => {
    setBusy(true);
    try {
      await action();
      toast.success(message);
      state.reload();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const save = async (values) => {
    if (editing === 'new') await createAddress(profile.id, values);
    else await updateAddress(editing.id, values);
    setEditing(null);
    toast.success('Alamat disimpan.');
    state.reload();
  };

  return (
    <>
      <PageHeader
        eyebrow="Buku Alamat"
        title="Alamat pengiriman"
        description="Daftar alamat pengiriman yang dapat dipilih saat proses checkout."
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setEditing('new')}>
            <Plus className="h-4 w-4" strokeWidth={1.5} />Tambah alamat
          </button>
        }
      />
      <DataState state={state}>
        {(addresses) => addresses.length === 0 ? (
          <EmptyState icon={MapPin} title="Belum ada alamat" description="Tambahkan alamat pengiriman agar proses checkout lebih cepat."
            action={<button type="button" className="btn btn-primary" onClick={() => setEditing('new')}>Tambah alamat</button>} />
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {addresses.map((address) => (
              <li key={address.id} className="card flex flex-col justify-between p-6 text-sm transition-colors hover:border-charcoal-300">
                <div>
                  <div className="flex items-center justify-between gap-2 border-b border-cream-200 pb-3">
                    <p className="text-xs font-medium uppercase tracking-eyebrow text-earth-500">{address.label}</p>
                    {address.is_default && <Badge tone="green">Utama</Badge>}
                  </div>
                  <p className="mt-4 font-display text-base font-medium text-charcoal">{address.recipient_name}</p>
                  <p className="mt-0.5 text-xs text-charcoal-500">{address.phone}</p>
                  <p className="mt-2 text-xs leading-relaxed text-charcoal-600">{address.address_line}, {address.city}, {address.province} {address.postal_code || ''}</p>
                </div>
                <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-cream-200 pt-4">
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => setEditing(address)}>
                    <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />Ubah
                  </button>
                  {!address.is_default && (
                    <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => act(() => setDefaultAddress(address.id), 'Alamat utama diperbarui.')}>
                      Jadikan utama
                    </button>
                  )}
                  <button type="button" className="btn btn-danger-outline btn-sm ml-auto" onClick={() => setRemoving(address)}>
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />Hapus
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </DataState>

      <Modal open={Boolean(editing)} title={editing === 'new' ? 'Tambah alamat' : 'Ubah alamat'} onClose={() => setEditing(null)}>
        {editing && <AddressForm key={editing === 'new' ? 'new' : editing.id} onCancel={() => setEditing(null)} onSubmit={save}
          initial={editing === 'new' ? { recipient_name: profile.full_name, phone: profile.phone || '', is_default: (state.data || []).length === 0 } : editing} />}
      </Modal>
      <ConfirmDialog open={Boolean(removing)} title="Hapus alamat" danger confirmLabel="Hapus alamat" loading={busy}
        message={`Alamat "${removing?.label}" akan dihapus. Pesanan lama tidak terpengaruh.`}
        onClose={() => setRemoving(null)}
        onConfirm={async () => { await act(() => deleteAddress(removing.id), 'Alamat dihapus.'); setRemoving(null); }} />
    </>
  );
}
