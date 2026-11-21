import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MailCheck } from 'lucide-react';
import { supabase, toMessage } from '../../lib/supabase';
import { Field } from '../../components/ui/Field';
import { InlineError, Spinner } from '../../components/ui/Feedback';
import { isEmail } from '../../utils/validators';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setFormError('');
    if (!isEmail(email)) {
      setFieldError('Masukkan alamat email yang valid.');
      return;
    }
    setFieldError('');
    setBusy(true);
    // Tautan di email akan membuka halaman /atur-ulang-sandi di alamat situs ini.
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/atur-ulang-sandi` });
    setBusy(false);
    if (error) setFormError(toMessage(error));
    else setSent(true);
  };

  if (sent) {
    return (
      <div className="container-page flex justify-center py-12">
        <div className="card w-full max-w-md p-8 text-center">
          <MailCheck className="mx-auto h-10 w-10 text-forest-600" />
          <h1 className="mt-4 text-2xl font-semibold">Periksa email Anda</h1>
          <p className="mt-2 text-sm leading-6 text-charcoal-600">
            Jika <strong>{email.trim()}</strong> terdaftar di PAPEDA, kami sudah mengirim tautan untuk membuat kata sandi baru. Periksa juga folder spam. Tautan hanya berlaku sebentar dan hanya bisa dipakai sekali.
          </p>
          <Link to="/masuk" className="btn btn-primary mt-6">Kembali ke halaman masuk</Link>
          <button type="button" className="mt-3 block w-full text-sm font-semibold text-charcoal hover:underline" onClick={() => setSent(false)}>Kirim ke email lain</button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page flex justify-center py-12">
      <div className="card w-full max-w-md p-6 sm:p-8">
        <h1 className="text-3xl font-semibold">Lupa kata sandi</h1>
        <p className="mt-1 text-sm text-charcoal-600">Masukkan email akun Anda. Kami akan mengirim tautan untuk membuat kata sandi baru.</p>
        <form onSubmit={submit} noValidate className="mt-6 space-y-4">
          <InlineError>{formError}</InlineError>
          <Field label="Email" htmlFor="forgot-email" error={fieldError}>
            <input id="forgot-email" type="email" autoComplete="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <button type="submit" className="btn btn-primary w-full" disabled={busy}>{busy && <Spinner className="h-4 w-4" />}Kirim tautan</button>
        </form>
        <Link to="/masuk" className="mt-5 flex items-center justify-center gap-1.5 text-sm font-semibold text-charcoal hover:underline">
          <ArrowLeft className="h-4 w-4" />Kembali ke halaman masuk
        </Link>
      </div>
    </div>
  );
}
