import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LinkIcon } from 'lucide-react';
import { useAuth, homePathFor } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { changePassword } from '../../services/profile';
import { toMessage } from '../../lib/supabase';
import { Field } from '../../components/ui/Field';
import { InlineError, PageLoader, Spinner } from '../../components/ui/Feedback';

/**
 * Halaman tujuan tautan di email "lupa kata sandi".
 * Supabase membaca token dari URL dan membuat sesi sementara; setelah itu
 * pengguna cukup mengisi kata sandi baru.
 */
export default function ResetPassword() {
  const { session, profile, loading } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  // Dibaca sekali saat halaman dibuka, sebelum Supabase membersihkan URL.
  const [linkError] = useState(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    return params.get('error_description') || params.get('error') || '';
  });
  const [values, setValues] = useState({ password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    const found = {};
    if (values.password.length < 8) found.password = 'Kata sandi minimal 8 karakter.';
    if (values.confirm !== values.password) found.confirm = 'Konfirmasi kata sandi tidak sama.';
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      await changePassword(values.password);
      toast.success('Kata sandi baru tersimpan. Anda sudah masuk.');
      navigate(profile?.role && profile.role !== 'buyer' ? homePathFor(profile.role) : '/', { replace: true });
    } catch (error) {
      setFormError(toMessage(error));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <PageLoader label="Memeriksa tautan" />;

  if (!session) {
    return (
      <div className="container-page flex justify-center py-12">
        <div className="card w-full max-w-md p-8 text-center">
          <LinkIcon className="mx-auto h-10 w-10 text-earth-400" strokeWidth={1.5} />
          <h1 className="mt-4 text-2xl font-semibold">Tautan tidak berlaku</h1>
          <p className="mt-2 text-sm leading-6 text-charcoal-600">
            Tautan atur ulang kata sandi ini sudah kedaluwarsa, sudah pernah dipakai, atau tidak lengkap. Minta tautan baru untuk melanjutkan.
          </p>
          {linkError && <p className="mt-2 text-xs text-charcoal-400">Keterangan: {linkError.replace(/\+/g, ' ')}</p>}
          <Link to="/lupa-sandi" className="btn btn-primary mt-6">Minta tautan baru</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page flex justify-center py-12">
      <div className="card w-full max-w-md p-6 sm:p-8">
        <h1 className="text-3xl font-semibold">Buat kata sandi baru</h1>
        <p className="mt-1 text-sm text-charcoal-600">Untuk akun <strong>{session.user.email}</strong>.</p>
        <form onSubmit={submit} noValidate className="mt-6 space-y-4">
          <InlineError>{formError}</InlineError>
          <Field label="Kata sandi baru" htmlFor="reset-password" error={errors.password} hint="Minimal 8 karakter">
            <input id="reset-password" type="password" autoComplete="new-password" className="input" value={values.password} onChange={(e) => setValues({ ...values, password: e.target.value })} />
          </Field>
          <Field label="Ulangi kata sandi baru" htmlFor="reset-confirm" error={errors.confirm}>
            <input id="reset-confirm" type="password" autoComplete="new-password" className="input" value={values.confirm} onChange={(e) => setValues({ ...values, confirm: e.target.value })} />
          </Field>
          <button type="submit" className="btn btn-primary w-full" disabled={busy}>{busy && <Spinner className="h-4 w-4" />}Simpan kata sandi baru</button>
        </form>
      </div>
    </div>
  );
}
