// Provisioning admin yang aman:
//   1. akun dibuat lewat Supabase Auth (password di-hash oleh Supabase),
//   2. role dinaikkan oleh fungsi SQL promote_to_admin, yang menolak panggilan dari sesi pengguna biasa.
// Email dan password dibaca dari .env.scripts (ADMIN_EMAIL, ADMIN_PASSWORD), tidak ada di source code.
import { admin, ensureUser } from './_client.mjs';

const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD || '';
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { console.error('ADMIN_EMAIL tidak valid.'); process.exit(1); }
if (password.length < 10) { console.error('ADMIN_PASSWORD minimal 10 karakter.'); process.exit(1); }

try {
  const user = await ensureUser({ email, password, fullName: 'Admin NOKARA', role: 'buyer' });
  const { error } = await admin.rpc('promote_to_admin', { p_email: email });
  if (error) throw error;
  console.log(user.created ? `Akun admin ${email} dibuat.` : `Akun ${email} sudah ada; password TIDAK diubah.`);
  console.log('Role admin aktif. Hapus ADMIN_PASSWORD dari .env.scripts setelah ini.');
} catch (error) {
  console.error('Gagal membuat admin:', error.message);
  process.exit(1);
}
