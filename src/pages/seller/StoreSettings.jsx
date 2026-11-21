import { useRef, useState } from 'react';
import { Camera, Store } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { updateStore } from '../../services/seller';
import { uploadImage, removeImages, pathFromPublicUrl } from '../../services/storage';
import { Field } from '../../components/ui/Field';
import { InlineError, Spinner } from '../../components/ui/Feedback';
import { PageHeader } from '../../components/ui/Layout';
import { isEmail, isPhone, validate, validateImage } from '../../utils/validators';

export default function StoreSettings() {
  const { store, refresh } = useAuth();
  const toast = useToast();
  const fileInput = useRef(null);
  const [values, setValues] = useState({
    name: store.name, description: store.description, address: store.address, city: store.city, region: store.region, phone: store.phone, email: store.email,
  });
  const [preview, setPreview] = useState(null); // { file, url } foto yang dipilih tetapi belum disimpan
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (field) => (event) => setValues({ ...values, [field]: event.target.value });

  const pickImage = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const problem = validateImage(file);
    if (problem) return toast.error(problem);
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview({ file, url: URL.createObjectURL(file) });
    return undefined;
  };

  const save = async (event) => {
    event.preventDefault();
    const found = validate(values, {
      name: (v) => (v.trim().length < 3 ? 'Nama toko minimal 3 karakter.' : null),
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
      const payload = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.trim()]));
      let oldPath = null;
      if (preview) {
        const uploaded = await uploadImage('store-images', store.id, preview.file);
        payload.image_url = uploaded.url;
        oldPath = pathFromPublicUrl('store-images', store.image_url);
      }
      await updateStore(store.id, payload);
      if (oldPath) await removeImages('store-images', [oldPath]).catch(() => {});
      if (preview) { URL.revokeObjectURL(preview.url); setPreview(null); }
      await refresh();
      toast.success('Data toko disimpan.');
    } catch (error) {
      setFormError(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Pengaturan toko" description="Perubahan langsung terlihat di halaman publik toko Anda." />
      <form onSubmit={save} noValidate className="card max-w-3xl space-y-4 p-5">
        <div className="flex items-center gap-4">
          <span className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-cream-200 text-charcoal-600">
            {preview || store.image_url ? <img src={preview?.url || store.image_url} alt="Foto toko" className="h-full w-full object-cover" /> : <Store className="h-9 w-9" />}
          </span>
          <div>
            <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={pickImage} />
            <button type="button" className="btn btn-outline btn-sm" onClick={() => fileInput.current?.click()}><Camera className="h-4 w-4" />Pilih foto toko</button>
            <p className="mt-1 text-xs text-charcoal-400">{preview ? 'Pratinjau. Foto baru tersimpan setelah Anda menekan Simpan.' : 'JPG, PNG, atau WebP hingga 20 MB. Foto besar dikompres otomatis.'}</p>
          </div>
        </div>
        <InlineError>{formError}</InlineError>
        <Field label="Nama toko" htmlFor="t-name" error={errors.name} required>
          <input id="t-name" className="input" maxLength={80} value={values.name} onChange={set('name')} />
        </Field>
        <Field label="Deskripsi toko" htmlFor="t-desc">
          <textarea id="t-desc" rows={4} maxLength={2000} className="input" value={values.description} onChange={set('description')} />
        </Field>
        <Field label="Alamat toko" htmlFor="t-address" error={errors.address} required>
          <input id="t-address" className="input" maxLength={300} value={values.address} onChange={set('address')} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Kota / kabupaten" htmlFor="t-city" error={errors.city} required><input id="t-city" className="input" value={values.city} onChange={set('city')} /></Field>
          <Field label="Provinsi" htmlFor="t-region"><input id="t-region" className="input" value={values.region} onChange={set('region')} /></Field>
          <Field label="Nomor kontak" htmlFor="t-phone" error={errors.phone} required><input id="t-phone" type="tel" className="input" value={values.phone} onChange={set('phone')} /></Field>
          <Field label="Email toko" htmlFor="t-email" error={errors.email}><input id="t-email" type="email" className="input" value={values.email} onChange={set('email')} /></Field>
        </div>
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy && <Spinner className="h-4 w-4" />}Simpan data toko</button>
      </form>
    </>
  );
}
