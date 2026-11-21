import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, CircleX, PauseCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { submitStoreApplication } from '../../services/seller';
import { Field } from '../../components/ui/Field';
import { InlineError, Spinner } from '../../components/ui/Feedback';
import { PageHeader } from '../../components/ui/Layout';
import { isEmail, isPhone, validate } from '../../utils/validators';
import { tanggal } from '../../utils/format';

const STATUS_INFO = {
  pending: { icon: Clock, tone: 'border-amber-200 bg-amber-50 text-amber-900', title: 'Pengajuan sedang diperiksa admin', text: 'Anda akan mendapat notifikasi setelah toko disetujui atau ditolak. Data di bawah masih bisa diperbaiki selama menunggu.' },
  approved: { icon: CheckCircle2, tone: 'border-forest-200 bg-forest-50 text-forest-900', title: 'Toko Anda sudah aktif', text: 'Anda dapat menambahkan produk dan menerima pesanan.' },
  rejected: { icon: CircleX, tone: 'border-red-200 bg-red-50 text-red-900', title: 'Pengajuan ditolak', text: 'Perbaiki data sesuai alasan penolakan, lalu kirim ulang.' },
  suspended: { icon: PauseCircle, tone: 'border-stone-300 bg-stone-100 text-stone-800', title: 'Toko ditangguhkan admin', text: 'Produk Anda tidak tampil selama toko ditangguhkan. Hubungi admin melalui halaman Kontak.' },
};

export default function StoreApplication() {
  const { profile, store, refresh } = useAuth();
  const toast = useToast();
  const [values, setValues] = useState({
    name: store?.name || '', description: store?.description || '', address: store?.address || '', city: store?.city || '',
    region: store?.region || '', phone: store?.phone || profile.phone || '', email: store?.email || profile.email,
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (field) => (event) => setValues({ ...values, [field]: event.target.value });
  const info = store ? STATUS_INFO[store.status] : null;
  const editable = !store || store.status === 'pending' || store.status === 'rejected';

  const submit = async (event) => {
    event.preventDefault();
    const found = validate(values, {
      name: (v) => (v.trim().length < 3 ? 'Nama toko minimal 3 karakter.' : v.trim().length > 80 ? 'Nama toko maksimal 80 karakter.' : null),
      description: (v) => (v.trim().length < 20 ? 'Ceritakan toko Anda minimal 20 karakter.' : null),
      address: (v) => (v.trim().length < 5 ? 'Isi alamat toko.' : null),
      city: (v) => (v.trim().length < 2 ? 'Isi kota atau kabupaten.' : null),
      phone: (v) => (!isPhone(v) ? 'Nomor kontak tidak valid.' : null),
      email: (v) => (v && !isEmail(v) ? 'Email tidak valid.' : null),
    });
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      await submitStoreApplication(values);
      await refresh();
      toast.success('Pengajuan toko dikirim. Tunggu verifikasi admin.');
    } catch (error) {
      setFormError(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Pengajuan toko" description="Toko perlu disetujui admin sebelum produk Anda tampil di marketplace." />
      {info && (
        <div className={`mb-6 flex gap-3 rounded-lg border p-4 ${info.tone}`}>
          <info.icon className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="text-sm">
            <p className="font-semibold">{info.title}</p>
            <p>{info.text}</p>
            {store.rejection_reason && <p className="mt-1"><strong>Alasan dari admin:</strong> {store.rejection_reason}</p>}
            {store.verified_at && <p className="mt-1 text-xs opacity-80">Diperiksa {tanggal(store.verified_at, true)}</p>}
            {store.status === 'approved' && <Link to="/seller" className="btn btn-primary btn-sm mt-3">Buka dasbor toko</Link>}
          </div>
        </div>
      )}

      <form onSubmit={submit} noValidate className="card space-y-4 p-5">
        <InlineError>{formError}</InlineError>
        <fieldset disabled={!editable || busy} className="space-y-4">
          <Field label="Nama toko" htmlFor="s-name" error={errors.name} required>
            <input id="s-name" className="input" maxLength={80} value={values.name} onChange={set('name')} />
          </Field>
          <Field label="Deskripsi toko" htmlFor="s-desc" error={errors.description} hint="Apa yang Anda buat, bahan yang dipakai, dan siapa pembuatnya." required>
            <textarea id="s-desc" rows={4} maxLength={2000} className="input" value={values.description} onChange={set('description')} />
          </Field>
          <Field label="Alamat toko" htmlFor="s-address" error={errors.address} required>
            <input id="s-address" className="input" maxLength={300} value={values.address} onChange={set('address')} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Kota / kabupaten" htmlFor="s-city" error={errors.city} required>
              <input id="s-city" className="input" value={values.city} onChange={set('city')} />
            </Field>
            <Field label="Provinsi" htmlFor="s-region">
              <input id="s-region" className="input" value={values.region} onChange={set('region')} />
            </Field>
            <Field label="Nomor kontak toko" htmlFor="s-phone" error={errors.phone} required>
              <input id="s-phone" type="tel" className="input" value={values.phone} onChange={set('phone')} />
            </Field>
            <Field label="Email toko" htmlFor="s-email" error={errors.email}>
              <input id="s-email" type="email" className="input" value={values.email} onChange={set('email')} />
            </Field>
          </div>
        </fieldset>
        {editable
          ? <button type="submit" className="btn btn-primary" disabled={busy}>{busy && <Spinner className="h-4 w-4" />}{store ? (store.status === 'rejected' ? 'Kirim ulang pengajuan' : 'Perbarui pengajuan') : 'Kirim pengajuan toko'}</button>
          : store.status === 'approved' && <p className="text-sm text-charcoal-600">Untuk mengubah data toko yang sudah aktif, buka <Link to="/seller/pengaturan" className="font-semibold text-charcoal hover:underline">Pengaturan toko</Link>.</p>}
      </form>
    </>
  );
}
