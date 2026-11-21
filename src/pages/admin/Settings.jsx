import { useState } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { useAsync } from '../../hooks/useAsync';
import { getSettings } from '../../services/catalog';
import { updateSettings, cleanupOrphanImages } from '../../services/admin';
import { edgeFunctionsEnabled } from '../../lib/supabase';
import { Field } from '../../components/ui/Field';
import { DataState, InlineError, Spinner } from '../../components/ui/Feedback';
import { PageHeader } from '../../components/ui/Layout';
import { isEmail, validate } from '../../utils/validators';
import { rupiah, tanggal } from '../../utils/format';

function SettingsForm({ settings, onSaved }) {
  const toast = useToast();
  const [values, setValues] = useState({
    commission_rate: String(Number(settings.commission_rate)), shipping_flat_fee: String(Number(settings.shipping_flat_fee)),
    contact_email: settings.contact_email, contact_phone: settings.contact_phone, contact_address: settings.contact_address,
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (field) => (event) => setValues({ ...values, [field]: event.target.value });
  const sample = 500000;
  const rate = Number(values.commission_rate) || 0;

  const save = async (event) => {
    event.preventDefault();
    const found = validate(values, {
      commission_rate: (v) => (v === '' || Number(v) < 0 || Number(v) > 100 ? 'Isi angka 0 sampai 100.' : null),
      shipping_flat_fee: (v) => (v === '' || Number(v) < 0 ? 'Isi angka 0 atau lebih.' : null),
      contact_email: (v) => (v && !isEmail(v) ? 'Email tidak valid.' : null),
    });
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      await updateSettings(values);
      toast.success('Pengaturan disimpan.');
      onSaved();
    } catch (error) {
      setFormError(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} noValidate className="card max-w-2xl space-y-5 p-6">
      <div className="border-b border-cream-200 pb-4">
        <p className="eyebrow">Parameter Transaksi</p>
        <h2 className="mt-1 font-display text-lg font-normal text-charcoal">Komisi & Pengiriman</h2>
      </div>
      <InlineError>{formError}</InlineError>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Komisi marketplace (%)" htmlFor="set-rate" error={errors.commission_rate} required>
          <input id="set-rate" type="number" min="0" max="100" step="0.01" className="input" value={values.commission_rate} onChange={set('commission_rate')} />
        </Field>
        <Field label="Ongkos kirim tetap per toko (Rp)" htmlFor="set-ship" error={errors.shipping_flat_fee} required>
          <input id="set-ship" type="number" min="0" step="1" className="input" value={values.shipping_flat_fee} onChange={set('shipping_flat_fee')} />
        </Field>
      </div>
      <div className="border border-cream-300 bg-cream-50/70 p-4 text-xs leading-relaxed text-charcoal-600">
        <p className="font-medium uppercase tracking-wider text-charcoal">Simulasi perhitungan</p>
        <p className="mt-1">
          Subtotal produk {rupiah(sample)} dengan komisi {rate}% menghasilkan komisi <strong className="text-earth-600">{rupiah((sample * rate) / 100)}</strong> dan pendapatan bersih penjual <strong className="text-charcoal">{rupiah(sample - (sample * rate) / 100)}</strong>.
          Tarif baru hanya berlaku untuk transaksi berikutnya.
        </p>
      </div>

      <div className="border-b border-cream-200 pb-4 pt-2">
        <p className="eyebrow">Informasi Publik</p>
        <h2 className="mt-1 font-display text-lg font-normal text-charcoal">Kontak PAPEDA</h2>
      </div>
      <Field label="Email kontak" htmlFor="set-email" error={errors.contact_email}>
        <input id="set-email" type="email" className="input" value={values.contact_email} onChange={set('contact_email')} />
      </Field>
      <Field label="Telepon kontak" htmlFor="set-phone">
        <input id="set-phone" type="tel" className="input" value={values.contact_phone} onChange={set('contact_phone')} />
      </Field>
      <Field label="Alamat kontak" htmlFor="set-address">
        <input id="set-address" className="input" value={values.contact_address} onChange={set('contact_address')} />
      </Field>
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-cream-200 pt-4">
        <p className="text-xs text-charcoal-400">Terakhir diperbarui {tanggal(settings.updated_at, true)}</p>
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy && <Spinner className="h-4 w-4" />}Simpan pengaturan</button>
      </div>
    </form>
  );
}

export default function AdminSettings() {
  const toast = useToast();
  const state = useAsync(getSettings, []);
  const [cleaning, setCleaning] = useState(false);

  const cleanup = async () => {
    setCleaning(true);
    try {
      const result = await cleanupOrphanImages();
      toast.success(`${result.removed} gambar tak terpakai dihapus dari ${result.checked} berkas.`);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setCleaning(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Konfigurasi"
        title="Pengaturan sistem"
        description="Atur tarif komisi marketplace, ongkos kirim tetap, serta informasi kontak resmi yang tampil di halaman publik."
      />
      <DataState state={state}>
        {(settings) => <SettingsForm key={settings.updated_at} settings={settings} onSaved={state.reload} />}
      </DataState>
      {edgeFunctionsEnabled && (
        <section className="card mt-6 max-w-2xl p-6">
          <p className="eyebrow">Utilitas</p>
          <h2 className="mt-1 font-display text-lg font-normal text-charcoal">Perawatan penyimpanan</h2>
          <p className="mt-1.5 text-xs leading-relaxed text-charcoal-600">Menghapus berkas di bucket product-images yang tidak lagi dirujuk produk mana pun. Dijalankan oleh Edge Function cleanup-orphan-images.</p>
          <button type="button" className="btn btn-outline mt-4" onClick={cleanup} disabled={cleaning}>{cleaning && <Spinner className="h-4 w-4" />}Hapus gambar tak terpakai</button>
        </section>
      )}
    </>
  );
}
