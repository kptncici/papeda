import { useRef, useState } from 'react';
import { Camera, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { updateProfile, changePassword } from '../../services/profile';
import { uploadImage, removeImages, pathFromPublicUrl } from '../../services/storage';
import { Field } from '../../components/ui/Field';
import { InlineError, Spinner } from '../../components/ui/Feedback';
import { PageHeader } from '../../components/ui/Layout';
import { isPhone, validate } from '../../utils/validators';
import { ROLE_LABEL, tanggal } from '../../utils/format';

export default function Profile() {
  const { profile, refresh } = useAuth();
  const toast = useToast();
  const fileInput = useRef(null);
  const [values, setValues] = useState({ full_name: profile.full_name, phone: profile.phone || '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [passwords, setPasswords] = useState({ next: '', confirm: '' });
  const [passwordError, setPasswordError] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const save = async (event) => {
    event.preventDefault();
    const found = validate(values, {
      full_name: (v) => (v.trim().length < 3 ? 'Nama lengkap minimal 3 karakter.' : null),
      phone: (v) => (v && !isPhone(v) ? 'Nomor telepon tidak valid.' : null),
    });
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      await updateProfile(profile.id, { full_name: values.full_name.trim(), phone: values.phone.trim() || null });
      await refresh();
      toast.success('Profil disimpan.');
    } catch (error) {
      setFormError(error.message);
    } finally {
      setBusy(false);
    }
  };

  const changeAvatar = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await uploadImage('profile-images', profile.id, file);
      const oldPath = pathFromPublicUrl('profile-images', profile.avatar_url);
      await updateProfile(profile.id, { avatar_url: url });
      if (oldPath) await removeImages('profile-images', [oldPath]).catch(() => {});
      await refresh();
      toast.success('Foto profil diperbarui.');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setUploading(false);
    }
  };

  const savePassword = async (event) => {
    event.preventDefault();
    if (passwords.next.length < 8) return setPasswordError('Kata sandi baru minimal 8 karakter.');
    if (passwords.next !== passwords.confirm) return setPasswordError('Konfirmasi kata sandi tidak sama.');
    setPasswordError('');
    setSavingPassword(true);
    try {
      await changePassword(passwords.next);
      setPasswords({ next: '', confirm: '' });
      toast.success('Kata sandi diganti.');
    } catch (error) {
      setPasswordError(error.message);
    } finally {
      setSavingPassword(false);
    }
    return undefined;
  };

  return (
    <>
      <PageHeader eyebrow="Identitas Akun" title="Profil akun" description="Informasi pribadi yang digunakan untuk pesanan dan komunikasi." />
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <form onSubmit={save} noValidate className="card space-y-5 p-6">
          <div className="flex items-center gap-5 border-b border-cream-200 pb-5">
            <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden border border-cream-300 bg-cream-100 text-charcoal-500">
              {profile.avatar_url ? <img src={profile.avatar_url} alt="Foto profil" className="h-full w-full object-cover" /> : <User className="h-8 w-8" strokeWidth={1.25} />}
            </span>
            <div>
              <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={changeAvatar} />
              <button type="button" className="btn btn-outline btn-sm" disabled={uploading} onClick={() => fileInput.current?.click()}>
                {uploading ? <Spinner className="h-3.5 w-3.5" /> : <Camera className="h-3.5 w-3.5" strokeWidth={1.5} />}Ganti foto
              </button>
              <p className="mt-1.5 text-xs text-charcoal-400">JPG, PNG, atau WebP hingga 20 MB. Dikompres otomatis.</p>
            </div>
          </div>
          <InlineError>{formError}</InlineError>
          <Field label="Nama lengkap" htmlFor="p-name" error={errors.full_name} required>
            <input id="p-name" className="input" value={values.full_name} onChange={(e) => setValues({ ...values, full_name: e.target.value })} />
          </Field>
          <Field label="Nomor telepon" htmlFor="p-phone" error={errors.phone}>
            <input id="p-phone" type="tel" className="input" value={values.phone} onChange={(e) => setValues({ ...values, phone: e.target.value })} />
          </Field>
          <Field label="Alamat Email" htmlFor="p-email" hint="Email digunakan untuk masuk dan tidak dapat diubah dari halaman ini.">
            <input id="p-email" className="input" value={profile.email} disabled />
          </Field>
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-cream-200 pt-4">
            <p className="text-xs text-charcoal-500">Peran akun: <strong className="uppercase tracking-wider text-charcoal">{ROLE_LABEL[profile.role]}</strong> • Terdaftar {tanggal(profile.created_at)}</p>
            <button type="submit" className="btn btn-primary" disabled={busy}>{busy && <Spinner className="h-4 w-4" />}Simpan profil</button>
          </div>
        </form>

        <form onSubmit={savePassword} noValidate className="card h-fit space-y-4 p-6">
          <div className="border-b border-cream-200 pb-4">
            <p className="eyebrow">Keamanan</p>
            <h2 className="mt-1 font-display text-lg font-normal text-charcoal">Ganti kata sandi</h2>
          </div>
          <InlineError>{passwordError}</InlineError>
          <Field label="Kata sandi baru" htmlFor="pw-next" hint="Minimal 8 karakter">
            <input id="pw-next" type="password" autoComplete="new-password" className="input" value={passwords.next} onChange={(e) => setPasswords({ ...passwords, next: e.target.value })} />
          </Field>
          <Field label="Ulangi kata sandi baru" htmlFor="pw-confirm">
            <input id="pw-confirm" type="password" autoComplete="new-password" className="input" value={passwords.confirm} onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })} />
          </Field>
          <button type="submit" className="btn btn-outline w-full" disabled={savingPassword}>{savingPassword && <Spinner className="h-4 w-4" />}Perbarui kata sandi</button>
        </form>
      </div>
    </>
  );
}
