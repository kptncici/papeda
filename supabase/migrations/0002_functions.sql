-- ============================================================================
-- NOKARA – 0002_functions.sql : fungsi, trigger, dan logika bisnis
-- Semua fungsi SECURITY DEFINER memakai search_path tetap dan memvalidasi
-- identitas pemanggil (auth.uid()) sebelum menyentuh data.
-- ============================================================================

-- ---------- Util umum --------------------------------------------------------
create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  new.updated_at := now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['app_settings','profiles','stores','categories','products','addresses',
                           'carts','cart_items','orders','store_orders','payments','commissions']
  loop
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
                   t || '_set_updated_at', t);
  end loop;
end $$;

-- ---------- Helper identitas (dipakai RLS) -----------------------------------
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.profiles
                 where id = auth.uid() and role = 'admin' and is_active);
$$;

create or replace function public.my_store_id() returns uuid
language sql stable security definer set search_path = public, pg_temp as $$
  select s.id from public.stores s
  join public.profiles p on p.id = s.owner_id
  where s.owner_id = auth.uid() and p.is_active and p.role = 'seller';
$$;

create or replace function public.my_active_store_id() returns uuid
language sql stable security definer set search_path = public, pg_temp as $$
  select s.id from public.stores s
  join public.profiles p on p.id = s.owner_id
  where s.owner_id = auth.uid() and s.status = 'approved' and p.is_active and p.role = 'seller';
$$;

-- Memastikan pemanggil login, aktif, dan memiliki role tertentu. Mengembalikan uid.
create or replace function public._require_role(p_role public.user_role) returns uuid
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles;
begin
  if v_uid is null then
    raise exception 'Anda harus masuk terlebih dahulu' using errcode = '42501';
  end if;
  select * into v_profile from public.profiles where id = v_uid;
  if not found or not v_profile.is_active then
    raise exception 'Akun tidak aktif' using errcode = '42501';
  end if;
  if v_profile.role <> p_role then
    raise exception 'Anda tidak memiliki hak akses untuk tindakan ini' using errcode = '42501';
  end if;
  return v_uid;
end $$;

-- ---------- Helper internal: notifikasi & log -------------------------------
create or replace function public._notify(p_user uuid, p_type text, p_title text, p_message text, p_link text default null)
returns void language sql security definer set search_path = public, pg_temp as $$
  insert into public.notifications (user_id, type, title, message, link)
  values (p_user, p_type, p_title, coalesce(p_message, ''), p_link);
$$;

create or replace function public._notify_admins(p_type text, p_title text, p_message text, p_link text default null)
returns void language sql security definer set search_path = public, pg_temp as $$
  insert into public.notifications (user_id, type, title, message, link)
  select id, p_type, p_title, coalesce(p_message, ''), p_link
  from public.profiles where role = 'admin' and is_active;
$$;

create or replace function public._log(p_action text, p_entity_type text, p_entity_id text, p_details jsonb default '{}'::jsonb)
returns void language sql security definer set search_path = public, pg_temp as $$
  insert into public.activity_logs (actor_id, actor_email, action, entity_type, entity_id, details)
  values (auth.uid(), (select email from public.profiles where id = auth.uid()),
          p_action, p_entity_type, p_entity_id, coalesce(p_details, '{}'::jsonb));
$$;

