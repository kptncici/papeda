import { LogoMark } from './Logo';

/** Ditampilkan bila .env.local belum diisi, supaya aplikasi tidak gagal tanpa penjelasan. */
export default function SetupNotice() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="card max-w-xl p-8">
        <LogoMark className="h-12 w-12" />
        <h1 className="mt-4 text-2xl font-semibold">Hubungkan PAPEDA ke Supabase</h1>
        <p className="mt-2 text-sm text-charcoal-600">Aplikasi belum menemukan konfigurasi Supabase. Ikuti langkah berikut, lalu jalankan ulang server pengembangan.</p>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm">
          <li>Salin <code className="rounded bg-cream-200 px-1">.env.example</code> menjadi <code className="rounded bg-cream-200 px-1">.env.local</code>.</li>
          <li>Isi <code className="rounded bg-cream-200 px-1">VITE_SUPABASE_URL</code> dan <code className="rounded bg-cream-200 px-1">VITE_SUPABASE_ANON_KEY</code> dari Supabase, menu Project Settings, bagian API.</li>
          <li>Jalankan berkas di <code className="rounded bg-cream-200 px-1">supabase/migrations</code> secara berurutan di SQL Editor.</li>
          <li>Hentikan lalu jalankan lagi <code className="rounded bg-cream-200 px-1">npm run dev</code>.</li>
        </ol>
        <p className="mt-4 text-sm text-charcoal-600">Panduan lengkap ada di README.md.</p>
      </div>
    </div>
  );
}
