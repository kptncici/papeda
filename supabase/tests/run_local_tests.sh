#!/usr/bin/env bash
# Uji otomatis lapisan database NOKARA pada PostgreSQL lokal (bukan Supabase).
# Pakai: bash supabase/tests/run_local_tests.sh
# Syarat: psql/createdb tersedia dan pengguna saat ini adalah superuser PostgreSQL.
set -u
cd "$(dirname "$0")/.."
DB="${NOKARA_TEST_DB:-nokara_test}"
PASS=0; FAIL=0

sys()  { psql -X -q -At -d "$DB" -c "$1" 2>&1; }
as()   { psql -X -q -At -d "$DB" 2>&1 <<SQL
select set_config('request.jwt.claims', '{"sub":"$1","role":"authenticated"}', false) \g /dev/null
set role authenticated;
$2
SQL
}
anon() { psql -X -q -At -d "$DB" 2>&1 <<SQL
set role anon;
$1
SQL
}
ok()   { PASS=$((PASS+1)); printf 'PASS | %s\n' "$1"; }
bad()  { FAIL=$((FAIL+1)); printf 'FAIL | %s\n       -> %s\n' "$1" "$2"; }
eq()   { if [ "$2" = "$3" ]; then ok "$1"; else bad "$1" "dapat [$2], harap [$3]"; fi; }
err()  { if echo "$2" | grep -q "ERROR" && echo "$2" | grep -qi -- "$3"; then ok "$1"; else bad "$1" "harap ERROR berisi [$3], dapat [$2]"; fi; }
noerr(){ if echo "$2" | grep -q "ERROR"; then bad "$1" "$2"; else ok "$1"; fi; }
uid()  { sys "select id from auth.users where email = '$1'"; }
newuser() { sys "insert into auth.users (email, raw_user_meta_data) values ('$1', '$2')" >/dev/null; }

echo "== Menyiapkan database $DB =="
dropdb --if-exists "$DB" && createdb "$DB" || exit 1
for f in tests/00_local_stubs.sql migrations/0001_schema.sql migrations/0002_functions.sql migrations/0003_rls.sql migrations/0004_storage.sql migrations/0005_default_categories.sql; do
  out=$(psql -X -q -v ON_ERROR_STOP=1 -d "$DB" -f "$f" 2>&1) || { echo "GAGAL menjalankan $f"; echo "$out"; exit 1; }
done
ok "Migrasi 0001-0005 berjalan tanpa error"

newuser admin@nokara.test    '{"full_name":"Admin Uji"}'
newuser penjual1@nokara.test '{"full_name":"Penjual Demo Satu","role":"seller"}'
newuser penjual2@nokara.test '{"full_name":"Penjual Demo Dua","role":"seller"}'
newuser penjual3@nokara.test '{"full_name":"Penjual Demo Tiga","role":"seller"}'
newuser penjual4@nokara.test '{"full_name":"Penjual Baru","role":"seller"}'
newuser pembeli1@nokara.test '{"full_name":"Pembeli Demo Satu","role":"buyer"}'
newuser pembeli2@nokara.test '{"full_name":"Pembeli Demo Dua","role":"buyer"}'
newuser pembeli3@nokara.test '{"full_name":"Pembeli Tiga","role":"buyer"}'
newuser pembeli4@nokara.test '{"full_name":"Pembeli Empat","role":"buyer"}'
newuser iseng@nokara.test    '{"full_name":"Iseng","role":"admin"}'
ADMIN=$(uid admin@nokara.test); S1=$(uid penjual1@nokara.test); S2=$(uid penjual2@nokara.test)
S4=$(uid penjual4@nokara.test); B1=$(uid pembeli1@nokara.test); B2=$(uid pembeli2@nokara.test)
B3=$(uid pembeli3@nokara.test); B4=$(uid pembeli4@nokara.test); X=$(uid iseng@nokara.test)
ST1=a0000000-0000-4000-8000-000000000001; ST2=a0000000-0000-4000-8000-000000000002; ST3=a0000000-0000-4000-8000-000000000003
P() { printf 'b0000000-0000-4000-8000-0000000000%02d' "$1"; }

