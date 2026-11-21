# Laporan pengujian NOKARA

Dijalankan pada 18 November 2026 di lingkungan pengembangan (bukan di proyek Supabase sungguhan).

## Ringkasan

| Lapisan | Cara uji | Hasil |
|---|---|---|
| Database: skema, fungsi, RLS, seed | 132 uji SQL otomatis di PostgreSQL 16 lokal | **PASS 132 / 132** |
| Lapisan service frontend (`src/services`) | 52 uji otomatis terhadap PostgREST 12 lokal dengan RLS aktif | **PASS 52 / 52** |
| Build produksi | `npm run build` | **PASS** |
| Supabase Auth (registrasi, login, logout, konfirmasi email) | perlu proyek Supabase | **NOT TESTED** |
| Supabase Storage (upload sungguhan, batas ukuran, tipe berkas) | perlu proyek Supabase | **NOT TESTED** |
| Edge Functions | perlu proyek Supabase | **NOT TESTED** |
| Antarmuka di browser (klik, formulir, navigasi) | perlu browser | **NOT TESTED** |
| Responsif desktop / tablet / ponsel | perlu browser | **NOT TESTED** |
| Skrip `create-admin` dan `seed:users` | perlu proyek Supabase | **NOT TESTED** |
| Deployment Vercel | perlu akun Vercel | **NOT TESTED** |

### Batas pengujian otomatis

- PostgreSQL lokal memakai **tiruan** skema `auth` dan `storage` (`supabase/tests/00_local_stubs.sql`). `auth.uid()` membaca klaim JWT dengan cara yang sama seperti Supabase, tetapi ini bukan Supabase asli.
- Storage policy diuji pada tabel tiruan `storage.objects`. Logika policy teruji, perilaku API Storage sungguhan tidak.
- Uji lapisan service meniru sesi login dengan JWT buatan sendiri. Query, relasi (embed), RPC, hak kolom, dan RLS teruji lewat PostgREST sungguhan; alur login tidak.
- Komponen React tidak punya uji otomatis. Yang terbukti hanyalah kodenya ter-compile dan fungsi service yang dipanggilnya bekerja.

## Per bagian spesifikasi

| Bagian | Database | Service/API | Browser |
|---|---|---|---|
| A. Authentication: role saat registrasi, proteksi role, provisioning admin | PASS | PASS (baca/ubah profil) | NOT TESTED |
| B. Penjual: pengajuan toko, verifikasi, tambah/ubah/hapus produk, stok | PASS | PASS | NOT TESTED |
| B. Upload foto | PASS (policy, pada stub) | NOT TESTED | NOT TESTED |
| C. Pembeli: katalog, pencarian, filter, detail, keranjang, checkout, pembayaran, riwayat | PASS | PASS | NOT TESTED |
| D. Multi-vendor: beli dari beberapa toko, pemisahan pesanan, akses penjual, komisi, stok | PASS | PASS | NOT TESTED |
| E. Admin: pengguna, verifikasi toko, kategori, moderasi, transaksi, laporan komisi | PASS | PASS | NOT TESTED |
| F. Keamanan: lintas pengguna, lintas toko, manipulasi harga/stok/komisi, perubahan role, RLS | PASS | PASS (sebagian) | tidak relevan |
| F. Keamanan: akses Storage | PASS (pada stub) | NOT TESTED | NOT TESTED |
| G. Responsif | tidak relevan | tidak relevan | NOT TESTED |

## Daftar uji manual sebelum demo

Lakukan setelah terhubung ke Supabase. Tandai sendiri hasilnya.

1. Registrasi pembeli baru, lalu logout dan login kembali.
2. Registrasi penjual baru, ajukan toko, login sebagai admin, setujui toko.
3. Sebagai penjual: tambah produk dengan 2 foto, ubah harga dan stok, hapus satu foto, hapus produk.
4. Coba unggah berkas bukan gambar dan gambar di atas 2 MB; keduanya harus ditolak.
5. Sebagai pembeli: cari produk, pakai filter harga dan urutan, buka detail.
6. Masukkan produk dari 3 toko ke keranjang, ubah jumlah, hapus satu, checkout.
7. Simulasikan pembayaran berhasil; periksa stok berkurang dan tiap penjual mendapat notifikasi.
8. Buat pesanan kedua dan simulasikan gagal; periksa stok tidak berubah.
9. Sebagai penjual: proses, kirim dengan resi. Sebagai pembeli: konfirmasi diterima, tulis ulasan.
10. Sebagai admin: periksa dasbor, laporan komisi, blokir satu produk, nonaktifkan satu pengguna, ubah tarif komisi.
11. Buka `/admin` saat login sebagai pembeli; harus dialihkan.
12. Ulangi langkah 5 sampai 7 di ponsel (atau mode perangkat di DevTools) pada lebar 375 px dan 768 px.
13. Ganti foto profil dan foto toko.

