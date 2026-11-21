import { useState } from 'react';
import { Field } from './ui/Field';
import { InlineError, Spinner } from './ui/Feedback';
import { isPhone, isPostalCode, validate } from '../utils/validators';

const EMPTY = { label: 'Rumah', recipient_name: '', phone: '', address_line: '', city: '', province: '', postal_code: '', is_default: false };

/** Formulir alamat untuk halaman Alamat dan modal di Checkout. onSubmit menerima nilai formulir. */
export default function AddressForm({ initial, onSubmit, onCancel, submitLabel = 'Simpan alamat' }) {
  const [values, setValues] = useState({ ...EMPTY, ...initial, postal_code: initial?.postal_code || '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (field) => (event) => setValues({ ...values, [field]: event.target.type === 'checkbox' ? event.target.checked : event.target.value });

  const submit = async (event) => {
    event.preventDefault();
    const found = validate(values, {
      recipient_name: (v) => (v.trim().length < 2 ? 'Isi nama penerima.' : null),
      phone: (v) => (!isPhone(v) ? 'Nomor telepon tidak valid (8 sampai 19 digit).' : null),
      address_line: (v) => (v.trim().length < 5 ? 'Alamat minimal 5 karakter.' : null),
      city: (v) => (v.trim().length < 2 ? 'Isi kota atau kabupaten.' : null),
      province: (v) => (v.trim().length < 2 ? 'Isi provinsi.' : null),
      postal_code: (v) => (v && !isPostalCode(v) ? 'Kode pos harus 5 angka.' : null),
    });
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      await onSubmit(values);
    } catch (error) {
      setFormError(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <InlineError>{formError}</InlineError>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Label alamat" htmlFor="a-label" hint="mis. Rumah, Kantor">
          <input id="a-label" className="input" maxLength={40} value={values.label} onChange={set('label')} />
        </Field>
        <Field label="Nama penerima" htmlFor="a-name" error={errors.recipient_name} required>
          <input id="a-name" className="input" autoComplete="name" value={values.recipient_name} onChange={set('recipient_name')} />
        </Field>
        <Field label="Nomor telepon" htmlFor="a-phone" error={errors.phone} required>
          <input id="a-phone" type="tel" className="input" autoComplete="tel" value={values.phone} onChange={set('phone')} />
        </Field>
        <Field label="Kode pos" htmlFor="a-postal" error={errors.postal_code}>
          <input id="a-postal" inputMode="numeric" maxLength={5} className="input" autoComplete="postal-code" value={values.postal_code} onChange={set('postal_code')} />
        </Field>
      </div>
      <Field label="Alamat lengkap" htmlFor="a-line" error={errors.address_line} required>
        <textarea id="a-line" rows={2} className="input" autoComplete="street-address" value={values.address_line} onChange={set('address_line')} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Kota / kabupaten" htmlFor="a-city" error={errors.city} required>
          <input id="a-city" className="input" value={values.city} onChange={set('city')} />
        </Field>
        <Field label="Provinsi" htmlFor="a-province" error={errors.province} required>
          <input id="a-province" className="input" value={values.province} onChange={set('province')} />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={values.is_default} onChange={set('is_default')} className="h-4 w-4 accent-charcoal" />
        Jadikan alamat utama
      </label>
      <div className="flex justify-end gap-2">
        {onCancel && <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>Batal</button>}
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy && <Spinner className="h-4 w-4" />}{submitLabel}</button>
      </div>
    </form>
  );
}
