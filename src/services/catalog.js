import { supabase, unwrap } from '../lib/supabase';

export const PAGE_SIZE = 12;

export async function listCategories({ includeInactive = false } = {}) {
  let query = supabase.from('categories').select('*').order('sort_order').order('name');
  if (!includeInactive) query = query.eq('is_active', true);
  return unwrap(await query);
}

/** Menyusun kategori datar menjadi pohon [{...induk, children: [...] }]. */
export function buildCategoryTree(categories) {
  const parents = categories.filter((c) => !c.parent_id);
  return parents.map((parent) => ({ ...parent, children: categories.filter((c) => c.parent_id === parent.id) }));
}

/** Pencarian, filter, urutan, dan paginasi dikerjakan oleh fungsi SQL search_products. */
export async function searchProducts({ query, categoryId, categoryIds, storeId, min, max, region, regions, sort = 'newest', page = 1, pageSize = PAGE_SIZE } = {}) {
  const rows = unwrap(
    await supabase.rpc('search_products', {
      p_query: query || null,
      p_category: categoryId || null,
      p_store: storeId || null,
      p_min: min === '' || min == null ? null : Number(min),
      p_max: max === '' || max == null ? null : Number(max),
      p_region: region || null,
      p_sort: sort,
      p_limit: pageSize,
      p_offset: (page - 1) * pageSize,
      // filter centang (butuh migrasi 0006_search_multi_filter.sql)
      ...(categoryIds?.length ? { p_categories: categoryIds } : {}),
      ...(regions?.length ? { p_regions: regions } : {}),
    })
  );
  return { items: rows, total: rows.length ? Number(rows[0].total_count) : 0 };
}

export async function getProduct(id) {
  return unwrap(
    await supabase
      .from('products')
      .select('*, store:stores(id, name, city, region, image_url, description, status), category:categories(id, name, slug, parent_id), images:product_images(id, url, is_primary, sort_order)')
      .eq('id', id)
      .maybeSingle()
  );
}

export async function listProductReviews(productId) {
  return unwrap(
    await supabase.from('reviews').select('id, buyer_name, rating, comment, created_at').eq('product_id', productId).order('created_at', { ascending: false }).limit(50)
  );
}

export async function getStore(id) {
  return unwrap(await supabase.from('stores').select('*').eq('id', id).eq('status', 'approved').maybeSingle());
}

export async function listStores(limit = 6) {
  return unwrap(
    await supabase.from('stores').select('id, name, city, region, description, image_url').eq('status', 'approved').order('created_at').limit(limit)
  );
}

/** Daftar kota toko aktif untuk pilihan filter lokasi, tanpa duplikat. */
export async function listStoreCities() {
  const rows = unwrap(await supabase.from('stores').select('city').eq('status', 'approved'));
  const seen = new Map();
  rows.forEach(({ city }) => {
    const name = (city || '').trim();
    if (name && !seen.has(name.toLowerCase())) seen.set(name.toLowerCase(), name);
  });
  return [...seen.values()].sort((a, b) => a.localeCompare(b, 'id'));
}

export async function getSettings() {
  return unwrap(await supabase.from('app_settings').select('*').maybeSingle());
}