echo "== A. Authentication & role =="
eq   "A1 Registrasi dengan metadata role=admin tetap menjadi buyer" "$(sys "select role from profiles where id='$X'")" "buyer"
eq   "A2 Registrasi penjual menghasilkan role seller" "$(sys "select role from profiles where id='$S4'")" "seller"
eq   "A3 Keranjang dibuat otomatis saat registrasi" "$(sys "select count(*) from carts where user_id='$B3'")" "1"
err  "A4 Pembeli tidak bisa mengubah role sendiri" "$(as $B3 "update profiles set role='admin' where id='$B3';")" "permission denied"
err  "A5 Pembeli tidak bisa mengubah is_active sendiri" "$(as $B3 "update profiles set is_active=true where id='$B3';")" "permission denied"
noerr "A6 Pembeli bisa mengubah nama sendiri" "$(as $B3 "update profiles set full_name='Pembeli Tiga Baru' where id='$B3';")"
eq   "A7 Pembeli tidak bisa membaca profil orang lain" "$(as $B3 "select count(*) from profiles where id<>'$B3';")" "0"
eq   "A8 Pembeli tidak bisa mengubah profil orang lain" "$(as $B3 "update profiles set full_name='x' where id='$B1' returning id;")" ""
err  "A9 promote_to_admin ditolak untuk klien" "$(as $B3 "select promote_to_admin('pembeli3@nokara.test');")" "permission denied"
noerr "A10 promote_to_admin berjalan dari sisi server" "$(sys "select promote_to_admin('admin@nokara.test')")"
eq   "A11 Admin terprovisi" "$(sys "select role from profiles where id='$ADMIN'")" "admin"
err  "A12 Trigger menolak perubahan role walau hak kolom dibuka" "$(sys "grant update(role) on profiles to authenticated" >/dev/null; as $B3 "update profiles set role='admin' where id='$B3';"; sys "revoke update(role) on profiles from authenticated" >/dev/null)" "tidak dapat diubah"

echo "== B. Penjual & toko =="
noerr "B1 Penjual mengajukan toko" "$(as $S4 "select submit_store_application('Toko Uji Empat','desk','Jl. Uji 4','Sorong','Papua Barat Daya','0812000004','p4@t.test');")"
ST4=$(sys "select id from stores where owner_id='$S4'")
eq   "B2 Toko baru berstatus pending" "$(sys "select status from stores where id='$ST4'")" "pending"
eq   "B3 Notifikasi pendaftaran toko + notifikasi admin" "$(sys "select count(*) from notifications where type in ('store_submitted','store_review')")" "2"
err  "B4 Penjual tidak bisa menyetujui tokonya sendiri (update status)" "$(as $S4 "update stores set status='approved' where id='$ST4';")" "permission denied"
err  "B5 Pembeli tidak bisa mengajukan toko" "$(as $B3 "select submit_store_application('Toko Palsu','d','Jl. A 1','Kota','Prov','0812','');")" "hak akses"
CAT=$(sys "select id from categories where slug='gelang'")
err  "B6 Toko pending tidak bisa menambah produk" "$(as $S4 "insert into products (store_id, category_id, name, price, stock) values ('$ST4','$CAT','Produk Uji',10000,5);")" "row-level security"
err  "B7 Non-admin tidak bisa memverifikasi toko" "$(as $S4 "select admin_set_store_status('$ST4','approved');")" "hak akses"
err  "B8 Penolakan toko wajib beralasan" "$(as $ADMIN "select admin_set_store_status('$ST4','rejected','');")" "Alasan"
noerr "B9 Admin menolak toko dengan alasan" "$(as $ADMIN "select admin_set_store_status('$ST4','rejected','Data belum lengkap');")"
noerr "B10 Penjual mengajukan ulang toko yang ditolak" "$(as $S4 "select submit_store_application('Toko Uji Empat','desk baru','Jl. Uji 4','Sorong','Papua Barat Daya','0812000004','');")"
noerr "B11 Admin menyetujui toko" "$(as $ADMIN "select admin_set_store_status('$ST4','approved');")"
eq   "B12 Notifikasi toko disetujui terkirim ke penjual" "$(sys "select count(*) from notifications where user_id='$S4' and type='store_approved'")" "1"
noerr "B13 Toko aktif bisa menambah produk" "$(as $S4 "insert into products (store_id, category_id, name, price, stock) values ('$ST4','$CAT','Gelang Uji Stok Satu',50000,1);")"
PX=$(sys "select id from products where name='Gelang Uji Stok Satu'")
eq   "B14 Notifikasi produk berhasil ditambahkan" "$(sys "select count(*) from notifications where user_id='$S4' and type='product_created'")" "1"
err  "B15 Penjual tidak bisa mengisi moderation_status" "$(as $S4 "insert into products (store_id, category_id, name, price, stock, moderation_status) values ('$ST4','$CAT','Produk Y',1000,1,'approved');")" "permission denied"
err  "B16 Penjual tidak bisa mengubah sold_count/rating" "$(as $S4 "update products set sold_count=999 where id='$PX';")" "permission denied"
err  "B17 Harga nol/negatif ditolak constraint" "$(as $S4 "update products set price=0 where id='$PX';")" "check constraint"
err  "B18 Stok negatif ditolak constraint" "$(as $S4 "update products set stock=-1 where id='$PX';")" "check constraint"

