import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey && !url.includes('xxxxxxxx'));
export const edgeFunctionsEnabled = import.meta.env.VITE_ENABLE_EDGE_FUNCTIONS === 'true';

// Hanya anon key yang dipakai di browser. Seluruh pembatasan akses ditegakkan oleh RLS.
export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;

const MESSAGES = [
  [/invalid login credentials/i, 'Email atau kata sandi salah.'],
  [/email not confirmed/i, 'Email belum dikonfirmasi. Buka tautan konfirmasi di kotak masuk Anda.'],
  [/user already registered/i, 'Email ini sudah terdaftar. Silakan masuk.'],
  [/password should be at least/i, 'Kata sandi terlalu pendek.'],
  [/banned/i, 'Akun Anda dinonaktifkan oleh admin.'],
  [/rate limit|too many requests/i, 'Terlalu banyak percobaan. Coba lagi beberapa saat.'],
  [/failed to fetch|networkerror/i, 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.'],
  [/row-level security|permission denied/i, 'Anda tidak memiliki izin untuk tindakan ini.'],
  [/stores_name_unique_idx/i, 'Nama toko sudah digunakan.'],
  [/categories_slug_key/i, 'Slug kategori sudah digunakan.'],
  [/violates foreign key constraint/i, 'Data ini masih dipakai oleh data lain sehingga tidak dapat dihapus.'],
  [/violates check constraint/i, 'Ada isian yang tidak valid. Periksa kembali formulir.'],
  [/mime type .* is not supported/i, 'Format file tidak didukung. Gunakan JPG, PNG, atau WebP.'],
  [/exceeded the maximum allowed size/i, 'Ukuran file melebihi batas.'],
];

export function toMessage(error) {
  const raw = error?.message || String(error || 'Terjadi kesalahan.');
  const found = MESSAGES.find(([pattern]) => pattern.test(raw));
  return found ? found[1] : raw;
}

/** Membuka hasil supabase-js: melempar Error berbahasa Indonesia bila gagal. */
export function unwrap({ data, error }) {
  if (error) throw new Error(toMessage(error));
  return data;
}

/** Relasi satu-ke-satu dari PostgREST bisa berupa objek atau array berisi satu elemen. */
export const one = (value) => (Array.isArray(value) ? value[0] ?? null : value ?? null);
