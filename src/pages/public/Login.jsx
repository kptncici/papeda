import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, homePathFor } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Field } from '../../components/ui/Field';
import { InlineError, Spinner } from '../../components/ui/Feedback';
import { isEmail, validate } from '../../utils/validators';

export default function Login() {
  const { signIn } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    const found = validate(values, {
      email: (v) => (!isEmail(v) ? 'Masukkan alamat email yang valid.' : null),
      password: (v) => (!v ? 'Masukkan kata sandi.' : null),
    });
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      const profile = await signIn(values.email, values.password);
      toast.success(`Selamat datang, ${profile.full_name || 'kembali'}.`);
      const from = location.state?.from;
      navigate(from && profile.role === 'buyer' ? from : profile.role === 'buyer' ? '/' : homePathFor(profile.role), { replace: true });
    } catch (error) {
      setFormError(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container-page flex justify-center py-12">
      <div className="card w-full max-w-md p-6 sm:p-8">
        <h1 className="text-3xl font-semibold">Masuk</h1>
        <p className="mt-1 text-sm text-charcoal-600">Masuk untuk berbelanja atau mengelola toko Anda.</p>
        <form onSubmit={submit} noValidate className="mt-6 space-y-4">
          <InlineError>{formError}</InlineError>
          <Field label="Email" htmlFor="email" error={errors.email}>
            <input id="email" type="email" autoComplete="email" className="input" value={values.email} onChange={(e) => setValues({ ...values, email: e.target.value })} />
          </Field>
          <Field label="Kata sandi" htmlFor="password" error={errors.password}>
            <input id="password" type="password" autoComplete="current-password" className="input" value={values.password} onChange={(e) => setValues({ ...values, password: e.target.value })} />
          </Field>
          <p className="-mt-1 text-right text-sm">
            <Link to="/lupa-sandi" className="font-semibold text-charcoal hover:underline">Lupa kata sandi?</Link>
          </p>
          <button type="submit" className="btn btn-primary w-full" disabled={busy}>{busy && <Spinner className="h-4 w-4" />}Masuk</button>
        </form>
        <p className="mt-5 text-center text-sm text-charcoal-600">
          Belum punya akun? <Link to="/daftar" className="font-semibold text-charcoal hover:underline">Daftar di sini</Link>
        </p>
      </div>
    </div>
  );
}