-- ---------- Auth: profil otomatis saat registrasi ---------------------------
-- Role hanya boleh 'buyer' atau 'seller'. Nilai lain (termasuk 'admin') diabaikan.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_role public.user_role := 'buyer';
begin
  if new.raw_user_meta_data ->> 'role' = 'seller' then
    v_role := 'seller';
  end if;
  insert into public.profiles (id, email, full_name, phone, role)
  values (
    new.id,
    new.email,
    left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)), 120),
    left(nullif(trim(new.raw_user_meta_data ->> 'phone'), ''), 20),
    v_role
  )
  on conflict (id) do nothing;
  insert into public.carts (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Pertahanan berlapis: klien tidak bisa mengubah role / status aktif / email.
create or replace function public.protect_profile_columns() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  if auth.uid() is not null
     and coalesce(current_setting('nokara.trusted', true), '') <> 'on'
     and (new.role is distinct from old.role
          or new.is_active is distinct from old.is_active
          or new.email is distinct from old.email
          or new.id is distinct from old.id) then
    raise exception 'Kolom role, status akun, dan email tidak dapat diubah dari aplikasi' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger profiles_protect_columns before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- Provisioning admin: hanya dari SQL Editor / service role (tanpa sesi pengguna).
create or replace function public.promote_to_admin(p_email text) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_id uuid;
begin
  if auth.uid() is not null then
    raise exception 'Fungsi ini tidak dapat dipanggil dari aplikasi' using errcode = '42501';
  end if;
  update public.profiles set role = 'admin', is_active = true
  where lower(email) = lower(trim(p_email)) returning id into v_id;
  if v_id is null then
    raise exception 'Pengguna dengan email % tidak ditemukan. Buat akunnya dahulu melalui Supabase Auth.', p_email;
  end if;
  insert into public.activity_logs (actor_id, actor_email, action, entity_type, entity_id, details)
  values (null, 'system', 'admin.provisioned', 'profile', v_id::text, jsonb_build_object('email', lower(trim(p_email))));
  return v_id;
end $$;

-- ---------- Alamat: hanya satu alamat utama per pengguna --------------------
create or replace function public.addresses_single_default() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  if new.is_default then
    update public.addresses set is_default = false
    where user_id = new.user_id and id <> new.id and is_default;
  end if;
  return new;
end $$;

create trigger addresses_single_default_trg after insert or update of is_default on public.addresses
  for each row when (new.is_default) execute function public.addresses_single_default();

-- ---------- Toko -------------------------------------------------------------
create or replace function public.submit_store_application(
  p_name text, p_description text, p_address text, p_city text, p_region text, p_phone text, p_email text
) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public._require_role('seller');
  v_store public.stores;
  v_id uuid;
begin
  if char_length(trim(coalesce(p_name, ''))) < 3 then
    raise exception 'Nama toko minimal 3 karakter';
  end if;
  if trim(coalesce(p_address, '')) = '' or trim(coalesce(p_city, '')) = '' or trim(coalesce(p_phone, '')) = '' then
    raise exception 'Alamat, kota, dan nomor kontak toko wajib diisi';
  end if;
  if exists (select 1 from public.stores where lower(trim(name)) = lower(trim(p_name)) and owner_id <> v_uid) then
    raise exception 'Nama toko sudah digunakan';
  end if;

  select * into v_store from public.stores where owner_id = v_uid for update;
  if found then
    if v_store.status in ('approved', 'suspended') then
      raise exception 'Toko sudah terdaftar. Ubah data melalui Pengaturan Toko.';
    end if;
    update public.stores set
      name = trim(p_name), description = coalesce(p_description, ''), address = trim(p_address),
      city = trim(p_city), region = coalesce(trim(p_region), ''), phone = trim(p_phone),
      email = coalesce(trim(p_email), ''), status = 'pending', rejection_reason = null
    where id = v_store.id;
    v_id := v_store.id;
  else
    insert into public.stores (owner_id, name, description, address, city, region, phone, email)
    values (v_uid, trim(p_name), coalesce(p_description, ''), trim(p_address), trim(p_city),
            coalesce(trim(p_region), ''), trim(p_phone), coalesce(trim(p_email), ''))
    returning id into v_id;
  end if;

  perform public._notify(v_uid, 'store_submitted', 'Pendaftaran toko berhasil dikirim',
    'Pengajuan toko "' || trim(p_name) || '" sedang menunggu verifikasi admin.', '/seller/pengajuan');
  perform public._notify_admins('store_review', 'Pengajuan toko baru',
    'Toko "' || trim(p_name) || '" menunggu verifikasi.', '/admin/toko');
  return v_id;
end $$;

create or replace function public.admin_set_store_status(p_store_id uuid, p_status public.store_status, p_reason text default null)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public._require_role('admin');
  v_store public.stores;
begin
  select * into v_store from public.stores where id = p_store_id for update;
  if not found then raise exception 'Toko tidak ditemukan'; end if;
  if p_status = 'pending' then raise exception 'Status tidak valid'; end if;
  if p_status in ('rejected', 'suspended') and trim(coalesce(p_reason, '')) = '' then
    raise exception 'Alasan wajib diisi saat menolak atau menangguhkan toko';
  end if;
  if v_store.status = p_status then raise exception 'Toko sudah berstatus tersebut'; end if;

  update public.stores set
    status = p_status,
    rejection_reason = case when p_status = 'approved' then null else trim(p_reason) end,
    verified_at = now(), verified_by = v_uid
  where id = p_store_id;

  if p_status = 'approved' then
    perform public._notify(v_store.owner_id, 'store_approved', 'Toko disetujui',
      'Selamat, toko "' || v_store.name || '" sudah aktif. Anda dapat mulai menambahkan produk.', '/seller');
  elsif p_status = 'rejected' then
    perform public._notify(v_store.owner_id, 'store_rejected', 'Toko ditolak',
      'Pengajuan toko "' || v_store.name || '" ditolak. Alasan: ' || trim(p_reason), '/seller/pengajuan');
  else
    perform public._notify(v_store.owner_id, 'store_suspended', 'Toko ditangguhkan',
      'Toko "' || v_store.name || '" ditangguhkan. Alasan: ' || trim(p_reason), '/seller/pengajuan');
  end if;
  perform public._log('store.' || p_status::text, 'store', p_store_id::text,
    jsonb_build_object('name', v_store.name, 'from', v_store.status, 'reason', p_reason));
end $$;

-- ---------- Admin: pengguna, moderasi, pengaturan ---------------------------
create or replace function public.admin_set_user_active(p_user_id uuid, p_active boolean) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public._require_role('admin');
  v_email text;
begin
  if p_user_id = v_uid then raise exception 'Anda tidak dapat menonaktifkan akun sendiri'; end if;
  perform set_config('nokara.trusted', 'on', true);
  update public.profiles set is_active = p_active where id = p_user_id returning email into v_email;
  perform set_config('nokara.trusted', 'off', true);
  if v_email is null then raise exception 'Pengguna tidak ditemukan'; end if;
  perform public._log(case when p_active then 'user.activated' else 'user.deactivated' end,
                      'profile', p_user_id::text, jsonb_build_object('email', v_email));
end $$;

create or replace function public.admin_moderate_product(p_product_id uuid, p_status public.moderation_status, p_note text default null)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public._require_role('admin');
  v_name text; v_owner uuid;
begin
  if p_status = 'blocked' and trim(coalesce(p_note, '')) = '' then
    raise exception 'Catatan moderasi wajib diisi saat memblokir produk';
  end if;
  update public.products p set moderation_status = p_status,
         moderation_note = case when p_status = 'blocked' then trim(p_note) else null end
  where p.id = p_product_id returning p.name, (select owner_id from public.stores s where s.id = p.store_id)
  into v_name, v_owner;
  if v_name is null then raise exception 'Produk tidak ditemukan'; end if;
  if p_status = 'blocked' then
    perform public._notify(v_owner, 'product_blocked', 'Produk diblokir admin',
      'Produk "' || v_name || '" diblokir. Catatan: ' || trim(p_note), '/seller/produk');
  else
    perform public._notify(v_owner, 'product_unblocked', 'Produk kembali ditayangkan',
      'Produk "' || v_name || '" lolos moderasi dan dapat ditampilkan kembali.', '/seller/produk');
  end if;
  perform public._log('product.' || p_status::text, 'product', p_product_id::text,
    jsonb_build_object('name', v_name, 'note', p_note));
end $$;

create or replace function public.admin_update_settings(
  p_commission_rate numeric, p_shipping_flat_fee numeric, p_contact_email text, p_contact_phone text, p_contact_address text
) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public._require_role('admin');
  v_old public.app_settings;
begin
  if p_commission_rate is null or p_commission_rate < 0 or p_commission_rate > 100 then
    raise exception 'Persentase komisi harus di antara 0 dan 100';
  end if;
  if p_shipping_flat_fee is null or p_shipping_flat_fee < 0 then
    raise exception 'Ongkos kirim tidak boleh negatif';
  end if;
  select * into v_old from public.app_settings where id;
  update public.app_settings set
    commission_rate = round(p_commission_rate, 2), shipping_flat_fee = round(p_shipping_flat_fee, 2),
    contact_email = coalesce(trim(p_contact_email), ''), contact_phone = coalesce(trim(p_contact_phone), ''),
    contact_address = coalesce(trim(p_contact_address), '')
  where id;
  perform public._log('settings.updated', 'app_settings', 'main',
    jsonb_build_object('commission_rate_from', v_old.commission_rate, 'commission_rate_to', round(p_commission_rate, 2),
                       'shipping_from', v_old.shipping_flat_fee, 'shipping_to', round(p_shipping_flat_fee, 2)));
end $$;

-- Log otomatis untuk perubahan kategori oleh admin
create or replace function public.log_category_change() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is not null then
    perform public._log('category.' || lower(tg_op), 'category',
      coalesce(new.id, old.id)::text, jsonb_build_object('name', coalesce(new.name, old.name)));
  end if;
  return coalesce(new, old);
end $$;

create trigger categories_log after insert or update or delete on public.categories
  for each row execute function public.log_category_change();

-- Notifikasi "produk berhasil ditambahkan"
create or replace function public.notify_product_created() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is not null then
    perform public._notify((select owner_id from public.stores where id = new.store_id),
      'product_created', 'Produk berhasil ditambahkan',
      'Produk "' || new.name || '" sudah tersimpan di toko Anda.', '/seller/produk');
  end if;
  return new;
end $$;

create trigger products_notify_created after insert on public.products
  for each row execute function public.notify_product_created();

-- ---------- Keranjang --------------------------------------------------------
create or replace function public._purchasable_stock(p_product_id uuid) returns integer
language sql stable security definer set search_path = public, pg_temp as $$
  select p.stock from public.products p join public.stores s on s.id = p.store_id
  where p.id = p_product_id and p.status = 'active' and p.moderation_status = 'approved' and s.status = 'approved';
$$;

create or replace function public.add_to_cart(p_product_id uuid, p_quantity integer default 1) returns integer
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public._require_role('buyer');
  v_cart uuid; v_stock integer; v_current integer; v_new integer;
begin
  if p_quantity is null or p_quantity < 1 then raise exception 'Jumlah minimal 1'; end if;
  v_stock := public._purchasable_stock(p_product_id);
  if v_stock is null then raise exception 'Produk tidak tersedia'; end if;

  insert into public.carts (user_id) values (v_uid) on conflict (user_id) do nothing;
  select id into v_cart from public.carts where user_id = v_uid;
  select quantity into v_current from public.cart_items where cart_id = v_cart and product_id = p_product_id;
  v_new := coalesce(v_current, 0) + p_quantity;
  if v_new > v_stock then
    raise exception 'Stok tidak mencukupi. Tersisa % buah.', v_stock;
  end if;
  insert into public.cart_items (cart_id, product_id, quantity) values (v_cart, p_product_id, v_new)
  on conflict (cart_id, product_id) do update set quantity = excluded.quantity;
  return v_new;
end $$;

create or replace function public.set_cart_item_quantity(p_item_id uuid, p_quantity integer) returns integer
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public._require_role('buyer');
  v_product uuid; v_stock integer;
begin
  if p_quantity is null or p_quantity < 1 then raise exception 'Jumlah minimal 1'; end if;
  select ci.product_id into v_product from public.cart_items ci join public.carts c on c.id = ci.cart_id
  where ci.id = p_item_id and c.user_id = v_uid;
  if v_product is null then raise exception 'Item keranjang tidak ditemukan'; end if;
  v_stock := public._purchasable_stock(v_product);
  if v_stock is null then raise exception 'Produk tidak tersedia'; end if;
  if p_quantity > v_stock then raise exception 'Stok tidak mencukupi. Tersisa % buah.', v_stock; end if;
  update public.cart_items set quantity = p_quantity where id = p_item_id;
  return p_quantity;
end $$;

-- ---------- Checkout multi-vendor -------------------------------------------
-- Satu transaksi utama (orders) + satu pesanan per toko (store_orders).
-- Harga diambil dari tabel products di server, bukan dari klien.
create or replace function public.checkout(p_address_id uuid, p_payment_method public.payment_method, p_notes text default null)
returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public._require_role('buyer');
  v_cart uuid; v_addr public.addresses; v_settings public.app_settings;
  v_order_id uuid; v_order_no text; v_so_id uuid;
  v_subtotal numeric(14,2); v_store_count integer; v_shipping numeric(14,2);
  v_comm numeric(14,2); v_comm_total numeric(14,2) := 0;
  v_ship_address text; v_n integer := 0; rec record;
begin
  select * into v_addr from public.addresses where id = p_address_id and user_id = v_uid;
  if not found then raise exception 'Alamat pengiriman tidak ditemukan'; end if;
  if p_payment_method is null then raise exception 'Pilih metode pembayaran'; end if;

  select id into v_cart from public.carts where user_id = v_uid;
  if v_cart is null or not exists (select 1 from public.cart_items where cart_id = v_cart) then
    raise exception 'Keranjang belanja kosong';
  end if;

  -- Kunci baris produk supaya harga & stok tidak berubah selama transaksi ini.
  for rec in
    select ci.quantity, p.name, p.stock, p.status, p.moderation_status, s.status as store_status
    from public.cart_items ci
    join public.products p on p.id = ci.product_id
    join public.stores s on s.id = p.store_id
    where ci.cart_id = v_cart
    order by p.id
    for share of p
  loop
    if rec.status <> 'active' or rec.moderation_status <> 'approved' or rec.store_status <> 'approved' then
      raise exception 'Produk "%" sudah tidak tersedia. Hapus dari keranjang untuk melanjutkan.', rec.name;
    end if;
    if rec.stock < rec.quantity then
      raise exception 'Stok "%" tidak mencukupi (tersisa %).', rec.name, rec.stock;
    end if;
  end loop;

  select * into v_settings from public.app_settings where id;
  select coalesce(sum(p.price * ci.quantity), 0), count(distinct p.store_id)
    into v_subtotal, v_store_count
  from public.cart_items ci join public.products p on p.id = ci.product_id
  where ci.cart_id = v_cart;
  v_shipping := v_settings.shipping_flat_fee * v_store_count;

  v_order_no := 'NKR-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('public.order_number_seq')::text, 6, '0');
  v_ship_address := v_addr.address_line || ', ' || v_addr.city || ', ' || v_addr.province
                    || coalesce(' ' || v_addr.postal_code, '');

  insert into public.orders (order_number, buyer_id, payment_method, items_subtotal, shipping_total, grand_total, notes)
  values (v_order_no, v_uid, p_payment_method, v_subtotal, v_shipping, v_subtotal + v_shipping,
          nullif(trim(coalesce(p_notes, '')), ''))
  returning id into v_order_id;

  for rec in
    select p.store_id, s.name as store_name, sum(p.price * ci.quantity)::numeric(14,2) as sub
    from public.cart_items ci
    join public.products p on p.id = ci.product_id
    join public.stores s on s.id = p.store_id
    where ci.cart_id = v_cart
    group by p.store_id, s.name
    order by s.name
  loop
    v_n := v_n + 1;
    v_comm := round(rec.sub * v_settings.commission_rate / 100, 2);
    v_comm_total := v_comm_total + v_comm;

    insert into public.store_orders (order_id, store_id, buyer_id, store_order_number, store_name,
      items_subtotal, shipping_fee, total, commission_rate, commission_amount, seller_net,
      shipping_name, shipping_phone, shipping_address)
    values (v_order_id, rec.store_id, v_uid, v_order_no || '-' || v_n, rec.store_name,
      rec.sub, v_settings.shipping_flat_fee, rec.sub + v_settings.shipping_flat_fee,
      v_settings.commission_rate, v_comm, rec.sub - v_comm,
      v_addr.recipient_name, v_addr.phone, v_ship_address)
    returning id into v_so_id;

    insert into public.order_items (order_id, store_order_id, store_id, product_id, product_name, product_image,
                                    unit_price, quantity, subtotal)
    select v_order_id, v_so_id, p.store_id, p.id, p.name,
           (select pi.url from public.product_images pi where pi.product_id = p.id
            order by pi.is_primary desc, pi.sort_order, pi.created_at limit 1),
           p.price, ci.quantity, p.price * ci.quantity
    from public.cart_items ci join public.products p on p.id = ci.product_id
    where ci.cart_id = v_cart and p.store_id = rec.store_id;

    insert into public.commissions (store_order_id, order_id, store_id, base_amount, rate, amount, seller_net)
    values (v_so_id, v_order_id, rec.store_id, rec.sub, v_settings.commission_rate, v_comm, rec.sub - v_comm);

    insert into public.order_status_history (order_id, store_order_id, scope, from_status, to_status, changed_by, note)
    values (v_order_id, v_so_id, 'store_order', null, 'pending_payment', v_uid, 'Pesanan dibuat');
  end loop;

  update public.orders set commission_total = v_comm_total where id = v_order_id;

  insert into public.payments (order_id, transaction_number, method, amount)
  values (v_order_id, 'TRX-' || substr(v_order_no, 5), p_payment_method, v_subtotal + v_shipping);

  insert into public.order_status_history (order_id, scope, from_status, to_status, changed_by, note)
  values (v_order_id, 'payment', null, 'pending', v_uid, 'Menunggu pembayaran');

  delete from public.cart_items where cart_id = v_cart;

  perform public._notify(v_uid, 'order_created', 'Pesanan dibuat',
    'Pesanan ' || v_order_no || ' menunggu pembayaran.', '/pembayaran/' || v_order_id);
  return v_order_id;
end $$;

-- Menyelaraskan status transaksi utama dari status pesanan per toko.
create or replace function public._sync_order_status(p_order_id uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_order public.orders; v_new public.order_status;
  v_total int; v_cancelled int; v_completed int; v_moving int;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  select count(*), count(*) filter (where status = 'cancelled'), count(*) filter (where status = 'completed'),
         count(*) filter (where status in ('processing', 'shipped'))
    into v_total, v_cancelled, v_completed, v_moving
  from public.store_orders where order_id = p_order_id;

  if v_order.payment_status = 'pending' then v_new := 'pending_payment';
  elsif v_cancelled = v_total then v_new := 'cancelled';
  elsif v_completed + v_cancelled = v_total then v_new := 'completed';
  elsif v_moving + v_completed > 0 then v_new := 'processing';
  else v_new := 'paid';
  end if;

  if v_new <> v_order.status then
    update public.orders set status = v_new where id = p_order_id;
    insert into public.order_status_history (order_id, scope, from_status, to_status, changed_by)
    values (p_order_id, 'order', v_order.status::text, v_new::text, auth.uid());
  end if;
end $$;

-- ---------- Simulasi pembayaran ---------------------------------------------
-- Baris orders dikunci (FOR UPDATE) sehingga pembayaran tidak bisa diproses dua kali.
-- Stok baru berkurang di sini, setelah pembayaran dinyatakan berhasil.
create or replace function public.simulate_payment(p_order_id uuid, p_success boolean) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public._require_role('buyer');
  v_order public.orders; v_ok boolean := coalesce(p_success, false);
  v_reason text; v_short text; rec record;
begin
  select * into v_order from public.orders where id = p_order_id and buyer_id = v_uid for update;
  if not found then raise exception 'Pesanan tidak ditemukan'; end if;
  if v_order.payment_status <> 'pending' then
    raise exception 'Pembayaran untuk pesanan ini sudah diproses sebelumnya';
  end if;

  if v_ok then
    perform 1 from public.products
    where id in (select product_id from public.order_items where order_id = p_order_id)
    order by id for update;

    select string_agg(oi.product_name, ', ') into v_short
    from public.order_items oi
    left join public.products p on p.id = oi.product_id
    left join public.stores s on s.id = p.store_id
    where oi.order_id = p_order_id
      and (p.id is null or p.stock < oi.quantity or p.status <> 'active'
           or p.moderation_status <> 'approved' or s.status <> 'approved');
    if v_short is not null then
      v_ok := false;
      v_reason := 'Stok tidak mencukupi atau produk tidak lagi tersedia: ' || v_short;
    end if;
  else
    v_reason := 'Pembayaran gagal (simulasi)';
  end if;

  if v_ok then
    update public.products p set stock = p.stock - oi.quantity, sold_count = p.sold_count + oi.quantity
    from public.order_items oi where oi.order_id = p_order_id and oi.product_id = p.id;

    update public.payments set status = 'paid', paid_at = now() where order_id = p_order_id;
    update public.orders set payment_status = 'paid', paid_at = now() where id = p_order_id;
    update public.store_orders set status = 'paid', paid_at = now() where order_id = p_order_id;
    update public.commissions set status = 'earned', earned_at = now() where order_id = p_order_id;

    insert into public.order_status_history (order_id, scope, from_status, to_status, changed_by, note)
    values (p_order_id, 'payment', 'pending', 'paid', v_uid, 'Pembayaran berhasil (simulasi)');
    insert into public.order_status_history (order_id, store_order_id, scope, from_status, to_status, changed_by)
    select p_order_id, id, 'store_order', 'pending_payment', 'paid', v_uid
    from public.store_orders where order_id = p_order_id;
    perform public._sync_order_status(p_order_id);

    perform public._notify(v_uid, 'payment_success', 'Pembayaran berhasil',
      'Pembayaran pesanan ' || v_order.order_number || ' telah diterima.', '/akun/pesanan/' || p_order_id);
    for rec in
      select so.id, so.store_order_number, s.owner_id
      from public.store_orders so join public.stores s on s.id = so.store_id where so.order_id = p_order_id
    loop
      perform public._notify(rec.owner_id, 'order_new', 'Pesanan baru',
        'Pesanan ' || rec.store_order_number || ' sudah dibayar dan siap diproses.', '/seller/pesanan/' || rec.id);
    end loop;
    return jsonb_build_object('status', 'paid');
  end if;

  update public.payments set status = 'failed', failed_at = now(), failure_reason = v_reason where order_id = p_order_id;
  update public.orders set payment_status = 'failed' where id = p_order_id;
  update public.store_orders set status = 'cancelled', cancelled_at = now() where order_id = p_order_id;
  update public.commissions set status = 'cancelled' where order_id = p_order_id;
  insert into public.order_status_history (order_id, scope, from_status, to_status, changed_by, note)
  values (p_order_id, 'payment', 'pending', 'failed', v_uid, v_reason);
  insert into public.order_status_history (order_id, store_order_id, scope, from_status, to_status, changed_by)
  select p_order_id, id, 'store_order', 'pending_payment', 'cancelled', v_uid
  from public.store_orders where order_id = p_order_id;
  perform public._sync_order_status(p_order_id);
  perform public._notify(v_uid, 'payment_failed', 'Pembayaran gagal',
    'Pesanan ' || v_order.order_number || ' dibatalkan. ' || v_reason, '/akun/pesanan/' || p_order_id);
  return jsonb_build_object('status', 'failed', 'reason', v_reason);
end $$;

-- ---------- Perubahan status pesanan per toko -------------------------------
-- Penjual : paid -> processing -> shipped
-- Pembeli : shipped -> completed
-- Admin   : semua transisi di atas + pembatalan (paid/processing -> cancelled, stok dikembalikan)
create or replace function public.update_store_order_status(
  p_store_order_id uuid, p_new_status public.order_status, p_tracking text default null, p_note text default null
) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_so public.store_orders; v_owner uuid;
  v_is_admin boolean := public.is_admin();
  v_is_seller boolean; v_is_buyer boolean; v_allowed boolean := false;
begin
  if v_uid is null then raise exception 'Anda harus masuk terlebih dahulu' using errcode = '42501'; end if;
  select * into v_so from public.store_orders where id = p_store_order_id for update;
  if not found then raise exception 'Pesanan tidak ditemukan'; end if;
  select owner_id into v_owner from public.stores where id = v_so.store_id;

  v_is_seller := (v_so.store_id = public.my_active_store_id());
  v_is_buyer  := (v_so.buyer_id = v_uid and exists (select 1 from public.profiles where id = v_uid and is_active));
  if not (v_is_admin or v_is_seller or v_is_buyer) then
    raise exception 'Pesanan tidak ditemukan';
  end if;

  if (v_so.status = 'paid' and p_new_status = 'processing') or (v_so.status = 'processing' and p_new_status = 'shipped') then
    v_allowed := v_is_seller or v_is_admin;
  elsif v_so.status = 'shipped' and p_new_status = 'completed' then
    v_allowed := v_is_buyer or v_is_admin;
  elsif v_so.status in ('paid', 'processing') and p_new_status = 'cancelled' then
    v_allowed := v_is_admin;
  end if;
  if not v_allowed then
    raise exception 'Perubahan status dari "%" ke "%" tidak diizinkan', v_so.status, p_new_status;
  end if;

  update public.store_orders set
    status = p_new_status,
    tracking_number = case when p_new_status = 'shipped' then nullif(trim(coalesce(p_tracking, '')), '') else tracking_number end,
    processed_at = case when p_new_status = 'processing' then now() else processed_at end,
    shipped_at   = case when p_new_status = 'shipped'    then now() else shipped_at end,
    completed_at = case when p_new_status = 'completed'  then now() else completed_at end,
    cancelled_at = case when p_new_status = 'cancelled'  then now() else cancelled_at end
  where id = p_store_order_id;

  if p_new_status = 'cancelled' then
    update public.products p set stock = p.stock + oi.quantity, sold_count = greatest(p.sold_count - oi.quantity, 0)
    from public.order_items oi where oi.store_order_id = p_store_order_id and oi.product_id = p.id;
    update public.commissions set status = 'cancelled' where store_order_id = p_store_order_id;
    perform public._log('store_order.cancelled', 'store_order', p_store_order_id::text,
      jsonb_build_object('number', v_so.store_order_number, 'note', p_note));
  end if;

  insert into public.order_status_history (order_id, store_order_id, scope, from_status, to_status, changed_by, note)
  values (v_so.order_id, p_store_order_id, 'store_order', v_so.status::text, p_new_status::text, v_uid,
          nullif(trim(coalesce(p_note, '')), ''));
  perform public._sync_order_status(v_so.order_id);

  if p_new_status = 'processing' then
    perform public._notify(v_so.buyer_id, 'order_processing', 'Pesanan diproses',
      v_so.store_name || ' sedang menyiapkan pesanan ' || v_so.store_order_number || '.', '/akun/pesanan/' || v_so.order_id);
  elsif p_new_status = 'shipped' then
    perform public._notify(v_so.buyer_id, 'order_shipped', 'Pesanan dikirim',
      'Pesanan ' || v_so.store_order_number || ' sudah dikirim'
      || coalesce('. Nomor resi: ' || nullif(trim(coalesce(p_tracking, '')), ''), '') || '.', '/akun/pesanan/' || v_so.order_id);
  elsif p_new_status = 'completed' then
    perform public._notify(v_owner, 'order_completed', 'Pesanan selesai',
      'Pesanan ' || v_so.store_order_number || ' telah diterima pembeli.', '/seller/pesanan/' || p_store_order_id);
    perform public._notify(v_so.buyer_id, 'order_completed', 'Pesanan selesai',
      'Pesanan ' || v_so.store_order_number || ' selesai. Bagikan ulasan Anda.', '/akun/ulasan');
  else
    perform public._notify(v_so.buyer_id, 'order_cancelled', 'Pesanan dibatalkan',
      'Pesanan ' || v_so.store_order_number || ' dibatalkan oleh admin.', '/akun/pesanan/' || v_so.order_id);
    perform public._notify(v_owner, 'order_cancelled', 'Pesanan dibatalkan',
      'Pesanan ' || v_so.store_order_number || ' dibatalkan oleh admin. Stok dikembalikan.', '/seller/pesanan/' || p_store_order_id);
  end if;
end $$;

-- ---------- Ulasan -----------------------------------------------------------
create or replace function public.submit_review(p_order_item_id uuid, p_rating integer, p_comment text default '')
returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public._require_role('buyer');
  v_item public.order_items; v_status public.order_status; v_buyer uuid; v_id uuid; v_name text; v_owner uuid;
begin
  if p_rating is null or p_rating < 1 or p_rating > 5 then raise exception 'Rating harus 1 sampai 5'; end if;
  select oi.* into v_item from public.order_items oi where oi.id = p_order_item_id;
  if not found then raise exception 'Item pesanan tidak ditemukan'; end if;
  select status, buyer_id into v_status, v_buyer from public.store_orders where id = v_item.store_order_id;
  if v_buyer <> v_uid then raise exception 'Item pesanan tidak ditemukan'; end if;
  if v_status <> 'completed' then raise exception 'Ulasan hanya dapat diberikan setelah pesanan selesai'; end if;
  if v_item.product_id is null then raise exception 'Produk sudah tidak tersedia untuk diulas'; end if;
  if exists (select 1 from public.reviews where order_item_id = p_order_item_id) then
    raise exception 'Anda sudah mengulas produk ini';
  end if;

  select full_name into v_name from public.profiles where id = v_uid;
  insert into public.reviews (product_id, store_id, order_item_id, buyer_id, buyer_name, rating, comment)
  values (v_item.product_id, v_item.store_id, p_order_item_id, v_uid, coalesce(nullif(v_name, ''), 'Pembeli'),
          p_rating, left(trim(coalesce(p_comment, '')), 1000))
  returning id into v_id;

  update public.products p set
    rating_count = r.cnt, rating_avg = r.avg
  from (select count(*)::int as cnt, round(avg(rating), 2) as avg from public.reviews where product_id = v_item.product_id) r
  where p.id = v_item.product_id;

  select owner_id into v_owner from public.stores where id = v_item.store_id;
  perform public._notify(v_owner, 'review_new', 'Ulasan baru',
    '"' || v_item.product_name || '" mendapat ulasan ' || p_rating || ' bintang.', '/produk/' || v_item.product_id);
  return v_id;
end $$;

-- ---------- Pencarian produk (dijalankan di database) -----------------------
create or replace function public.search_products(
  p_query text default null, p_category uuid default null, p_store uuid default null,
  p_min numeric default null, p_max numeric default null, p_region text default null,
  p_sort text default 'newest', p_limit integer default 12, p_offset integer default 0
) returns table (
  id uuid, name text, price numeric, stock integer, origin_region text, sold_count integer,
  rating_avg numeric, rating_count integer, created_at timestamptz,
  store_id uuid, store_name text, store_city text, category_id uuid, category_name text,
  image_url text, total_count bigint
)
language sql stable security invoker set search_path = public, pg_temp as $$
  select p.id, p.name, p.price, p.stock, p.origin_region, p.sold_count, p.rating_avg, p.rating_count, p.created_at,
         s.id, s.name, s.city, c.id, c.name,
         (select pi.url from public.product_images pi where pi.product_id = p.id
          order by pi.is_primary desc, pi.sort_order, pi.created_at limit 1),
         count(*) over ()
  from public.products p
  join public.stores s on s.id = p.store_id
  join public.categories c on c.id = p.category_id
  where p.status = 'active' and p.moderation_status = 'approved' and s.status = 'approved'
    and (coalesce(trim(p_query), '') = ''
         or p.name ilike '%' || trim(p_query) || '%'
         or s.name ilike '%' || trim(p_query) || '%'
         or c.name ilike '%' || trim(p_query) || '%')
    and (p_category is null or p.category_id = p_category or c.parent_id = p_category)
    and (p_store is null or p.store_id = p_store)
    and (p_min is null or p.price >= p_min)
    and (p_max is null or p.price <= p_max)
    and (coalesce(trim(p_region), '') = '' or p.origin_region ilike '%' || trim(p_region) || '%'
         or s.city ilike '%' || trim(p_region) || '%')
  order by
    case when p_sort = 'price_asc'  then p.price end asc,
    case when p_sort = 'price_desc' then p.price end desc,
    case when p_sort = 'bestseller' then p.sold_count end desc,
    p.created_at desc, p.id
  limit least(greatest(coalesce(p_limit, 12), 1), 60) offset greatest(coalesce(p_offset, 0), 0);
$$;

-- ---------- Statistik dashboard (selalu dihitung dari data) -----------------
create or replace function public._daily_series(p_store uuid, p_from date, p_to date) returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(jsonb_agg(jsonb_build_object('date', d::date, 'orders', coalesce(x.c, 0), 'sales', coalesce(x.t, 0)) order by d), '[]'::jsonb)
  from generate_series(p_from::timestamp, p_to::timestamp, interval '1 day') d
  left join (
    select paid_at::date as dt, count(*) as c, sum(items_subtotal) as t
    from public.store_orders
    where status in ('paid', 'processing', 'shipped', 'completed') and paid_at is not null
      and (p_store is null or store_id = p_store)
    group by 1
  ) x on x.dt = d::date;
$$;

create or replace function public._top_products(p_store uuid, p_from date, p_to date, p_limit integer) returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) from (
    select oi.product_name as name, so.store_name, sum(oi.quantity)::int as quantity, sum(oi.subtotal) as sales
    from public.order_items oi join public.store_orders so on so.id = oi.store_order_id
    where so.status in ('paid', 'processing', 'shipped', 'completed')
      and (p_store is null or so.store_id = p_store)
      and (p_from is null or so.paid_at::date >= p_from) and (p_to is null or so.paid_at::date <= p_to)
    group by oi.product_name, so.store_name
    order by sum(oi.quantity) desc, sum(oi.subtotal) desc
    limit p_limit
  ) t;
$$;

create or replace function public.admin_dashboard_stats() returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_uid uuid := public._require_role('admin');
begin
  return jsonb_build_object(
    'total_users',       (select count(*) from public.profiles),
    'total_sellers',     (select count(*) from public.profiles where role = 'seller'),
    'total_buyers',      (select count(*) from public.profiles where role = 'buyer'),
    'active_stores',     (select count(*) from public.stores where status = 'approved'),
    'pending_stores',    (select count(*) from public.stores where status = 'pending'),
    'total_products',    (select count(*) from public.products),
    'total_transactions',(select count(*) from public.orders),
    'paid_transactions', (select count(*) from public.orders where payment_status = 'paid'),
    'total_sales',       (select coalesce(sum(items_subtotal), 0) from public.store_orders
                          where status in ('paid', 'processing', 'shipped', 'completed')),
    'total_commission',  (select coalesce(sum(amount), 0) from public.commissions where status = 'earned'),
    'chart',             public._daily_series(null, current_date - 13, current_date),
    'top_products',      public._top_products(null, null, null, 5)
  );
end $$;

create or replace function public.seller_dashboard_stats() returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public._require_role('seller');
  v_store uuid := public.my_store_id();
begin
  if v_store is null then raise exception 'Toko belum terdaftar'; end if;
  return jsonb_build_object(
    'total_products',    (select count(*) from public.products where store_id = v_store),
    'low_stock',         (select count(*) from public.products where store_id = v_store and stock <= 3),
    'total_orders',      (select count(*) from public.store_orders where store_id = v_store and status <> 'pending_payment'),
    'new_orders',        (select count(*) from public.store_orders where store_id = v_store and status = 'paid'),
    'processing_orders', (select count(*) from public.store_orders where store_id = v_store and status in ('processing', 'shipped')),
    'completed_orders',  (select count(*) from public.store_orders where store_id = v_store and status = 'completed'),
    'total_sales',       (select coalesce(sum(base_amount), 0) from public.commissions where store_id = v_store and status = 'earned'),
    'total_commission',  (select coalesce(sum(amount), 0) from public.commissions where store_id = v_store and status = 'earned'),
    'net_income',        (select coalesce(sum(seller_net), 0) from public.commissions where store_id = v_store and status = 'earned'),
    'chart',             public._daily_series(v_store, current_date - 13, current_date),
    'top_products',      public._top_products(v_store, null, null, 5)
  );
end $$;

create or replace function public.buyer_dashboard_stats() returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_uid uuid := public._require_role('buyer');
begin
  return jsonb_build_object(
    'total_orders',    (select count(*) from public.orders where buyer_id = v_uid),
    'pending_payment', (select count(*) from public.orders where buyer_id = v_uid and status = 'pending_payment'),
    'processing',      (select count(*) from public.orders where buyer_id = v_uid and status in ('paid', 'processing')),
    'completed',       (select count(*) from public.orders where buyer_id = v_uid and status = 'completed'),
    'total_spent',     (select coalesce(sum(grand_total), 0) from public.orders where buyer_id = v_uid and payment_status = 'paid')
  );
end $$;

-- Laporan penjualan: admin melihat semua toko, penjual hanya tokonya sendiri.
create or replace function public.sales_report(p_from date, p_to date) returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  v_store uuid; v_from date := coalesce(p_from, current_date - 29); v_to date := coalesce(p_to, current_date);
begin
  if public.is_admin() then
    v_store := null;
  else
    perform public._require_role('seller');
    v_store := public.my_store_id();
    if v_store is null then raise exception 'Toko belum terdaftar'; end if;
  end if;
  if v_to < v_from or v_to - v_from > 366 then raise exception 'Rentang tanggal tidak valid (maksimal 1 tahun)'; end if;

  return jsonb_build_object(
    'from', v_from, 'to', v_to,
    'summary', (
      select jsonb_build_object('orders', count(*), 'sales', coalesce(sum(items_subtotal), 0),
        'shipping', coalesce(sum(shipping_fee), 0), 'commission', coalesce(sum(commission_amount), 0),
        'net', coalesce(sum(seller_net), 0))
      from public.store_orders
      where status in ('paid', 'processing', 'shipped', 'completed') and paid_at::date between v_from and v_to
        and (v_store is null or store_id = v_store)),
    'by_store', (
      select coalesce(jsonb_agg(to_jsonb(t) order by t.sales desc), '[]'::jsonb) from (
        select store_id, max(store_name) as store_name, count(*) as orders, sum(items_subtotal) as sales,
               sum(commission_amount) as commission, sum(seller_net) as net
        from public.store_orders
        where status in ('paid', 'processing', 'shipped', 'completed') and paid_at::date between v_from and v_to
          and (v_store is null or store_id = v_store)
        group by store_id) t),
    'daily', public._daily_series(v_store, v_from, v_to),
    'top_products', public._top_products(v_store, v_from, v_to, 10)
  );
end $$;
