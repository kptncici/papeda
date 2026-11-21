-- ============================================================================
-- NOKARA – seed.sql : data demonstrasi (FIKTIF, hanya untuk demo/PBL)
--
-- Urutan pakai:
--   1. Jalankan semua migrasi (0001–0005).
--   2. Buat akun demo lewat Supabase Auth:  npm run seed:users
--      (password diambil dari variabel DEMO_PASSWORD, tidak disimpan di kode)
--   3. Jalankan file ini di SQL Editor.
--
-- Aman dijalankan ulang: toko/produk/alamat memakai UUID tetap + ON CONFLICT,
-- dan pesanan demo hanya dibuat jika pembeli demo belum punya pesanan.
-- Pesanan dibuat melalui fungsi bisnis yang sama dengan aplikasi (add_to_cart,
-- checkout, simulate_payment, ...), jadi stok, komisi, dan notifikasi konsisten.
-- ============================================================================
do $$
declare
  v_s1 uuid; v_s2 uuid; v_s3 uuid; v_b1 uuid; v_b2 uuid;
  st1 constant uuid := 'a0000000-0000-4000-8000-000000000001';
  st2 constant uuid := 'a0000000-0000-4000-8000-000000000002';
  st3 constant uuid := 'a0000000-0000-4000-8000-000000000003';
  ad1 constant uuid := 'c0000000-0000-4000-8000-000000000001';
  ad2 constant uuid := 'c0000000-0000-4000-8000-000000000002';
  v_order uuid; v_so uuid; v_item uuid;