echo "== Seed data demo =="
out=$(psql -X -q -v ON_ERROR_STOP=1 -d "$DB" -f seed.sql 2>&1); noerr "S1 seed.sql berjalan" "$out"
out=$(psql -X -q -v ON_ERROR_STOP=1 -d "$DB" -f seed.sql 2>&1); noerr "S2 seed.sql aman dijalankan ulang" "$out"
eq   "S3 Jumlah data demo (toko/produk/gambar/pesanan) tidak berlipat" "$(sys "select (select count(*) from stores where id in ('$ST1','$ST2','$ST3')) || '/' || (select count(*) from products where store_id in ('$ST1','$ST2','$ST3')) || '/' || (select count(*) from product_images) || '/' || (select count(*) from orders)")" "3/15/15/4"
eq   "S4 Kategori utama minimal 5" "$(sys "select count(*) >= 5 from categories where parent_id is null")" "t"

echo "== C. Akses lintas toko =="
err  "C1 Penjual tidak bisa menambah produk ke toko lain" "$(as $S4 "insert into products (store_id, category_id, name, price, stock) values ('$ST1','$CAT','Produk Susupan',1000,1);")" "row-level security"
eq   "C2 Penjual tidak bisa mengubah harga produk toko lain" "$(as $S4 "update products set price=1 where id='$(P 1)' returning id;")" ""
eq   "C3 Penjual tidak bisa menghapus produk toko lain" "$(as $S4 "delete from products where id='$(P 1)' returning id;")" ""
eq   "C4 Pembeli tidak bisa mengubah harga produk" "$(as $B3 "update products set price=1 where id='$(P 1)' returning id;")" ""
eq   "C5 Pembeli tidak bisa mengubah stok produk" "$(as $B3 "update products set stock=9999 where id='$(P 1)' returning id;")" ""
eq   "C6 Penjual hanya melihat pesanan tokonya" "$(as $S1 "select count(*) from store_orders where store_id<>'$ST1';")" "0"
eq   "C7 Penjual melihat pesanan tokonya sendiri" "$(as $S1 "select count(*) > 0 from store_orders;")" "t"
eq   "C8 Penjual tidak bisa membaca transaksi utama (orders)" "$(as $S1 "select count(*) from orders;")" "0"
eq   "C9 Penjual tidak melihat item pesanan toko lain" "$(as $S1 "select count(*) from order_items where store_id<>'$ST1';")" "0"
eq   "C10 Penjual tidak melihat komisi toko lain" "$(as $S1 "select count(*) from commissions where store_id<>'$ST1';")" "0"
SO2=$(sys "select id from store_orders where store_id='$ST3' and status='processing' limit 1")
err  "C11 Penjual tidak bisa mengubah status pesanan toko lain" "$(as $S1 "select update_store_order_status('$SO2','shipped','X');")" "tidak ditemukan"