## Keluaran uji database (`npm run test:db`)

```
== Menyiapkan database nokara_test ==
PASS | Migrasi 0001-0005 berjalan tanpa error
== A. Authentication & role ==
PASS | A1 Registrasi dengan metadata role=admin tetap menjadi buyer
PASS | A2 Registrasi penjual menghasilkan role seller
PASS | A3 Keranjang dibuat otomatis saat registrasi
PASS | A4 Pembeli tidak bisa mengubah role sendiri
PASS | A5 Pembeli tidak bisa mengubah is_active sendiri
PASS | A6 Pembeli bisa mengubah nama sendiri
PASS | A7 Pembeli tidak bisa membaca profil orang lain
PASS | A8 Pembeli tidak bisa mengubah profil orang lain
PASS | A9 promote_to_admin ditolak untuk klien
PASS | A10 promote_to_admin berjalan dari sisi server
PASS | A11 Admin terprovisi
PASS | A12 Trigger menolak perubahan role walau hak kolom dibuka
== B. Penjual & toko ==
PASS | B1 Penjual mengajukan toko
PASS | B2 Toko baru berstatus pending
PASS | B3 Notifikasi pendaftaran toko + notifikasi admin
PASS | B4 Penjual tidak bisa menyetujui tokonya sendiri (update status)
PASS | B5 Pembeli tidak bisa mengajukan toko
PASS | B6 Toko pending tidak bisa menambah produk
PASS | B7 Non-admin tidak bisa memverifikasi toko
PASS | B8 Penolakan toko wajib beralasan
PASS | B9 Admin menolak toko dengan alasan
PASS | B10 Penjual mengajukan ulang toko yang ditolak
PASS | B11 Admin menyetujui toko
PASS | B12 Notifikasi toko disetujui terkirim ke penjual
PASS | B13 Toko aktif bisa menambah produk
PASS | B14 Notifikasi produk berhasil ditambahkan
PASS | B15 Penjual tidak bisa mengisi moderation_status
PASS | B16 Penjual tidak bisa mengubah sold_count/rating
PASS | B17 Harga nol/negatif ditolak constraint
PASS | B18 Stok negatif ditolak constraint
== Seed data demo ==
PASS | S1 seed.sql berjalan
PASS | S2 seed.sql aman dijalankan ulang
PASS | S3 Jumlah data demo (toko/produk/gambar/pesanan) tidak berlipat
PASS | S4 Kategori utama minimal 5
== C. Akses lintas toko ==
PASS | C1 Penjual tidak bisa menambah produk ke toko lain
PASS | C2 Penjual tidak bisa mengubah harga produk toko lain
PASS | C3 Penjual tidak bisa menghapus produk toko lain
PASS | C4 Pembeli tidak bisa mengubah harga produk
PASS | C5 Pembeli tidak bisa mengubah stok produk
PASS | C6 Penjual hanya melihat pesanan tokonya
PASS | C7 Penjual melihat pesanan tokonya sendiri
PASS | C8 Penjual tidak bisa membaca transaksi utama (orders)
PASS | C9 Penjual tidak melihat item pesanan toko lain
PASS | C10 Penjual tidak melihat komisi toko lain
PASS | C11 Penjual tidak bisa mengubah status pesanan toko lain
== D. Multi-vendor, checkout, pembayaran, komisi ==
PASS | D1 Stok berkurang hanya untuk pesanan yang dibayar (seed)
PASS | D2 Komisi 5% tersimpan benar di semua pesanan toko
PASS | D3 Total transaksi = jumlah pesanan toko = jumlah item
PASS | D4 Pembayaran gagal: komisi dibatalkan
PASS | D5 Tambah ke keranjang melebihi stok ditolak
PASS | D6 Penjual tidak bisa memakai keranjang pembeli
PASS | D7 Keranjang memuat produk dari 3 toko
PASS | D8 Checkout dengan alamat milik orang lain ditolak
PASS | D9 Checkout membuat 1 transaksi utama dengan 3 pesanan toko
PASS | D10 Total dihitung server: 420000+110000+480000 + ongkir 3x20000
PASS | D11 Komisi tidak memasukkan ongkir (5% x 1.010.000)
PASS | D12 Stok belum berkurang sebelum pembayaran
PASS | D13 Keranjang dikosongkan setelah checkout
PASS | D14 Klien tidak bisa INSERT langsung ke orders
PASS | D15 Klien tidak bisa mengubah harga di order_items
PASS | D16 Klien tidak bisa menandai pembayaran lunas secara langsung
PASS | D17 Klien tidak bisa memanipulasi komisi
PASS | D18 Pembeli lain tidak bisa membayar pesanan ini
PASS | D19 Simulasi pembayaran berhasil
PASS | D20 Stok berkurang setelah pembayaran berhasil
PASS | D21 Pembayaran tidak bisa diproses dua kali
PASS | D22 Waktu bayar & riwayat status tersimpan
PASS | D23 Tiap penjual mendapat notifikasi pesanan baru
PASS | D24 Penjual tidak bisa melompati status (paid -> shipped)
PASS | D25 Penjual memproses pesanan
PASS | D26 Pembeli tidak bisa menyelesaikan pesanan yang belum dikirim
PASS | D27 Penjual mengirim pesanan dengan resi
PASS | D28 Penjual tidak bisa menyelesaikan pesanan sendiri
PASS | D29 Ulasan ditolak sebelum pesanan selesai
PASS | D30 Pembeli mengonfirmasi pesanan diterima
PASS | D31 Status transaksi utama mengikuti (masih processing)
PASS | D32 Pembeli memberi ulasan
PASS | D33 Ulasan ganda ditolak
PASS | D34 Pembeli lain tidak bisa mengulas item ini
PASS | D35 Rating produk diperbarui
PASS | D36 Penjual tidak bisa membatalkan pesanan berbayar
PASS | D37 Admin membatalkan pesanan berbayar
PASS | D38 Pembatalan admin mengembalikan stok & membatalkan komisi
== E. Perebutan stok terakhir & tarif komisi ==
PASS | E1 Pembeli pertama berhasil membayar unit terakhir
PASS | E2 Pembeli kedua gagal karena stok habis
PASS | E3 Stok tidak pernah negatif
PASS | E4 Pesanan kedua dibatalkan dengan alasan tersimpan
PASS | E5 Non-admin tidak bisa mengubah tarif komisi
PASS | E6 Klien tidak bisa UPDATE app_settings langsung
PASS | E7 Admin mengubah tarif komisi menjadi 10%
PASS | E8 Transaksi lama tetap memakai tarif 5%
PASS | E9 Transaksi baru memakai tarif 10% (2 x 35.000)
== F. Admin, moderasi, notifikasi, statistik ==
PASS | F1 Pengunjung (anon) bisa mencari produk; halaman pertama berisi 12
PASS | F2 total_count pencarian benar (15 demo; produk uji stok 0 tetap tampil)
PASS | F3 Pencarian kata 'noken' (nama produk atau nama toko)
PASS | F4 Pencarian berdasarkan nama toko
PASS | F5 Filter kategori induk mencakup subkategori
PASS | F6 Filter rentang harga
PASS | F7 Urutan harga terendah
PASS | F8 Urutan harga tertinggi
PASS | F9 Blokir produk wajib bercatatan
PASS | F10 Admin memblokir produk
PASS | F11 Produk diblokir hilang dari publik
PASS | F12 Produk diblokir tetap terlihat pemilik toko
PASS | F13 Produk diblokir tidak bisa masuk keranjang
PASS | F14 Anon tidak bisa membaca orders
PASS | F15 Anon tidak bisa membaca profiles
PASS | F16 Pengguna hanya melihat notifikasinya sendiri
PASS | F17 Klien tidak bisa membuat notifikasi untuk orang lain
PASS | F18 Pengguna menandai notifikasinya dibaca
PASS | F19 Non-admin tidak bisa memanggil statistik admin
PASS | F20 Statistik admin = data tabel (komisi earned)
PASS | F21 Statistik penjual = data tabel (pendapatan bersih)
PASS | F22 Laporan penjualan penjual hanya memuat tokonya
PASS | F23 Laporan penjualan admin memuat semua toko
PASS | F24 Log aktivitas hanya terbaca admin
PASS | F25 Non-admin tidak bisa menambah kategori
PASS | F26 Admin menambah kategori
PASS | F27 Admin tidak bisa menonaktifkan dirinya sendiri
PASS | F28 Admin menonaktifkan pengguna
PASS | F29 Pengguna nonaktif tidak bisa bertransaksi
PASS | F30 Admin menangguhkan toko
PASS | F31 Toko ditangguhkan tidak bisa mengubah produk
PASS | F32 Produk toko ditangguhkan hilang dari publik
== G. Storage policy (diuji pada stub tabel storage.objects) ==
PASS | G1 Penjual mengunggah ke folder tokonya
PASS | G2 Penjual tidak bisa mengunggah ke folder toko lain
PASS | G3 Pembeli tidak bisa mengunggah foto produk
PASS | G4 Penjual lain tidak bisa menghapus foto toko ini
PASS | G5 Pengguna mengunggah foto profil ke foldernya
PASS | G6 Pengguna tidak bisa mengunggah ke folder profil orang lain
PASS | G7 Anon tidak bisa mengunggah
HASIL: 132 PASS, 0 FAIL
```

