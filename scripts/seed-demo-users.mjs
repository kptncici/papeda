// Membuat akun demo lewat Supabase Auth. Setelah ini jalankan supabase/seed.sql di SQL Editor.
// Password semua akun demo diambil dari DEMO_PASSWORD di .env.scripts.
import { ensureUser } from './_client.mjs';

const password = process.env.DEMO_PASSWORD || '';
if (password.length < 8) { console.error('DEMO_PASSWORD minimal 8 karakter.'); process.exit(1); }

const USERS = [
  { email: 'penjual1@nokara.test', fullName: 'Penjual Demo Satu', role: 'seller' },
  { email: 'penjual2@nokara.test', fullName: 'Penjual Demo Dua', role: 'seller' },
  { email: 'penjual3@nokara.test', fullName: 'Penjual Demo Tiga', role: 'seller' },
  { email: 'pembeli1@nokara.test', fullName: 'Pembeli Demo Satu', role: 'buyer' },
  { email: 'pembeli2@nokara.test', fullName: 'Pembeli Demo Dua', role: 'buyer' },
];

try {
  for (const user of USERS) {
    const result = await ensureUser({ ...user, password });
    console.log(`${result.created ? 'dibuat ' : 'sudah ada'} | ${user.role.padEnd(6)} | ${user.email}`);
  }
  console.log('\nSelesai. Lanjutkan dengan menjalankan supabase/seed.sql di SQL Editor.');
} catch (error) {
  console.error('Gagal membuat akun demo:', error.message);
  process.exit(1);
}