echo "== D. Multi-vendor, checkout, pembayaran, komisi =="
eq   "D1 Stok berkurang hanya untuk pesanan yang dibayar (seed)" "$(sys "select string_agg(stock::text, ',' order by id) from products where id in ('$(P 1)','$(P 7)','$(P 13)','$(P 4)','$(P 8)','$(P 12)','$(P 9)')")" "11,14,28,13,20,4,6"
eq   "D2 Komisi 5% tersimpan benar di semua pesanan toko" "$(sys "select count(*) from store_orders where commission_amount <> round(items_subtotal*commission_rate/100,2) or seller_net <> items_subtotal-commission_amount or commission_rate <> 5")" "0"
eq   "D3 Total transaksi = jumlah pesanan toko = jumlah item" "$(sys "select count(*) from orders o where items_subtotal <> (select sum(items_subtotal) from store_orders where order_id=o.id) or items_subtotal <> (select sum(subtotal) from order_items where order_id=o.id) or grand_total <> (select sum(total) from store_orders where order_id=o.id)")" "0"
eq   "D4 Pembayaran gagal: komisi dibatalkan" "$(sys "select count(*) from commissions c join orders o on o.id=c.order_id where o.payment_status='failed' and c.status<>'cancelled'")" "0"
as $B3 "insert into addresses (user_id, recipient_name, phone, address_line, city, province, postal_code, is_default) values ('$B3','Pembeli Tiga','081355550003','Jl. Uji Coba No. 3','Manado','Sulawesi Utara','95111',true);" >/dev/null
AD3=$(sys "select id from addresses where user_id='$B3'")
err  "D5 Tambah ke keranjang melebihi stok ditolak" "$(as $B3 "select add_to_cart('$(P 14)', 99);")" "Stok tidak mencukupi"
err  "D6 Penjual tidak bisa memakai keranjang pembeli" "$(as $S1 "select add_to_cart('$(P 7)', 1);")" "hak akses"
as $B3 "select add_to_cart('$(P 2)', 1); select add_to_cart('$(P 10)', 2); select add_to_cart('$(P 14)', 1);" >/dev/null
eq   "D7 Keranjang memuat produk dari 3 toko" "$(as $B3 "select count(distinct p.store_id) from cart_items ci join products p on p.id=ci.product_id;")" "3"
err  "D8 Checkout dengan alamat milik orang lain ditolak" "$(as $B3 "select checkout('c0000000-0000-4000-8000-000000000001','bank_transfer');")" "Alamat"
O1=$(as $B3 "select checkout('$AD3','bank_transfer','uji');")
eq   "D9 Checkout membuat 1 transaksi utama dengan 3 pesanan toko" "$(sys "select count(*) from store_orders where order_id='$O1'")" "3"
eq   "D10 Total dihitung server: 420000+110000+480000 + ongkir 3x20000" "$(sys "select items_subtotal::int || '/' || shipping_total::int || '/' || grand_total::int from orders where id='$O1'")" "1010000/60000/1070000"
eq   "D11 Komisi tidak memasukkan ongkir (5% x 1.010.000)" "$(sys "select commission_total::int from orders where id='$O1'")" "50500"
eq   "D12 Stok belum berkurang sebelum pembayaran" "$(sys "select string_agg(stock::text, ',' order by id) from products where id in ('$(P 2)','$(P 10)','$(P 14)')")" "6,18,3"
eq   "D13 Keranjang dikosongkan setelah checkout" "$(as $B3 "select count(*) from cart_items;")" "0"
err  "D14 Klien tidak bisa INSERT langsung ke orders" "$(as $B3 "insert into orders (order_number,buyer_id,payment_method,items_subtotal,grand_total) values ('X','$B3','cod',1,1);")" "permission denied"
err  "D15 Klien tidak bisa mengubah harga di order_items" "$(as $B3 "update order_items set unit_price=1 where order_id='$O1';")" "permission denied"
err  "D16 Klien tidak bisa menandai pembayaran lunas secara langsung" "$(as $B3 "update payments set status='paid' where order_id='$O1';")" "permission denied"
err  "D17 Klien tidak bisa memanipulasi komisi" "$(as $S1 "update commissions set amount=0;")" "permission denied"
err  "D18 Pembeli lain tidak bisa membayar pesanan ini" "$(as $B4 "select simulate_payment('$O1', true);")" "tidak ditemukan"
eq   "D19 Simulasi pembayaran berhasil" "$(as $B3 "select simulate_payment('$O1', true)->>'status';")" "paid"
eq   "D20 Stok berkurang setelah pembayaran berhasil" "$(sys "select string_agg(stock::text, ',' order by id) from products where id in ('$(P 2)','$(P 10)','$(P 14)')")" "5,16,2"
err  "D21 Pembayaran tidak bisa diproses dua kali" "$(as $B3 "select simulate_payment('$O1', true);")" "sudah diproses"
eq   "D22 Waktu bayar & riwayat status tersimpan" "$(sys "select (select paid_at is not null from payments where order_id='$O1') || '/' || (select count(*) from order_status_history where order_id='$O1' and scope='payment')")" "true/2"
eq   "D23 Tiap penjual mendapat notifikasi pesanan baru" "$(sys "select count(*) from notifications n join store_orders so on n.link='/seller/pesanan/'||so.id where so.order_id='$O1' and n.type='order_new'")" "3"
SOA=$(sys "select id from store_orders where order_id='$O1' and store_id='$ST1'")
err  "D24 Penjual tidak bisa melompati status (paid -> shipped)" "$(as $S1 "select update_store_order_status('$SOA','shipped','R1');")" "tidak diizinkan"
noerr "D25 Penjual memproses pesanan" "$(as $S1 "select update_store_order_status('$SOA','processing');")"
err  "D26 Pembeli tidak bisa menyelesaikan pesanan yang belum dikirim" "$(as $B3 "select update_store_order_status('$SOA','completed');")" "tidak diizinkan"
noerr "D27 Penjual mengirim pesanan dengan resi" "$(as $S1 "select update_store_order_status('$SOA','shipped','RESI-UJI-1');")"
err  "D28 Penjual tidak bisa menyelesaikan pesanan sendiri" "$(as $S1 "select update_store_order_status('$SOA','completed');")" "tidak diizinkan"
ITEM=$(sys "select id from order_items where store_order_id='$SOA'")
err  "D29 Ulasan ditolak sebelum pesanan selesai" "$(as $B3 "select submit_review('$ITEM',5,'bagus');")" "setelah pesanan selesai"
noerr "D30 Pembeli mengonfirmasi pesanan diterima" "$(as $B3 "select update_store_order_status('$SOA','completed');")"
eq   "D31 Status transaksi utama mengikuti (masih processing)" "$(sys "select status from orders where id='$O1'")" "processing"
noerr "D32 Pembeli memberi ulasan" "$(as $B3 "select submit_review('$ITEM',4,'Bagus');")"
err  "D33 Ulasan ganda ditolak" "$(as $B3 "select submit_review('$ITEM',5,'lagi');")" "sudah mengulas"
err  "D34 Pembeli lain tidak bisa mengulas item ini" "$(as $B4 "select submit_review('$ITEM',1,'x');")" "tidak ditemukan"
eq   "D35 Rating produk diperbarui" "$(sys "select rating_avg::text || '/' || rating_count from products where id='$(P 2)'")" "4.00/1"
SOC=$(sys "select id from store_orders where order_id='$O1' and store_id='$ST3'")
err  "D36 Penjual tidak bisa membatalkan pesanan berbayar" "$(as $S1 "select update_store_order_status('$SOA','cancelled');")" "tidak diizinkan"
noerr "D37 Admin membatalkan pesanan berbayar" "$(as $ADMIN "select update_store_order_status('$SOC','cancelled',null,'uji pembatalan');")"
eq   "D38 Pembatalan admin mengembalikan stok & membatalkan komisi" "$(sys "select (select stock from products where id='$(P 14)') || '/' || (select status from commissions where store_order_id='$SOC')")" "3/cancelled"

