// Klien admin untuk skrip lokal. Memakai SERVICE ROLE KEY, jadi hanya boleh dijalankan
// dari komputer Anda melalui "node --env-file=.env.scripts", tidak pernah dari frontend.
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY belum diisi. Salin .env.scripts.example menjadi .env.scripts lalu lengkapi.');
  process.exit(1);
}
export const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

/** Membuat akun lewat Supabase Auth; bila email sudah ada, akun lama dipakai. Mengembalikan user id. */
export async function ensureUser({ email, password, fullName, role }) {
  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { full_name: fullName, role },
  });
  if (!error) return { id: data.user.id, created: true };
  if (!/already|registered|exists/i.test(error.message)) throw error;
  const { data: profile, error: profileError } = await admin.from('profiles').select('id').eq('email', email).maybeSingle();
  if (profileError || !profile) throw new Error(`Akun ${email} sudah ada tetapi profilnya tidak ditemukan.`);
  return { id: profile.id, created: false };
}
