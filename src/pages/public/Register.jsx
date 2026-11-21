import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { MailCheck, ShoppingBag, Store } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Field } from '../../components/ui/Field';
import { InlineError, Spinner } from '../../components/ui/Feedback';
import { isEmail, isPhone, validate } from '../../utils/validators';

const ROLES = [
  { value: 'buyer', label: 'Pembeli', text: 'Berbelanja kerajinan dari banyak toko.', icon: ShoppingBag },
  { value: 'seller', label: 'Penjual / pengrajin', text: 'Membuka toko dan menjual karya Anda.', icon: Store },
];

export default function Register() {
  const { signUp } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [values, setValues] = useState({
    role: params.get('peran') === 'seller' ? 'seller' : 'buyer', fullName: '', email: '', phone: '', password: '', confirm: '',
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const set = (field) => (event) => setValues({ ...values, [field]: event.target.value });

  const submit = async (event) => {
    event.preventDefault();
    const found = validate(values, {
      fullName: (v) => (v.trim().length < 3 ? 'Nama lengkap minimal 3 karakter.' : null),
      email: (v) => (!isEmail(v) ? 'Masukkan alamat email yang valid.' : null),
      phone: (v) => (v && !isPhone(v) ? 'Nomor telepon tidak valid.' : null),
      password: (v) => (v.length < 8 ? 'Kata sandi minimal 8 karakter.' : null),
      confirm: (v, all) => (v !== all.password ? 'Konfirmasi kata sandi tidak sama.' : null),
    });
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      const result = await signUp(values);
      if (result.needsConfirmation) {
        setConfirmationSent(true);
        return;
      }
      toast.success('Akun berhasil dibuat.');
      navigate(result.profile.role === 'seller' ? '/seller/pengajuan' : '/', { replace: true });
    } catch (error) {
      setFormError(error.message);
    } finally {
      setBusy(false);
    }
  };

  if (confirmationSent) {
    return (
      <div className="container-page flex justify-center py-12">
        <div className="card w-full max-w-md p-8 text-center">
          <MailCheck className="mx-auto h-10 w-10 text-forest-600" />
          <h1 className="mt-4 text-2xl font-semibold">Periksa email Anda</h1>
          <p className="mt-2 text-sm leading-6 text-charcoal-600">Tautan konfirmasi sudah dikirim ke <strong>{values.email}</strong>. Buka tautan itu, lalu masuk ke PAPEDA.</p>
          <Link to="/masuk" className="btn btn-primary mt-6">Ke halaman masuk</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page flex justify-center py-12">
      <div className="card w-full max-w-lg p-6 sm:p-8">
        <h1 className="text-3xl font-semibold">Buat akun</h1>
        <p className="mt-1 text-sm text-charcoal-600">Pilih jenis akun. Akun penjual perlu mengajukan toko dan diverifikasi admin sebelum berjualan.</p>
        <form onSubmit={submit} noValidate className="mt-6 space-y-4">
          <InlineError>{formError}</InlineError>
          <fieldset>
            <legend className="label">Daftar sebagai</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {ROLES.map((role) => (
                <label key={role.value} className={`flex cursor-pointer gap-3 rounded-lg border p-3 ${values.role === role.value ? 'border-charcoal bg-cream-50' : 'border-cream-300 bg-white'}`}>
                  <input type="radio" name="role" value={role.value} checked={values.role === role.value} onChange={set('role')} className="mt-1 accent-charcoal" />
                  <span>
                    <span className="flex items-center gap-1.5 text-sm font-semibold"><role.icon className="h-4 w-4" />{role.label}</span>
                    <span className="mt-0.5 block text-xs text-charcoal-600">{role.text}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <Field label="Nama lengkap" htmlFor="fullName" error={errors.fullName} required>
            <input id="fullName" autoComplete="name" className="input" value={values.fullName} onChange={set('fullName')} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email" htmlFor="email" error={errors.email} required>
              <input id="email" type="email" autoComplete="email" className="input" value={values.email} onChange={set('email')} />
            </Field>
            <Field label="Nomor telepon" htmlFor="phone" error={errors.phone} hint="Opsional">
              <input id="phone" type="tel" autoComplete="tel" className="input" value={values.phone} onChange={set('phone')} />
            </Field>
            <Field label="Kata sandi" htmlFor="password" error={errors.password} hint="Minimal 8 karakter" required>
              <input id="password" type="password" autoComplete="new-password" className="input" value={values.password} onChange={set('password')} />
            </Field>
            <Field label="Ulangi kata sandi" htmlFor="confirm" error={errors.confirm} required>
              <input id="confirm" type="password" autoComplete="new-password" className="input" value={values.confirm} onChange={set('confirm')} />
            </Field>
          </div>
          <button type="submit" className="btn btn-primary w-full" disabled={busy}>{busy && <Spinner className="h-4 w-4" />}Buat akun</button>
        </form>
        <p className="mt-5 text-center text-sm text-charcoal-600">
          Sudah punya akun? <Link to="/masuk" className="font-semibold text-charcoal hover:underline">Masuk</Link>
        </p>
      </div>
    </div>
  );
}