echo "== E. Perebutan stok terakhir & tarif komisi =="
as $B4 "insert into addresses (user_id, recipient_name, phone, address_line, city, province, is_default) values ('$B4','Pembeli Empat','081355550004','Jl. Uji Coba No. 4','Ambon','Maluku',true);" >/dev/null
AD4=$(sys "select id from addresses where user_id='$B4'")
as $B3 "select add_to_cart('$PX', 1);" >/dev/null; as $B4 "select add_to_cart('$PX', 1);" >/dev/null
OA=$(as $B3 "select checkout('$AD3','e_wallet');"); OB=$(as $B4 "select checkout('$AD4','e_wallet');")
eq   "E1 Pembeli pertama berhasil membayar unit terakhir" "$(as $B3 "select simulate_payment('$OA', true)->>'status';")" "paid"
eq   "E2 Pembeli kedua gagal karena stok habis" "$(as $B4 "select simulate_payment('$OB', true)->>'status';")" "failed"
eq   "E3 Stok tidak pernah negatif" "$(sys "select stock from products where id='$PX'")" "0"
eq   "E4 Pesanan kedua dibatalkan dengan alasan tersimpan" "$(sys "select o.status || '/' || (p.failure_reason like 'Stok tidak mencukupi%') from orders o join payments p on p.order_id=o.id where o.id='$OB'")" "cancelled/true"
err  "E5 Non-admin tidak bisa mengubah tarif komisi" "$(as $S1 "select admin_update_settings(0, 0, '', '', '');")" "hak akses"
err  "E6 Klien tidak bisa UPDATE app_settings langsung" "$(as $S1 "update app_settings set commission_rate=0;")" "permission denied"
noerr "E7 Admin mengubah tarif komisi menjadi 10%" "$(as $ADMIN "select admin_update_settings(10, 20000, 'halo@nokara.example', '', 'Jayapura');")"
eq   "E8 Transaksi lama tetap memakai tarif 5%" "$(sys "select count(*) from store_orders where commission_rate <> 5")" "0"
as $B4 "select add_to_cart('$(P 6)', 2);" >/dev/null; OC=$(as $B4 "select checkout('$AD4','cod');")
eq   "E9 Transaksi baru memakai tarif 10% (2 x 35.000)" "$(sys "select commission_rate::int || '/' || commission_amount::int || '/' || seller_net::int from store_orders where order_id='$OC'")" "10/7000/63000"
as $ADMIN "select admin_update_settings(5, 20000, 'halo@nokara.example', '', 'Jayapura');" >/dev/null

