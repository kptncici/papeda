import { supabase, unwrap } from '../lib/supabase';
import { uploadImage, removeImages } from './storage';

export const submitStoreApplication = async (values) =>
  unwrap(
    await supabase.rpc('submit_store_application', {
      p_name: values.name, p_description: values.description, p_address: values.address,
      p_city: values.city, p_region: values.region, p_phone: values.phone, p_email: values.email,
    })
  );

export const updateStore = async (storeId, values) =>
  unwrap(await supabase.from('stores').update(values).eq('id', storeId).select().single());

export const getSellerStats = async () => unwrap(await supabase.rpc('seller_dashboard_stats'));
export const getSalesReport = async (from, to) => unwrap(await supabase.rpc('sales_report', { p_from: from, p_to: to }));

// ---------- Produk ----------
export async function listStoreProducts(storeId) {
  return unwrap(
    await supabase
      .from('products')
      .select('*, category:categories(id, name), images:product_images(id, url, is_primary, sort_order)')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
  );
}

export async function getStoreProduct(storeId, productId) {
  return unwrap(
    await supabase
      .from('products')
      .select('*, images:product_images(id, url, storage_path, is_primary, sort_order)')
      .eq('id', productId)
      .eq('store_id', storeId)
      .maybeSingle()
  );
}

const productPayload = (values) => ({
  category_id: values.category_id,
  name: values.name.trim(),
  description: values.description.trim(),
  price: Number(values.price),
  stock: Number(values.stock),
  origin_region: values.origin_region?.trim() || null,
  status: values.status,
});

/**
 * Menyimpan produk beserta fotonya.
 * - newFiles: File[] yang baru dipilih
 * - removedImages: baris product_images yang dihapus pengguna
 * - primaryKey: id gambar lama atau `new-<index>` untuk gambar baru yang dijadikan foto utama
 */
export async function saveProduct({ storeId, productId, values, newFiles = [], removedImages = [], keptImages = [], primaryKey }) {
  let id = productId;
  if (id) {
    unwrap(await supabase.from('products').update(productPayload(values)).eq('id', id));
  } else {
    const created = unwrap(await supabase.from('products').insert({ ...productPayload(values), store_id: storeId }).select('id').single());
    id = created.id;
  }

  if (removedImages.length) {
    unwrap(await supabase.from('product_images').delete().in('id', removedImages.map((image) => image.id)));
    await removeImages('product-images', removedImages.map((image) => image.storage_path)).catch(() => {});
  }

  const uploaded = [];
  for (let index = 0; index < newFiles.length; index += 1) {
    const { path, url } = await uploadImage('product-images', `${storeId}/${id}`, newFiles[index]);
    uploaded.push({ product_id: id, url, storage_path: path, sort_order: keptImages.length + index, is_primary: primaryKey === `new-${index}` });
  }
  if (uploaded.length) unwrap(await supabase.from('product_images').insert(uploaded));

  // Pastikan tepat satu foto utama.
  const hasNewPrimary = uploaded.some((image) => image.is_primary);
  for (const image of keptImages) {
    const shouldBePrimary = !hasNewPrimary && image.id === primaryKey;
    if (image.is_primary !== shouldBePrimary) {
      unwrap(await supabase.from('product_images').update({ is_primary: shouldBePrimary }).eq('id', image.id));
    }
  }
  const stillNoPrimary = !hasNewPrimary && !keptImages.some((image) => image.id === primaryKey);
  if (stillNoPrimary) {
    const first = unwrap(await supabase.from('product_images').select('id').eq('product_id', id).order('sort_order').limit(1));
    if (first.length) unwrap(await supabase.from('product_images').update({ is_primary: true }).eq('id', first[0].id));
  }
  return id;
}

export async function deleteProduct(product) {
  const paths = (product.images || []).map((image) => image.storage_path).filter(Boolean);
  const storagePaths = paths.length
    ? paths
    : unwrap(await supabase.from('product_images').select('storage_path').eq('product_id', product.id)).map((row) => row.storage_path);
  unwrap(await supabase.from('products').delete().eq('id', product.id));
  await removeImages('product-images', storagePaths).catch(() => {});
}

// ---------- Pesanan toko ----------
export async function listStoreOrders(storeId, status) {
  let query = supabase
    .from('store_orders')
    .select('*, items:order_items(id, product_name, product_image, quantity, unit_price, subtotal)')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })
    .limit(200);
  if (status) query = query.eq('status', status);
  return unwrap(await query);
}

export async function getStoreOrder(storeId, id) {
  const order = unwrap(
    await supabase.from('store_orders').select('*, items:order_items(*)').eq('id', id).eq('store_id', storeId).maybeSingle()
  );
  if (!order) return null;
  const history = unwrap(
    await supabase.from('order_status_history').select('*').eq('store_order_id', id).order('created_at')
  );
  return { ...order, history };
}
