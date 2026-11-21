# Struktur database NOKARA

PostgreSQL di Supabase. Semua primary key UUID, nilai uang `numeric(14,2)`, status memakai enum, dan setiap tabel memakai RLS.

## ERD

```mermaid
erDiagram
  AUTH_USERS ||--|| PROFILES : "id"
  PROFILES ||--o| STORES : "owner_id"
  PROFILES ||--o{ ADDRESSES : "user_id"
  PROFILES ||--|| CARTS : "user_id"
  PROFILES ||--o{ ORDERS : "buyer_id"
  PROFILES ||--o{ NOTIFICATIONS : "user_id"
  PROFILES ||--o{ ACTIVITY_LOGS : "actor_id"
  CATEGORIES ||--o{ CATEGORIES : "parent_id"
  CATEGORIES ||--o{ PRODUCTS : "category_id"
  STORES ||--o{ PRODUCTS : "store_id"
  PRODUCTS ||--o{ PRODUCT_IMAGES : "product_id"
  CARTS ||--o{ CART_ITEMS : "cart_id"
  PRODUCTS ||--o{ CART_ITEMS : "product_id"
  ORDERS ||--|{ STORE_ORDERS : "order_id"
  STORES ||--o{ STORE_ORDERS : "store_id"
  ORDERS ||--|{ ORDER_ITEMS : "order_id"
  STORE_ORDERS ||--|{ ORDER_ITEMS : "store_order_id"
  PRODUCTS ||--o{ ORDER_ITEMS : "product_id (nullable)"
  ORDERS ||--|| PAYMENTS : "order_id"
  STORE_ORDERS ||--|| COMMISSIONS : "store_order_id"
  ORDERS ||--o{ ORDER_STATUS_HISTORY : "order_id"
  ORDER_ITEMS ||--o| REVIEWS : "order_item_id"
  PRODUCTS ||--o{ REVIEWS : "product_id"

  PROFILES { uuid id PK; text email; text full_name; user_role role; boolean is_active }
  STORES { uuid id PK; uuid owner_id FK; text name; store_status status; text rejection_reason }
  CATEGORIES { uuid id PK; uuid parent_id FK; text name; text slug; boolean is_active }
  PRODUCTS { uuid id PK; uuid store_id FK; uuid category_id FK; numeric price; int stock; product_status status; moderation_status moderation_status; int sold_count }
  ORDERS { uuid id PK; text order_number; uuid buyer_id FK; payment_status payment_status; order_status status; numeric items_subtotal; numeric shipping_total; numeric grand_total }
  STORE_ORDERS { uuid id PK; uuid order_id FK; uuid store_id FK; order_status status; numeric items_subtotal; numeric commission_rate; numeric commission_amount; numeric seller_net }
  ORDER_ITEMS { uuid id PK; uuid store_order_id FK; uuid product_id FK; text product_name; numeric unit_price; int quantity; numeric subtotal }
  PAYMENTS { uuid id PK; uuid order_id FK; text transaction_number; payment_method method; payment_status status; timestamptz paid_at }
  COMMISSIONS { uuid id PK; uuid store_order_id FK; numeric base_amount; numeric rate; numeric amount; commission_status status }
```

## Tabel

| Tabel | Isi | Catatan |
|---|---|---|
| `profiles` | Data pengguna, role, status aktif | 1:1 dengan `auth.users`, dibuat trigger saat registrasi |
| `stores` | Toko penjual | Satu penjual satu toko; status `pending/approved/rejected/suspended` |
| `categories` | Kategori dua tingkat | `parent_id` ke diri sendiri |
| `products` | Produk | `status` diatur penjual, `moderation_status` diatur admin |
| `product_images` | Foto produk | `storage_path` untuk menghapus berkas di Storage |
| `addresses` | Alamat pembeli | Trigger menjaga hanya satu alamat utama |
| `carts`, `cart_items` | Keranjang | Unik per (keranjang, produk) |
| `orders` | **Transaksi utama** | Satu baris per checkout |
| `store_orders` | **Pesanan per toko** (child order) | Menyimpan snapshot nama toko, alamat kirim, tarif dan nilai komisi |
| `order_items` | Item pesanan | Snapshot nama, foto, dan harga saat transaksi |
| `payments` | Pembayaran (simulasi) | 1:1 dengan `orders` |
| `commissions` | Komisi marketplace | 1:1 dengan `store_orders`; `pending → earned / cancelled` |
| `order_status_history` | Riwayat perubahan status | Lingkup `order`, `payment`, `store_order` |
| `reviews` | Ulasan | Satu ulasan per item pesanan |
| `notifications` | Notifikasi | Hanya ditulis oleh fungsi database |
| `activity_logs` | Log tindakan admin | Hanya terbaca admin |
| `app_settings` | Tarif komisi, ongkir, kontak | Satu baris |