echo "== F. Admin, moderasi, notifikasi, statistik =="
eq   "F1 Pengunjung (anon) bisa mencari produk; halaman pertama berisi 12" "$(anon "select count(*) from search_products();")" "12"
eq   "F2 total_count pencarian benar (15 demo; produk uji stok 0 tetap tampil)" "$(anon "select max(total_count) from search_products();")" "16"
eq   "F3 Pencarian kata 'noken' (nama produk atau nama toko)" "$(anon "select count(*) from search_products(p_query => 'noken');")" "6"
eq   "F4 Pencarian berdasarkan nama toko" "$(anon "select count(*) from search_products(p_query => 'Manik Lembah');")" "5"
eq   "F5 Filter kategori induk mencakup subkategori" "$(anon "select count(*) from search_products(p_category => (select id from categories where slug='noken-papua'));")" "4"
eq   "F6 Filter rentang harga" "$(anon "select count(*) from search_products(p_min => 100000, p_max => 250000);")" "6"
eq   "F7 Urutan harga terendah" "$(anon "select name from search_products(p_sort => 'price_asc') limit 1;")" "Gantungan Kunci Noken Mini"
eq   "F8 Urutan harga tertinggi" "$(anon "select name from search_products(p_sort => 'price_desc') limit 1;")" "Ukiran Kayu Panel Dinding"
err  "F9 Blokir produk wajib bercatatan" "$(as $ADMIN "select admin_moderate_product('$(P 15)','blocked','');")" "Catatan"
noerr "F10 Admin memblokir produk" "$(as $ADMIN "select admin_moderate_product('$(P 15)','blocked','Foto tidak sesuai');")"
eq   "F11 Produk diblokir hilang dari publik" "$(anon "select count(*) from products where id='$(P 15)';")" "0"
eq   "F12 Produk diblokir tetap terlihat pemilik toko" "$(as $(uid penjual3@nokara.test) "select count(*) from products where id='$(P 15)';")" "1"
err  "F13 Produk diblokir tidak bisa masuk keranjang" "$(as $B3 "select add_to_cart('$(P 15)', 1);")" "tidak tersedia"
as $ADMIN "select admin_moderate_product('$(P 15)','approved');" >/dev/null
err  "F14 Anon tidak bisa membaca orders" "$(anon "select count(*) from orders;")" "permission denied"
err  "F15 Anon tidak bisa membaca profiles" "$(anon "select count(*) from profiles;")" "permission denied"
eq   "F16 Pengguna hanya melihat notifikasinya sendiri" "$(as $B3 "select count(*) from notifications where user_id<>'$B3';")" "0"
err  "F17 Klien tidak bisa membuat notifikasi untuk orang lain" "$(as $B3 "insert into notifications (user_id,type,title) values ('$B1','x','x');")" "permission denied"
noerr "F18 Pengguna menandai notifikasinya dibaca" "$(as $B3 "update notifications set is_read=true where user_id='$B3';")"
err  "F19 Non-admin tidak bisa memanggil statistik admin" "$(as $B3 "select admin_dashboard_stats();")" "hak akses"
eq   "F20 Statistik admin = data tabel (komisi earned)" "$(as $ADMIN "select (admin_dashboard_stats()->>'total_commission')::numeric = (select sum(amount) from commissions where status='earned');")" "t"
eq   "F21 Statistik penjual = data tabel (pendapatan bersih)" "$(as $S1 "select (seller_dashboard_stats()->>'net_income')::numeric;")" "$(sys "select coalesce(sum(seller_net),0) from commissions where store_id='$ST1' and status='earned'")"
eq   "F22 Laporan penjualan penjual hanya memuat tokonya" "$(as $S1 "select jsonb_array_length(sales_report(null,null)->'by_store');")" "1"
eq   "F23 Laporan penjualan admin memuat semua toko" "$(as $ADMIN "select jsonb_array_length(sales_report(null,null)->'by_store') >= 3;")" "t"
eq   "F24 Log aktivitas hanya terbaca admin" "$(as $S1 "select count(*) from activity_logs;")/$(as $ADMIN "select count(*) > 0 from activity_logs;")" "0/t"
err  "F25 Non-admin tidak bisa menambah kategori" "$(as $S1 "insert into categories (name, slug) values ('Kategori Liar','kategori-liar');")" "row-level security"
noerr "F26 Admin menambah kategori" "$(as $ADMIN "insert into categories (name, slug) values ('Kategori Uji','kategori-uji');")"
err  "F27 Admin tidak bisa menonaktifkan dirinya sendiri" "$(as $ADMIN "select admin_set_user_active('$ADMIN', false);")" "akun sendiri"
noerr "F28 Admin menonaktifkan pengguna" "$(as $ADMIN "select admin_set_user_active('$B4', false);")"
err  "F29 Pengguna nonaktif tidak bisa bertransaksi" "$(as $B4 "select add_to_cart('$(P 6)', 1);")" "tidak aktif"
noerr "F30 Admin menangguhkan toko" "$(as $ADMIN "select admin_set_store_status('$ST4','suspended','uji penangguhan');")"
err  "F31 Toko ditangguhkan tidak bisa mengubah produk" "$(as $S4 "insert into products (store_id, category_id, name, price, stock) values ('$ST4','$CAT','Produk Z',1000,1);")" "row-level security"
eq   "F32 Produk toko ditangguhkan hilang dari publik" "$(anon "select count(*) from products where store_id='$ST4';")" "0"