begin
  select id into v_s1 from public.profiles where email = 'penjual1@nokara.test' and role = 'seller';
  select id into v_s2 from public.profiles where email = 'penjual2@nokara.test' and role = 'seller';
  select id into v_s3 from public.profiles where email = 'penjual3@nokara.test' and role = 'seller';
  select id into v_b1 from public.profiles where email = 'pembeli1@nokara.test' and role = 'buyer';
  select id into v_b2 from public.profiles where email = 'pembeli2@nokara.test' and role = 'buyer';
  if v_s1 is null or v_s2 is null or v_s3 is null or v_b1 is null or v_b2 is null then
    raise notice 'Akun demo belum lengkap. Jalankan "npm run seed:users" lalu ulangi seed.sql.';
    return;
  end if;

  -- ---------- Toko demo ------------------------------------------------------
  insert into public.stores (id, owner_id, name, description, address, city, region, phone, email, status, verified_at) values
    (st1, v_s1, 'Noken Danau Biru', 'Toko demo: noken rajut dan anyaman serat alam buatan tangan.',
     'Jl. Contoh Kerajinan No. 1', 'Jayapura', 'Papua', '081200000001', 'penjual1@nokara.test', 'approved', now()),
    (st2, v_s2, 'Manik Lembah', 'Toko demo: gelang, kalung, dan anting manik rangkaian tangan.',
     'Jl. Contoh Kerajinan No. 2', 'Wamena', 'Papua Pegunungan', '081200000002', 'penjual2@nokara.test', 'approved', now()),
    (st3, v_s3, 'Kayu Pesisir', 'Toko demo: ukiran kayu dan hiasan rumah.',
     'Jl. Contoh Kerajinan No. 3', 'Merauke', 'Papua Selatan', '081200000003', 'penjual3@nokara.test', 'approved', now())
  on conflict do nothing;

  if (select count(*) from public.stores where id in (st1, st2, st3)) < 3 then
    raise notice 'Toko demo tidak dapat dibuat (penjual demo sudah punya toko lain). Seed dihentikan.';
    return;
  end if;

  -- ---------- Produk demo ----------------------------------------------------
  insert into public.products (id, store_id, category_id, name, description, price, stock, origin_region)
  select ('b0000000-0000-4000-8000-0000000000' || lpad(v.n::text, 2, '0'))::uuid, v.store, c.id, v.name, v.descr, v.price, v.stock, v.region
  from (values
    (1,  st1, 'noken-rajut',          'Noken Rajut Benang Warna Hutan', 'Noken rajut tangan dengan benang katun tebal. Muat buku, botol minum, dan kebutuhan harian. Lebar sekitar 30 cm.', 250000, 12, 'Jayapura'),
    (2,  st1, 'noken-kulit-kayu',     'Noken Kulit Kayu Ukuran Sedang', 'Noken dari serat kulit kayu yang dipilin dan dirajut tangan. Warna alami, tiap buah sedikit berbeda.', 420000, 6, 'Jayapura'),
    (3,  st1, 'noken-tradisional',    'Noken Tradisional Serat Alam', 'Noken serat alam dengan tali panjang untuk dipakai menyilang. Kuat untuk dipakai sehari-hari.', 350000, 8, 'Jayapura'),
    (4,  st1, 'noken-modern',         'Noken Modern Selempang Mini', 'Noken mungil untuk ponsel dan dompet, dengan tali selempang yang bisa diatur.', 180000, 15, 'Jayapura'),
    (5,  st1, 'kerajinan-anyaman',    'Tas Anyaman Serat Pandan', 'Tas anyaman pandan dengan pegangan pendek. Ringan dan cocok untuk belanja.', 210000, 9, 'Jayapura'),
    (6,  st1, 'cendera-mata',         'Gantungan Kunci Noken Mini', 'Noken mini rajutan tangan sebagai gantungan kunci. Cocok untuk oleh-oleh dalam jumlah banyak.', 35000, 40, 'Jayapura'),
    (7,  st2, 'gelang',               'Gelang Manik Tiga Warna', 'Gelang manik kaca rangkaian tangan dengan pengait logam. Lingkar dapat disesuaikan.', 75000, 30, 'Wamena'),
    (8,  st2, 'kalung',               'Kalung Manik Untai Panjang', 'Kalung manik tiga untai, panjang sekitar 60 cm.', 120000, 14, 'Wamena'),
    (9,  st2, 'anting',               'Anting Manik Jumbai', 'Anting manik berjumbai, ringan dipakai. Dijual sepasang.', 60000, 20, 'Wamena'),
    (10, st2, 'aksesoris-tradisional','Gelang Anyam Serat Kayu', 'Gelang anyaman serat kayu berwarna alami, lentur dan nyaman.', 55000, 18, 'Wamena'),
    (11, st2, 'kalung',               'Kalung Biji Alam', 'Kalung dari biji-bijian kering yang dirangkai dengan benang kuat.', 95000, 10, 'Wamena'),
    (12, st3, 'ukiran-kayu',          'Ukiran Kayu Panel Dinding', 'Panel kayu ukir tangan bermotif geometris, ukuran sekitar 20 x 60 cm, siap gantung.', 650000, 4, 'Merauke'),
    (13, st3, 'kerajinan-dekoratif',  'Mangkuk Kayu Ukir', 'Mangkuk kayu dengan ukiran di bagian tepi. Untuk pajangan atau wadah kering.', 150000, 7, 'Merauke'),
    (14, st3, 'patung',               'Patung Kayu Burung', 'Patung burung dari satu potong kayu, tinggi sekitar 25 cm.', 480000, 3, 'Merauke'),
    (15, st3, 'hiasan-rumah',         'Hiasan Dinding Anyaman Bundar', 'Hiasan dinding anyaman berbentuk bundar, diameter sekitar 35 cm.', 230000, 5, 'Merauke')
  ) as v(n, store, cat, name, descr, price, stock, region)
  join public.categories c on c.slug = v.cat
  on conflict (id) do nothing;

  insert into public.product_images (product_id, url, is_primary)
  select ('b0000000-0000-4000-8000-0000000000' || lpad(v.n::text, 2, '0'))::uuid, '/demo/' || v.img || '.svg', true
  from (values (1,'noken-1'),(2,'noken-2'),(3,'noken-3'),(4,'noken-4'),(5,'anyaman-1'),(6,'gantungan-1'),
               (7,'gelang-1'),(8,'kalung-1'),(9,'anting-1'),(10,'gelang-2'),(11,'kalung-2'),
               (12,'ukiran-1'),(13,'mangkuk-1'),(14,'patung-1'),(15,'hiasan-1')) as v(n, img)
  where exists (select 1 from public.products p where p.id = ('b0000000-0000-4000-8000-0000000000' || lpad(v.n::text, 2, '0'))::uuid)
    and not exists (select 1 from public.product_images pi
                    where pi.product_id = ('b0000000-0000-4000-8000-0000000000' || lpad(v.n::text, 2, '0'))::uuid);

  -- ---------- Alamat pembeli demo -------------------------------------------
  insert into public.addresses (id, user_id, label, recipient_name, phone, address_line, city, province, postal_code, is_default) values
    (ad1, v_b1, 'Rumah', 'Pembeli Demo Satu', '081300000001', 'Jl. Contoh Pembeli No. 10', 'Makassar', 'Sulawesi Selatan', '90111', true),
    (ad2, v_b2, 'Kantor', 'Pembeli Demo Dua', '081300000002', 'Jl. Contoh Pembeli No. 20', 'Bandung', 'Jawa Barat', '40111', true)
  on conflict (id) do nothing;

  if exists (select 1 from public.orders where buyer_id in (v_b1, v_b2)) then
    raise notice 'Pesanan demo sudah ada, bagian pesanan dilewati.';
    return;
  end if;

  -- ---------- Pesanan 1: pembeli 1 belanja di 3 toko, dibayar ---------------
  perform set_config('request.jwt.claims', json_build_object('sub', v_b1, 'role', 'authenticated')::text, true);
  perform public.add_to_cart('b0000000-0000-4000-8000-000000000001', 1);
  perform public.add_to_cart('b0000000-0000-4000-8000-000000000007', 2);
  perform public.add_to_cart('b0000000-0000-4000-8000-000000000013', 1);
  v_order := public.checkout(ad1, 'bank_transfer', 'Pesanan demo');
  perform public.simulate_payment(v_order, true);

  -- toko 1: diproses -> dikirim -> selesai -> diulas
  select id into v_so from public.store_orders where order_id = v_order and store_id = st1;
  perform set_config('request.jwt.claims', json_build_object('sub', v_s1, 'role', 'authenticated')::text, true);
  perform public.update_store_order_status(v_so, 'processing');
  perform public.update_store_order_status(v_so, 'shipped', 'DEMO-RESI-0001');
  perform set_config('request.jwt.claims', json_build_object('sub', v_b1, 'role', 'authenticated')::text, true);
  perform public.update_store_order_status(v_so, 'completed');
  select id into v_item from public.order_items where store_order_id = v_so limit 1;
  perform public.submit_review(v_item, 5, 'Rajutannya rapi dan kuat. Sampai dalam kondisi baik.');

  -- toko 2: dikirim
  select id into v_so from public.store_orders where order_id = v_order and store_id = st2;
  perform set_config('request.jwt.claims', json_build_object('sub', v_s2, 'role', 'authenticated')::text, true);
  perform public.update_store_order_status(v_so, 'processing');
  perform public.update_store_order_status(v_so, 'shipped', 'DEMO-RESI-0002');

  -- toko 3: diproses
  select id into v_so from public.store_orders where order_id = v_order and store_id = st3;
  perform set_config('request.jwt.claims', json_build_object('sub', v_s3, 'role', 'authenticated')::text, true);
  perform public.update_store_order_status(v_so, 'processing');

  -- ---------- Pesanan 2: pembeli 2 belanja di 2 toko, selesai ---------------
  perform set_config('request.jwt.claims', json_build_object('sub', v_b2, 'role', 'authenticated')::text, true);
  perform public.add_to_cart('b0000000-0000-4000-8000-000000000004', 1);
  perform public.add_to_cart('b0000000-0000-4000-8000-000000000008', 1);
  v_order := public.checkout(ad2, 'e_wallet', 'Pesanan demo');
  perform public.simulate_payment(v_order, true);

  select id into v_so from public.store_orders where order_id = v_order and store_id = st2;
  perform set_config('request.jwt.claims', json_build_object('sub', v_s2, 'role', 'authenticated')::text, true);
  perform public.update_store_order_status(v_so, 'processing');
  perform public.update_store_order_status(v_so, 'shipped', 'DEMO-RESI-0003');
  perform set_config('request.jwt.claims', json_build_object('sub', v_b2, 'role', 'authenticated')::text, true);
  perform public.update_store_order_status(v_so, 'completed');
  select id into v_item from public.order_items where store_order_id = v_so limit 1;
  perform public.submit_review(v_item, 4, 'Maniknya cantik, warnanya sesuai foto.');

  -- geser tanggal pesanan 2 ke empat hari lalu supaya grafik demo tidak hanya satu batang
  update public.orders set created_at = created_at - interval '4 days', paid_at = paid_at - interval '4 days' where id = v_order;
  update public.store_orders set created_at = created_at - interval '4 days', paid_at = paid_at - interval '4 days' where order_id = v_order;
  update public.payments set created_at = created_at - interval '4 days', paid_at = paid_at - interval '4 days' where order_id = v_order;
  update public.commissions set created_at = created_at - interval '4 days', earned_at = earned_at - interval '4 days' where order_id = v_order;

  -- ---------- Pesanan 3: menunggu pembayaran --------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', v_b1, 'role', 'authenticated')::text, true);
  perform public.add_to_cart('b0000000-0000-4000-8000-000000000012', 1);
  v_order := public.checkout(ad1, 'cod', 'Pesanan demo');

  -- ---------- Pesanan 4: pembayaran gagal -----------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', v_b2, 'role', 'authenticated')::text, true);
  perform public.add_to_cart('b0000000-0000-4000-8000-000000000009', 2);
  v_order := public.checkout(ad2, 'bank_transfer', 'Pesanan demo');
  perform public.simulate_payment(v_order, false);

  perform set_config('request.jwt.claims', '', true);
  raise notice 'Seed data demo selesai.';
end $$;
