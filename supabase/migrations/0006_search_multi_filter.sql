-- ============================================================================
-- NOKARA – 0006_search_multi_filter.sql
-- Pencarian produk dengan filter centang: beberapa kategori dan beberapa lokasi sekaligus.
-- Menambah dua parameter baru (p_categories, p_regions). Parameter lama tetap ada,
-- jadi frontend versi lama tetap berjalan setelah migrasi ini.
-- Aman dijalankan ulang.
-- ============================================================================

drop function if exists public.search_products(text, uuid, uuid, numeric, numeric, text, text, integer, integer);
drop function if exists public.search_products(text, uuid, uuid, numeric, numeric, text, text, integer, integer, uuid[], text[]);

create function public.search_products(
  p_query text default null, p_category uuid default null, p_store uuid default null,
  p_min numeric default null, p_max numeric default null, p_region text default null,
  p_sort text default 'newest', p_limit integer default 12, p_offset integer default 0,
  p_categories uuid[] default null, p_regions text[] default null
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
    -- mencentang kategori utama berarti seluruh subkategorinya ikut
    and (coalesce(cardinality(p_categories), 0) = 0
         or p.category_id = any (p_categories) or c.parent_id = any (p_categories))
    and (p_store is null or p.store_id = p_store)
    and (p_min is null or p.price >= p_min)
    and (p_max is null or p.price <= p_max)
    and (coalesce(trim(p_region), '') = '' or p.origin_region ilike '%' || trim(p_region) || '%'
         or s.city ilike '%' || trim(p_region) || '%')
    -- lokasi dicocokkan dengan kota toko atau daerah asal produk
    and (coalesce(cardinality(p_regions), 0) = 0
         or lower(trim(s.city)) in (select lower(trim(r)) from unnest(p_regions) as r)
         or lower(trim(p.origin_region)) in (select lower(trim(r)) from unnest(p_regions) as r))
  order by
    case when p_sort = 'price_asc'  then p.price end asc,
    case when p_sort = 'price_desc' then p.price end desc,
    case when p_sort = 'bestseller' then p.sold_count end desc,
    p.created_at desc, p.id
  limit least(greatest(coalesce(p_limit, 12), 1), 60) offset greatest(coalesce(p_offset, 0), 0);
$$;

revoke execute on function public.search_products(text, uuid, uuid, numeric, numeric, text, text, integer, integer, uuid[], text[]) from public;
grant execute on function public.search_products(text, uuid, uuid, numeric, numeric, text, text, integer, integer, uuid[], text[]) to anon, authenticated;

-- minta PostgREST memuat ulang daftar fungsi
notify pgrst, 'reload schema';