echo "== G. Storage policy (diuji pada stub tabel storage.objects) =="
noerr "G1 Penjual mengunggah ke folder tokonya" "$(as $S1 "insert into storage.objects (bucket_id, name) values ('product-images', '$ST1/p1/a.jpg');")"
err  "G2 Penjual tidak bisa mengunggah ke folder toko lain" "$(as $S1 "insert into storage.objects (bucket_id, name) values ('product-images', '$ST2/p1/a.jpg');")" "row-level security"
err  "G3 Pembeli tidak bisa mengunggah foto produk" "$(as $B3 "insert into storage.objects (bucket_id, name) values ('product-images', '$ST1/p1/b.jpg');")" "row-level security"
eq   "G4 Penjual lain tidak bisa menghapus foto toko ini" "$(as $S2 "delete from storage.objects where name='$ST1/p1/a.jpg' returning id;")" ""
noerr "G5 Pengguna mengunggah foto profil ke foldernya" "$(as $B3 "insert into storage.objects (bucket_id, name) values ('profile-images', '$B3/avatar.png');")"
err  "G6 Pengguna tidak bisa mengunggah ke folder profil orang lain" "$(as $B3 "insert into storage.objects (bucket_id, name) values ('profile-images', '$B1/avatar.png');")" "row-level security"
err  "G7 Anon tidak bisa mengunggah" "$(anon "insert into storage.objects (bucket_id, name) values ('product-images', '$ST1/p1/c.jpg');")" "row-level security"

echo
echo "HASIL: $PASS PASS, $FAIL FAIL"
[ "$FAIL" -eq 0 ]