## Mengapa ada `orders` dan `store_orders`

Pembeli membayar sekali untuk seluruh keranjang, tetapi setiap toko mengirim barangnya sendiri dengan status sendiri. `orders` mewakili pembayaran; `store_orders` mewakili pengiriman dan pendapatan tiap toko. Status `orders` diturunkan otomatis dari status anak-anaknya oleh fungsi `_sync_order_status`.

Alamat kirim dan nama toko sengaja disalin ke `store_orders`. Dengan begitu penjual tidak perlu (dan tidak diizinkan RLS) membaca baris `orders`, yang memuat total belanja di toko lain.

## Fungsi bisnis (RPC)

| Fungsi | Pemanggil | Tugas |
|---|---|---|
| `add_to_cart`, `set_cart_item_quantity` | Pembeli | Validasi ketersediaan dan stok |
| `checkout(address, method, notes)` | Pembeli | Mengunci baris produk, membaca harga dari database, membuat `orders` + `store_orders` + `order_items` + `commissions` + `payments`, mengosongkan keranjang |
| `simulate_payment(order, success)` | Pembeli pemilik | Mengunci `orders` (`FOR UPDATE`), menolak bila sudah diproses, memeriksa ulang stok, mengurangi stok, menandai komisi `earned` |
| `update_store_order_status` | Penjual / pembeli / admin | Hanya transisi yang sah per role; pembatalan admin mengembalikan stok |
| `submit_review` | Pembeli | Hanya untuk item dari pesanan selesai, satu kali |
| `submit_store_application` | Penjual | Membuat atau mengajukan ulang toko |
| `admin_set_store_status`, `admin_set_user_active`, `admin_moderate_product`, `admin_update_settings` | Admin | Tindakan administratif + log |
| `search_products` | Semua | Pencarian, filter, urutan, paginasi |
| `admin_dashboard_stats`, `seller_dashboard_stats`, `buyer_dashboard_stats`, `sales_report` | Sesuai role | Statistik dihitung dari tabel |
| `promote_to_admin(email)` | SQL Editor / service role | Provisioning admin |

Semua fungsi `SECURITY DEFINER` memakai `set search_path = public, pg_temp` dan memeriksa `auth.uid()` serta role sebelum bekerja. Hak `EXECUTE` dicabut dari `public`/`anon`, lalu diberikan satu per satu.

## Model keamanan

1. **Hak tabel minimum.** Migrasi 0003 mencabut semua hak bawaan `anon` dan `authenticated`, lalu memberi hak per tabel dan **per kolom**. Contoh: klien hanya boleh `UPDATE (full_name, phone, avatar_url)` pada `profiles`, sehingga `role` dan `is_active` tidak tersentuh.
2. **RLS di semua tabel.** Penjual dibatasi oleh `my_store_id()`, pembeli oleh `auth.uid()`, admin oleh `is_admin()`.
3. **Tabel transaksi hanya-baca untuk klien.** `orders`, `store_orders`, `order_items`, `payments`, `commissions` tidak punya hak `INSERT/UPDATE/DELETE` untuk klien; penulisan hanya lewat fungsi di atas.
4. **Komisi dibekukan.** Tarif dan nilai komisi disimpan di `store_orders` dan `commissions` saat checkout; perubahan tarif hanya berlaku untuk transaksi berikutnya.
5. **Storage.** Folder pertama pada path adalah id pemilik (toko atau pengguna), dan itulah yang diperiksa policy.
