# Arsitektur dan analisis sistem NOKARA

Bahan untuk bagian "backend dan diagram sistem" pada presentasi PBL. Analisis bisnis, Business Model Canvas, dan strategi digital marketing tidak termasuk di sini dan perlu disusun kelompok.

## Arsitektur aplikasi

```mermaid
flowchart LR
  subgraph Klien
    A[React SPA di Vercel<br/>React Router, Context, Tailwind]
  end
  subgraph Supabase
    B[Auth<br/>JWT]
    C[PostgREST API<br/>tabel + RPC]
    D[(PostgreSQL<br/>RLS, fungsi, trigger)]
    E[Storage<br/>3 bucket + policy]
    F[Edge Functions<br/>opsional, service role]
  end
  A -- login/registrasi --> B
  A -- anon key + JWT --> C
  A -- unggah foto --> E
  A -- tindakan admin khusus --> F
  B --> D
  C --> D
  E --> D
  F --> D
```

Tidak ada server backend buatan sendiri. Aturan bisnis yang sensitif (harga, stok, pembayaran, komisi, role) berada di fungsi PostgreSQL, sehingga tidak dapat dilewati dengan memodifikasi kode frontend.

## Flowchart belanja multi-vendor

```mermaid
flowchart TD
  S([Pembeli memilih produk]) --> K[Tambah ke keranjang<br/>add_to_cart: cek stok]
  K --> L{Belanja lagi?}
  L -- ya --> S
  L -- tidak --> C[Checkout: pilih alamat dan metode]
  C --> V{Produk tersedia<br/>dan stok cukup?}
  V -- tidak --> X[Tolak, tampilkan pesan]
  V -- ya --> O[Buat 1 transaksi utama +<br/>1 pesanan per toko + komisi pending]
  O --> P[Halaman simulasi pembayaran]
  P --> R{Hasil simulasi}
  R -- gagal --> G[Pembayaran gagal, pesanan batal,<br/>komisi batal, stok tetap]
  R -- berhasil --> T{Stok masih cukup?}
  T -- tidak --> G
  T -- ya --> U[Stok berkurang, komisi earned,<br/>notifikasi ke tiap penjual]
  U --> W[Penjual: diproses lalu dikirim + resi]
  W --> Y[Pembeli: konfirmasi diterima]
  Y --> Z([Pesanan selesai, pembeli dapat mengulas])
```

## DFD level 0 (diagram konteks)

```mermaid
flowchart LR
  PB[Pembeli] -- data akun, keranjang, pesanan, ulasan --> SYS((Sistem NOKARA))
  SYS -- katalog, status pesanan, notifikasi --> PB
  PJ[Penjual] -- data toko, produk, status pengiriman --> SYS
  SYS -- pesanan masuk, laporan penjualan, pendapatan bersih --> PJ
  AD[Admin] -- verifikasi toko, moderasi, kategori, tarif komisi --> SYS
  SYS -- statistik, laporan komisi, log aktivitas --> AD
```

## DFD level 1

```mermaid
flowchart TB
  PB[Pembeli]; PJ[Penjual]; AD[Admin]
  P1((1. Kelola akun)); P2((2. Kelola toko dan produk)); P3((3. Belanja dan checkout))
  P4((4. Pembayaran simulasi)); P5((5. Pemenuhan pesanan)); P6((6. Laporan dan komisi))
  D1[(profiles)]; D2[(stores, products)]; D3[(carts)]; D4[(orders, store_orders, order_items)]
  D5[(payments, commissions)]; D6[(notifications)]
  PB --> P1 --> D1
  PJ --> P1
  PJ --> P2 --> D2
  AD -- verifikasi, moderasi --> P2
  PB --> P3
  D2 --> P3 --> D3
  P3 --> D4
  PB --> P4 --> D5
  P4 -- kurangi stok --> D2
  P4 --> D6
  PJ --> P5 --> D4
  PB -- konfirmasi diterima --> P5
  P5 --> D6
  D4 --> P6
  D5 --> P6
  P6 --> PJ
  P6 --> AD
```

## Kebutuhan fungsional (ringkas)

| Kode | Kebutuhan | Letak di sistem |
|---|---|---|
| F1 | Registrasi, login, logout, hak akses per role | `AuthContext`, `routes/guards.jsx`, trigger `handle_new_user` |
| F2 | Katalog, pencarian, kategori, detail produk | `pages/public`, fungsi `search_products` |
| F3 | Keranjang dan total otomatis | `CartContext`, `add_to_cart` |
| F4 | Checkout multi-vendor | `pages/buyer/Checkout.jsx`, fungsi `checkout` |
| F5 | Simulasi pembayaran dan konfirmasi pesanan | `pages/buyer/Payment.jsx`, fungsi `simulate_payment` |
| F6 | Pengelolaan stok | Form produk penjual; pengurangan otomatis saat pembayaran |
| F7 | Pengelolaan status pesanan | Fungsi `update_store_order_status` |
| F8 | Verifikasi toko dan moderasi | `pages/admin/Stores.jsx`, `Products.jsx` |
| F9 | Komisi dan laporan | `commissions`, fungsi `sales_report` |
| F10 | Notifikasi | Tabel `notifications`, ditulis fungsi database |

## Kebutuhan nonfungsional (ringkas)

| Aspek | Penerapan |
|---|---|
| Keamanan | RLS semua tabel, hak kolom minimum, fungsi dengan validasi role, tanpa secret di frontend |
| Integritas data | Foreign key, CHECK constraint, transaksi database, penguncian baris saat checkout dan pembayaran |
| Responsif | Tailwind, navigasi seluler, tabel dapat digulir mendatar |
| Kemudahan pengembangan | Lapisan `services` terpisah dari halaman, migrasi SQL bernomor, uji otomatis |
| Aksesibilitas | Label formulir, fokus keyboard terlihat, `prefers-reduced-motion` dihormati |
