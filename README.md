# NOKARA – Noken & Karya Papua

*Connecting Papuan Crafts to the World.*

Marketplace multi-vendor untuk kerajinan khas Papua. Dibangun dengan React + Vite + Tailwind CSS di frontend dan Supabase (Auth, PostgreSQL + RLS, Storage, Edge Functions) di backend. Dibuat sebagai prototipe tugas PBL mata kuliah E-Commerce.

> **Status jujur:** lapisan database dan lapisan service frontend sudah diuji otomatis di PostgreSQL + PostgREST lokal, dan build produksi lolos. Login Supabase Auth, upload Storage, Edge Functions, dan tampilan di browser **belum** diuji di proyek Supabase sungguhan. Rinciannya ada di [docs/TESTING.md](docs/TESTING.md). Jalankan daftar uji manual di sana sebelum demo.

## Isi

1. [Fitur](#fitur)
2. [Instalasi](#instalasi)
3. [Konfigurasi Supabase](#konfigurasi-supabase)
4. [Membuat akun admin secara aman](#membuat-akun-admin-secara-aman)
5. [Data demonstrasi](#data-demonstrasi)
6. [Menjalankan aplikasi](#menjalankan-aplikasi)
7. [Edge Functions (opsional)](#edge-functions-opsional)
8. [Deployment ke Vercel](#deployment-ke-vercel)
9. [Pengujian](#pengujian)
10. [Struktur folder](#struktur-folder)
11. [Keterbatasan yang diketahui](#keterbatasan-yang-diketahui)

## Fitur

| Role | Fitur |
|---|---|
| Publik | Beranda, katalog dengan pencarian/filter/urutan/paginasi di database, kategori dan subkategori, detail produk, profil toko, tentang, kontak, 404 |
| Pembeli | Registrasi, login, profil + foto, alamat, keranjang lintas toko, checkout, simulasi pembayaran, konfirmasi pesanan, riwayat dan pelacakan pesanan, konfirmasi diterima, rating dan ulasan, notifikasi |
| Penjual | Pengajuan toko, dasbor statistik, profil dan pengaturan toko + foto, CRUD produk dengan banyak foto, stok dan harga, pesanan toko, pembaruan status + resi, laporan penjualan, komisi dan pendapatan bersih, notifikasi |
| Admin | Dasbor statistik + grafik, manajemen pengguna, verifikasi toko, kategori, moderasi produk, transaksi, pesanan (termasuk pembatalan dengan pengembalian stok), laporan penjualan, laporan komisi, log aktivitas, pengaturan komisi/ongkir/kontak |

Alur multi-vendor: satu keranjang → satu transaksi utama (`orders`) → satu pesanan per toko (`store_orders`) → item dengan snapshot nama dan harga (`order_items`) → komisi per pesanan toko (`commissions`). Penjelasan lengkap: [docs/DATABASE.md](docs/DATABASE.md).

## Instalasi

Butuh Node.js 20.6 atau lebih baru.

```bash
npm install
cp .env.example .env.local
```

## Konfigurasi Supabase

1. Buat proyek di <https://supabase.com>.
2. Buka **SQL Editor**, lalu jalankan isi berkas berikut **satu per satu, berurutan**:
   1. `supabase/migrations/0001_schema.sql`
   2. `supabase/migrations/0002_functions.sql`
   3. `supabase/migrations/0003_rls.sql`
   4. `supabase/migrations/0004_storage.sql`
   5. `supabase/migrations/0005_default_categories.sql`

   (Dengan Supabase CLI: `supabase link --project-ref <ref>` lalu `supabase db push`.)
3. Buka **Project Settings → API**. Salin *Project URL* dan *anon public key* ke `.env.local`:

   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=...
   ```
4. Untuk demo, buka **Authentication → Providers → Email** dan matikan *Confirm email* supaya akun baru bisa langsung login. Bila dibiarkan menyala, aplikasi menampilkan pesan "Periksa email Anda" setelah registrasi.
5. Pastikan tiga bucket (`product-images`, `store-images`, `profile-images`) muncul di menu **Storage**. Bucket dibuat oleh migrasi 0004.

**Jangan pernah** menaruh `service_role` key di `.env.local` atau di Vercel. Frontend hanya memakai anon key; semua pembatasan akses ditegakkan RLS.

## Membuat akun admin secara aman

Formulir registrasi hanya menghasilkan pembeli atau penjual. Trigger `handle_new_user` mengabaikan nilai role lain, dan kolom `role` tidak bisa diubah dari klien. Admin dibuat dari sisi server dengan salah satu cara:

**Cara A – skrip (disarankan)**

```bash
cp .env.scripts.example .env.scripts   # isi SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL, ADMIN_PASSWORD
npm run create-admin
```

`.env.scripts` sudah masuk `.gitignore` dan tidak ikut ter-bundle. Hapus `ADMIN_PASSWORD` dari berkas itu setelah selesai.

**Cara B – SQL Editor**

Daftar seperti biasa lewat aplikasi (atau menu Authentication → Add user), lalu jalankan:

```sql
select public.promote_to_admin('email-anda@contoh.com');
```

Fungsi ini menolak dipanggil dari sesi pengguna aplikasi; hanya berjalan dari SQL Editor atau service role.

## Data demonstrasi

Data demo bersifat **fiktif**: nama toko, produk, alamat, dan daerah asal hanya contoh. Gambar produk demo adalah **ilustrasi SVG sederhana**, bukan foto asli. Ganti dengan foto produk sungguhan melalui menu Produk di dasbor penjual sebelum presentasi bila memungkinkan.

```bash
# 1. isi DEMO_PASSWORD (min. 8 karakter) di .env.scripts
npm run seed:users
# 2. jalankan isi supabase/seed.sql di SQL Editor
```

Akun yang dibuat (password = `DEMO_PASSWORD`): `penjual1@nokara.test`, `penjual2@nokara.test`, `penjual3@nokara.test`, `pembeli1@nokara.test`, `pembeli2@nokara.test`.

Seed membuat 3 toko, 15 produk, 2 alamat, dan 4 transaksi (lunas multi-toko, selesai + ulasan, menunggu pembayaran, gagal). Pesanan dibuat lewat fungsi bisnis yang sama dengan aplikasi, jadi stok, komisi, dan notifikasinya konsisten. Seed aman dijalankan ulang.

## Menjalankan aplikasi

```bash
npm run dev        # http://localhost:5173
npm run build      # build produksi ke dist/
npm run preview    # melihat hasil build
```

## Edge Functions (opsional)

Aplikasi berfungsi penuh tanpa Edge Functions. Dua fungsi berikut menambah kemampuan admin:

| Fungsi | Kegunaan |
|---|---|
| `admin-set-user-status` | Selain menonaktifkan profil, juga memblokir login pengguna di Supabase Auth |
| `cleanup-orphan-images` | Menghapus berkas `product-images` yang tidak lagi dirujuk produk |

```bash
supabase functions deploy admin-set-user-status
supabase functions deploy cleanup-orphan-images
```

Lalu set `VITE_ENABLE_EDGE_FUNCTIONS=true` dan jalankan ulang/redeploy frontend. Kedua fungsi memeriksa bahwa pemanggil adalah admin sebelum memakai service role.

## Deployment ke Vercel

1. Unggah proyek ke GitHub (pastikan `.env.local` dan `.env.scripts` tidak ikut).
2. Di Vercel: **Add New → Project**, pilih repo. Framework terdeteksi sebagai Vite (build `npm run build`, output `dist`).
3. Tambahkan Environment Variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, dan opsional `VITE_ENABLE_EDGE_FUNCTIONS`.
4. Deploy. `vercel.json` sudah mengarahkan semua rute ke `index.html` supaya rute React Router tidak 404 saat di-refresh.
5. Di Supabase **Authentication → URL Configuration**, isi *Site URL* dengan domain Vercel Anda.

## Pengujian

```bash
npm run test:db                                   # 132 uji SQL: RLS, checkout, pembayaran, komisi (butuh PostgreSQL lokal)
POSTGREST_BIN=/path/postgrest bash tests/api/setup_local_api.sh && node tests/api/run.mjs   # 52 uji lapisan service
```

Hasil terakhir, cakupan, bagian yang belum diuji, dan daftar uji manual untuk demo: [docs/TESTING.md](docs/TESTING.md).

## Struktur folder

```
nokara/
├── public/demo/            ilustrasi produk demo + placeholder
├── scripts/                create-admin.mjs, seed-demo-users.mjs (service role, lokal saja)
├── src/
│   ├── components/         Navbar, Footer, ProductCard, BarChart, AddressForm, ui/...
│   ├── contexts/           AuthContext, CartContext, ToastContext
│   ├── hooks/              useAsync
│   ├── layouts/            PublicLayout, DashboardLayout
│   ├── lib/                supabase.js (klien + penerjemah pesan error)
│   ├── pages/              public/ buyer/ seller/ admin/ shared/
│   ├── routes/             AppRoutes, guards (RequireRole, RequireActiveStore)
│   ├── services/           catalog, cart, addresses, orders, seller, admin, storage, notifications, profile
│   ├── styles/             index.css (Tailwind + kelas komponen)
│   └── utils/              format, validators
├── supabase/
│   ├── migrations/         0001–0005
│   ├── functions/          Edge Functions
│   ├── tests/              stub lokal + run_local_tests.sh
│   └── seed.sql
├── tests/api/              uji lapisan service terhadap PostgREST lokal
└── docs/                   DATABASE.md (ERD), ARSITEKTUR.md, TESTING.md
```

## Keterbatasan yang diketahui

- **Pembayaran adalah simulasi.** Tidak ada payment gateway. Ketiga metode (transfer, e-wallet, COD) memakai halaman simulasi yang sama.
- **Ongkos kirim tarif tetap per toko** (default Rp20.000, bisa diubah admin). Belum ada integrasi kurir.
- **Halaman "Manajemen produk" dan "Moderasi produk" admin digabung** menjadi satu halaman dengan filter.
- **Tidak ada pembatalan oleh pembeli** setelah checkout selain lewat tombol simulasi gagal. Pembatalan pesanan berbayar hanya oleh admin.
- **Penyimpanan produk + foto bukan satu transaksi database.** Jika upload foto gagal di tengah, data produk bisa tersimpan tanpa foto; formulir memberi tahu dan produk bisa diubah ulang.
- **Lupa kata sandi** belum dibuat (ganti kata sandi tersedia setelah login).
- **Dokumen akademik** (BMC, analisis bisnis, strategi digital marketing) tidak termasuk; [docs/ARSITEKTUR.md](docs/ARSITEKTUR.md) menyediakan arsitektur, flowchart, DFD, dan kebutuhan sistem sebagai bahan.