## Keluaran uji lapisan service (`node tests/api/run.mjs`)

```
== Publik (anon) ==
PASS | listCategories + buildCategoryTree: 5 kategori utama
PASS | searchProducts: 15 produk, 12 per halaman
PASS | searchProducts: kata kunci + urutan harga
PASS | searchProducts: halaman 2
PASS | getProduct: memuat toko, kategori, gambar
PASS | listProductReviews
PASS | getStore + listStores
PASS | getSettings
PASS | anon tidak bisa membaca keranjang
== Pembeli ==
PASS | profil sendiri terbaca (query AuthContext)
PASS | updateProfile nama & telepon
PASS | updateProfile tidak bisa mengubah role
PASS | addToCart + getCartItems (produk, toko, gambar)
PASS | setCartItemQuantity
PASS | setCartItemQuantity melebihi stok ditolak
PASS | removeCartItem
PASS | createAddress / updateAddress / setDefaultAddress / listAddresses
PASS | createAddress dengan kode pos salah ditolak constraint
PASS | checkout 2 toko lalu getOrder (payment, store_orders, items)
PASS | simulatePayment berhasil
PASS | simulatePayment kedua ditolak
PASS | listMyOrders memuat pesanan + item
PASS | listOrderHistory
PASS | getBuyerStats
PASS | listReviewableItems memuat ulasan yang sudah ada
PASS | notifikasi: list, countUnread, markRead, markAllRead, delete
PASS | pembeli tidak bisa memanggil statistik admin
== Penjual ==
PASS | toko sendiri terbaca (query AuthContext)
PASS | getSellerStats
PASS | getSalesReport penjual
PASS | listStoreProducts + getStoreProduct
PASS | saveProduct (tambah, tanpa foto) lalu ubah harga & stok
PASS | deleteProduct
PASS | saveProduct ke toko lain ditolak RLS
PASS | listStoreOrders (filter paid) + getStoreOrder + riwayat
PASS | updateStoreOrderStatus: diproses lalu dikirim
PASS | updateStore (deskripsi)
PASS | updateStore tidak bisa mengubah status
PASS | submitStoreApplication (penjual baru)
PASS | pembeli mengonfirmasi diterima lalu submitReview
== Admin ==
PASS | getAdminStats
PASS | listUsers (filter role & cari email)
PASS | setUserActive: nonaktifkan lalu aktifkan
PASS | listStoresForAdmin (embed pemilik) + setStoreStatus
PASS | kategori: create, update, delete
PASS | deleteCategory yang masih dipakai ditolak
PASS | listProductsForAdmin + moderateProduct
PASS | listTransactions (embed pembeli, pembayaran, pesanan toko)
PASS | listAllStoreOrders
PASS | listCommissions (embed pesanan toko)
PASS | getSalesReport admin
PASS | updateSettings + listActivityLogs
HASIL: 52 PASS, 0 FAIL
```
