-- ============================================================================
-- NOKARA – 0004_storage.sql : bucket Supabase Storage dan policy-nya
-- Pola path:
--   product-images/{store_id}/{product_id}/{nama-file}
--   store-images/{store_id}/{nama-file}
--   profile-images/{user_id}/{nama-file}
-- Folder pertama menentukan pemilik, dan itu yang diperiksa oleh policy.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('product-images', 'product-images', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('store-images',   'store-images',   true, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('profile-images', 'profile-images', true, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists nokara_images_read on storage.objects;
drop policy if exists nokara_product_images_insert on storage.objects;
drop policy if exists nokara_product_images_update on storage.objects;
drop policy if exists nokara_product_images_delete on storage.objects;
drop policy if exists nokara_store_images_insert on storage.objects;
drop policy if exists nokara_store_images_update on storage.objects;
drop policy if exists nokara_store_images_delete on storage.objects;
drop policy if exists nokara_profile_images_insert on storage.objects;
drop policy if exists nokara_profile_images_update on storage.objects;
drop policy if exists nokara_profile_images_delete on storage.objects;

create policy nokara_images_read on storage.objects for select
  using (bucket_id in ('product-images', 'store-images', 'profile-images'));

-- Foto produk: hanya pemilik toko aktif, di folder tokonya sendiri.
create policy nokara_product_images_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and (storage.foldername(name))[1] = public.my_active_store_id()::text);
create policy nokara_product_images_update on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and (storage.foldername(name))[1] = public.my_active_store_id()::text)
  with check (bucket_id = 'product-images' and (storage.foldername(name))[1] = public.my_active_store_id()::text);
create policy nokara_product_images_delete on storage.objects for delete to authenticated
  using (bucket_id = 'product-images'
         and ((storage.foldername(name))[1] = public.my_active_store_id()::text or public.is_admin()));

-- Foto toko: pemilik toko (status apa pun), di folder tokonya sendiri.
create policy nokara_store_images_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'store-images' and (storage.foldername(name))[1] = public.my_store_id()::text);
create policy nokara_store_images_update on storage.objects for update to authenticated
  using (bucket_id = 'store-images' and (storage.foldername(name))[1] = public.my_store_id()::text)
  with check (bucket_id = 'store-images' and (storage.foldername(name))[1] = public.my_store_id()::text);
create policy nokara_store_images_delete on storage.objects for delete to authenticated
  using (bucket_id = 'store-images'
         and ((storage.foldername(name))[1] = public.my_store_id()::text or public.is_admin()));

-- Foto profil: hanya pemilik akun, di folder user id-nya sendiri.
create policy nokara_profile_images_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'profile-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy nokara_profile_images_update on storage.objects for update to authenticated
  using (bucket_id = 'profile-images' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'profile-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy nokara_profile_images_delete on storage.objects for delete to authenticated
  using (bucket_id = 'profile-images' and (storage.foldername(name))[1] = auth.uid()::text);
