-- ============================================================================
-- NOKARA – 0007_checkout_selected_items.sql
-- Checkout sebagian keranjang: pembeli mencentang barang yang ingin dibayar,
-- barang lain tetap tersimpan di keranjang.
-- Parameter baru p_item_ids (id baris cart_items). Bila kosong/null, seluruh
-- keranjang di-checkout seperti sebelumnya, jadi frontend lama tetap berjalan.
-- Aman dijalankan ulang.
-- ============================================================================

drop function if exists public.checkout(uuid, public.payment_method, text);
drop function if exists public.checkout(uuid, public.payment_method, text, uuid[]);

create function public.checkout(
  p_address_id uuid, p_payment_method public.payment_method, p_notes text default null, p_item_ids uuid[] default null
)
returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public._require_role('buyer');
  v_cart uuid; v_addr public.addresses; v_settings public.app_settings;
  v_order_id uuid; v_order_no text; v_so_id uuid;
  v_subtotal numeric(14,2); v_store_count integer; v_shipping numeric(14,2);
  v_comm numeric(14,2); v_comm_total numeric(14,2) := 0;
  v_ship_address text; v_n integer := 0; rec record;
  v_partial boolean := coalesce(cardinality(p_item_ids), 0) > 0;
begin
  select * into v_addr from public.addresses where id = p_address_id and user_id = v_uid;
  if not found then raise exception 'Alamat pengiriman tidak ditemukan'; end if;
  if p_payment_method is null then raise exception 'Pilih metode pembayaran'; end if;

  select id into v_cart from public.carts where user_id = v_uid;
  if v_cart is null or not exists (select 1 from public.cart_items where cart_id = v_cart) then
    raise exception 'Keranjang belanja kosong';
  end if;
  -- Checkout sebagian: hanya item keranjang yang dipilih. Id milik keranjang lain otomatis terabaikan.
  if v_partial and not exists (select 1 from public.cart_items where cart_id = v_cart and id = any (p_item_ids)) then
    raise exception 'Pilih minimal satu barang untuk checkout';
  end if;

  -- Kunci baris produk supaya harga & stok tidak berubah selama transaksi ini.
  for rec in
    select ci.quantity, p.name, p.stock, p.status, p.moderation_status, s.status as store_status
    from public.cart_items ci
    join public.products p on p.id = ci.product_id
    join public.stores s on s.id = p.store_id
    where ci.cart_id = v_cart and (not v_partial or ci.id = any (p_item_ids))
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
  where ci.cart_id = v_cart and (not v_partial or ci.id = any (p_item_ids));
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
    where ci.cart_id = v_cart and (not v_partial or ci.id = any (p_item_ids))
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
    where ci.cart_id = v_cart and (not v_partial or ci.id = any (p_item_ids)) and p.store_id = rec.store_id;

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

  -- Hanya barang yang di-checkout yang keluar dari keranjang; sisanya tetap tersimpan.
  delete from public.cart_items where cart_id = v_cart and (not v_partial or id = any (p_item_ids));

  perform public._notify(v_uid, 'order_created', 'Pesanan dibuat',
    'Pesanan ' || v_order_no || ' menunggu pembayaran.', '/pembayaran/' || v_order_id);
  return v_order_id;
end $$;

revoke execute on function public.checkout(uuid, public.payment_method, text, uuid[]) from public, anon;
grant execute on function public.checkout(uuid, public.payment_method, text, uuid[]) to authenticated;

notify pgrst, 'reload schema';
