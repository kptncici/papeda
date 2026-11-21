-- ============================================================================
-- NOKARA – 0003_rls.sql : hak akses (GRANT) dan Row Level Security
-- Prinsip: cabut semua hak bawaan, lalu beri hak minimum per tabel/kolom.
-- Tabel transaksi (orders, store_orders, order_items, payments, commissions)
-- hanya bisa DIBACA klien; penulisan hanya lewat fungsi di 0002_functions.sql.
-- ============================================================================

revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;
grant usage on schema public to anon, authenticated;

-- ---------- GRANT tabel ------------------------------------------------------
grant select on public.app_settings, public.stores, public.categories, public.products,
                public.product_images, public.reviews to anon;

grant select on all tables in schema public to authenticated;

grant update (full_name, phone, avatar_url) on public.profiles to authenticated;
grant update (name, description, address, city, region, phone, email, image_url) on public.stores to authenticated;
grant insert, update, delete on public.categories to authenticated;
grant insert (store_id, category_id, name, description, price, stock, origin_region, status) on public.products to authenticated;
grant update (category_id, name, description, price, stock, origin_region, status) on public.products to authenticated;
grant delete on public.products to authenticated;
grant insert, delete on public.product_images to authenticated;
grant update (sort_order, is_primary) on public.product_images to authenticated;
grant insert, update, delete on public.addresses to authenticated;
grant delete on public.cart_items to authenticated;
grant update (is_read) on public.notifications to authenticated;
grant delete on public.notifications to authenticated;

-- ---------- GRANT fungsi -----------------------------------------------------
grant execute on function public.is_admin(), public.my_store_id(), public.my_active_store_id() to anon, authenticated;
grant execute on function public.search_products(text, uuid, uuid, numeric, numeric, text, text, integer, integer) to anon, authenticated;

grant execute on function
  public.submit_store_application(text, text, text, text, text, text, text),
  public.admin_set_store_status(uuid, public.store_status, text),
  public.admin_set_user_active(uuid, boolean),
  public.admin_moderate_product(uuid, public.moderation_status, text),
  public.admin_update_settings(numeric, numeric, text, text, text),
  public.add_to_cart(uuid, integer),
  public.set_cart_item_quantity(uuid, integer),
  public.checkout(uuid, public.payment_method, text),
  public.simulate_payment(uuid, boolean),
  public.update_store_order_status(uuid, public.order_status, text, text),
  public.submit_review(uuid, integer, text),
  public.admin_dashboard_stats(),
  public.seller_dashboard_stats(),
  public.buyer_dashboard_stats(),
  public.sales_report(date, date)
to authenticated;

grant execute on function public.promote_to_admin(text) to service_role;

-- ---------- Aktifkan RLS di semua tabel -------------------------------------
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- ---------- app_settings -----------------------------------------------------
create policy app_settings_read on public.app_settings for select using (true);

-- ---------- profiles ---------------------------------------------------------
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- ---------- stores -----------------------------------------------------------
create policy stores_select on public.stores for select
  using (status = 'approved' or owner_id = auth.uid() or public.is_admin());
create policy stores_update_own on public.stores for update to authenticated
  using (id = public.my_store_id()) with check (id = public.my_store_id());

-- ---------- categories -------------------------------------------------------
create policy categories_select on public.categories for select
  using (is_active or public.is_admin());
create policy categories_admin_insert on public.categories for insert to authenticated with check (public.is_admin());
create policy categories_admin_update on public.categories for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy categories_admin_delete on public.categories for delete to authenticated using (public.is_admin());

-- ---------- products ---------------------------------------------------------
create policy products_select on public.products for select
  using (
    (status = 'active' and moderation_status = 'approved'
       and exists (select 1 from public.stores s where s.id = store_id and s.status = 'approved'))
    or store_id = public.my_store_id()
    or public.is_admin()
  );
create policy products_seller_insert on public.products for insert to authenticated
  with check (store_id = public.my_active_store_id());
create policy products_seller_update on public.products for update to authenticated
  using (store_id = public.my_active_store_id()) with check (store_id = public.my_active_store_id());
create policy products_seller_delete on public.products for delete to authenticated
  using (store_id = public.my_active_store_id());

-- ---------- product_images ---------------------------------------------------
create policy product_images_select on public.product_images for select
  using (exists (select 1 from public.products p where p.id = product_id));
create policy product_images_seller_insert on public.product_images for insert to authenticated
  with check (exists (select 1 from public.products p where p.id = product_id and p.store_id = public.my_active_store_id()));
create policy product_images_seller_update on public.product_images for update to authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.store_id = public.my_active_store_id()))
  with check (exists (select 1 from public.products p where p.id = product_id and p.store_id = public.my_active_store_id()));
create policy product_images_seller_delete on public.product_images for delete to authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.store_id = public.my_active_store_id()));

-- ---------- addresses --------------------------------------------------------
create policy addresses_owner_select on public.addresses for select to authenticated using (user_id = auth.uid());
create policy addresses_owner_insert on public.addresses for insert to authenticated with check (user_id = auth.uid());
create policy addresses_owner_update on public.addresses for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy addresses_owner_delete on public.addresses for delete to authenticated using (user_id = auth.uid());

-- ---------- carts & cart_items ----------------------------------------------
create policy carts_owner_select on public.carts for select to authenticated using (user_id = auth.uid());
create policy cart_items_owner_select on public.cart_items for select to authenticated
  using (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()));
create policy cart_items_owner_delete on public.cart_items for delete to authenticated
  using (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()));

-- ---------- orders (transaksi utama) ----------------------------------------
create policy orders_select on public.orders for select to authenticated
  using (buyer_id = auth.uid() or public.is_admin());

-- ---------- store_orders -----------------------------------------------------
create policy store_orders_select on public.store_orders for select to authenticated
  using (buyer_id = auth.uid() or store_id = public.my_store_id() or public.is_admin());

-- ---------- order_items ------------------------------------------------------
create policy order_items_select on public.order_items for select to authenticated
  using (
    store_id = public.my_store_id() or public.is_admin()
    or exists (select 1 from public.orders o where o.id = order_id and o.buyer_id = auth.uid())
  );

-- ---------- payments ---------------------------------------------------------
create policy payments_select on public.payments for select to authenticated
  using (public.is_admin() or exists (select 1 from public.orders o where o.id = order_id and o.buyer_id = auth.uid()));

-- ---------- commissions ------------------------------------------------------
create policy commissions_select on public.commissions for select to authenticated
  using (store_id = public.my_store_id() or public.is_admin());

-- ---------- order_status_history --------------------------------------------
create policy order_status_history_select on public.order_status_history for select to authenticated
  using (
    public.is_admin()
    or exists (select 1 from public.orders o where o.id = order_id and o.buyer_id = auth.uid())
    or (store_order_id is not null and exists (
          select 1 from public.store_orders so where so.id = store_order_id and so.store_id = public.my_store_id()))
  );

-- ---------- reviews ----------------------------------------------------------
create policy reviews_select on public.reviews for select using (true);

-- ---------- notifications ----------------------------------------------------
create policy notifications_owner_select on public.notifications for select to authenticated using (user_id = auth.uid());
create policy notifications_owner_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_owner_delete on public.notifications for delete to authenticated using (user_id = auth.uid());

-- ---------- activity_logs ----------------------------------------------------
create policy activity_logs_admin_select on public.activity_logs for select to authenticated using (public.is_admin());
