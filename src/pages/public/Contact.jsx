import { Mail, MapPin, Phone } from 'lucide-react';
import { useAsync } from '../../hooks/useAsync';
import { getSettings } from '../../services/catalog';
import { DataState } from '../../components/ui/Feedback';

export default function Contact() {
  const state = useAsync(getSettings, []);
  return (
    <div className="container-page py-10 md:py-16">
      <header className="mb-10 border-b border-cream-300 pb-6">
        <p className="eyebrow">Layanan &amp; Kemitraan</p>
        <h1 className="mt-2 font-display text-3xl font-light tracking-tight text-charcoal sm:text-5xl">
          Hubungi <span className="font-serif text-[1.08em] font-normal italic text-charcoal">Kami</span>
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-charcoal-600">
          Ada pertanyaan seputar pesanan, verifikasi toko pengrajin, atau kolaborasi? Tim pengelola siap membantu melalui saluran resmi berikut.
        </p>
      </header>

      <DataState state={state}>
        {(settings) => (
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="card p-6 transition-colors hover:border-charcoal">
              <div className="flex items-center justify-between border-b border-cream-200 pb-4">
                <span className="flex h-10 w-10 items-center justify-center border border-cream-300 bg-cream-50 text-earth-500">
                  <Mail className="h-5 w-5" strokeWidth={1.5} />
                </span>
                <span className="font-serif text-sm italic text-charcoal-400">01</span>
              </div>
              <p className="mt-5 text-[11px] font-semibold uppercase tracking-eyebrow text-charcoal-400">Surat Elektronik</p>
              {settings?.contact_email ? (
                <a
                  href={`mailto:${settings.contact_email}`}
                  className="mt-1.5 block break-all font-display text-lg font-bold text-charcoal hover:text-earth-500 hover:underline"
                >
                  {settings.contact_email}
                </a>
              ) : (
                <p className="mt-1.5 font-display text-lg font-bold text-charcoal">Belum diisi</p>
              )}
            </div>

            <div className="card p-6 transition-colors hover:border-charcoal">
              <div className="flex items-center justify-between border-b border-cream-200 pb-4">
                <span className="flex h-10 w-10 items-center justify-center border border-cream-300 bg-cream-50 text-earth-500">
                  <Phone className="h-5 w-5" strokeWidth={1.5} />
                </span>
                <span className="font-serif text-sm italic text-charcoal-400">02</span>
              </div>
              <p className="mt-5 text-[11px] font-semibold uppercase tracking-eyebrow text-charcoal-400">Telepon / WhatsApp</p>
              {settings?.contact_phone ? (
                <a
                  href={`tel:${settings.contact_phone}`}
                  className="mt-1.5 block font-display text-lg font-bold text-charcoal hover:text-earth-500 hover:underline"
                >
                  {settings.contact_phone}
                </a>
              ) : (
                <p className="mt-1.5 font-display text-lg font-bold text-charcoal">Belum diisi</p>
              )}
            </div>

            <div className="card p-6 transition-colors hover:border-charcoal">
              <div className="flex items-center justify-between border-b border-cream-200 pb-4">
                <span className="flex h-10 w-10 items-center justify-center border border-cream-300 bg-cream-50 text-earth-500">
                  <MapPin className="h-5 w-5" strokeWidth={1.5} />
                </span>
                <span className="font-serif text-sm italic text-charcoal-400">03</span>
              </div>
              <p className="mt-5 text-[11px] font-semibold uppercase tracking-eyebrow text-charcoal-400">Lokasi Operasional</p>
              <p className="mt-1.5 font-display text-lg font-bold text-charcoal">
                {settings?.contact_address || 'Jayapura, Papua'}
              </p>
            </div>
          </div>
        )}
      </DataState>

      <p className="mt-8 border-l-2 border-earth-500 pl-4 text-xs leading-relaxed text-charcoal-600">
        Untuk pertanyaan mengenai ketersediaan atau detail spesifik suatu karya, Anda dapat menghubungi pengrajinnya secara langsung melalui tombol WhatsApp atau Email yang tertera di halaman profil masing-masing toko.
      </p>
    </div>
  );
}
