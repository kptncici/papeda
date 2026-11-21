import { supabase, unwrap, edgeFunctionsEnabled, toMessage } from '../lib/supabase';

export const getAdminStats = async () => unwrap(await supabase.rpc('admin_dashboard_stats'));
export const getSalesReport = async (from, to) => unwrap(await supabase.rpc('sales_report', { p_from: from, p_to: to }));

// ---------- Pengguna ----------
export async function listUsers({ search, role } = {}) {
  let query = supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(300);
  if (role) query = query.eq('role', role);
  if (search) query = query.ilike('email', `%${search}%`);
  return unwrap(await query);
}

export async function setUserActive(userId, active) {
  if (edgeFunctionsEnabled) {
    // Edge Function ikut memblokir sesi login di Supabase Auth, lalu memanggil RPC yang sama.
    const { data, error } = await supabase.functions.invoke('admin-set-user-status', { body: { user_id: userId, active } });
    if (error) throw new Error(toMessage(error));
    if (data?.error) throw new Error(data.error);
    return;
  }
  unwrap(await supabase.rpc('admin_set_user_active', { p_user_id: userId, p_active: active }));
}

export async function cleanupOrphanImages() {
  const { data, error } = await supabase.functions.invoke('cleanup-orphan-images', { body: {} });
  if (error) throw new Error(toMessage(error));
  if (data?.error) throw new Error(data.error);
  return data;
}

// ---------- Toko ----------
export async function listStoresForAdmin(status) {
  let query = supabase
    .from('stores')
    .select('*, owner:profiles!stores_owner_id_fkey(full_name, email)')
    .order('created_at', { ascending: false })
    .limit(300);
  if (status) query = query.eq('status', status);
  return unwrap(await query);
}

export const setStoreStatus = async (storeId, status, reason) =>
  unwrap(await supabase.rpc('admin_set_store_status', { p_store_id: storeId, p_status: status, p_reason: reason || null }));

// ---------- Kategori ----------
export const createCategory = async (values) => unwrap(await supabase.from('categories').insert(values).select().single());
export const updateCategory = async (id, values) => unwrap(await supabase.from('categories').update(values).eq('id', id).select().single());
export const deleteCategory = async (id) => unwrap(await supabase.from('categories').delete().eq('id', id));

// ---------- Produk ----------
export async function listProductsForAdmin({ search, moderation } = {}) {
  let query = supabase
    .from('products')
    .select('*, store:stores(id, name, status), category:categories(name), images:product_images(url, is_primary, sort_order)')
    .order('created_at', { ascending: false })
    .limit(300);
  if (moderation) query = query.eq('moderation_status', moderation);
  if (search) query = query.ilike('name', `%${search}%`);
  return unwrap(await query);
}

export const moderateProduct = async (productId, status, note) =>
  unwrap(await supabase.rpc('admin_moderate_product', { p_product_id: productId, p_status: status, p_note: note || null }));

// ---------- Transaksi & pesanan ----------
export async function listTransactions(paymentStatus) {
  let query = supabase
    .from('orders')
    .select('*, buyer:profiles(full_name, email), payment:payments(transaction_number, status, paid_at, failed_at, failure_reason), store_orders(id, store_name, status, total)')
    .order('created_at', { ascending: false })
    .limit(300);
  if (paymentStatus) query = query.eq('payment_status', paymentStatus);
  return unwrap(await query);
}

export async function listAllStoreOrders(status) {
  let query = supabase
    .from('store_orders')
    .select('*, items:order_items(id, product_name, quantity, subtotal)')
    .order('created_at', { ascending: false })
    .limit(300);
  if (status) query = query.eq('status', status);
  return unwrap(await query);
}

export async function listCommissions({ from, to, status } = {}) {
  let query = supabase
    .from('commissions')
    .select('*, store_order:store_orders(store_order_number, store_name)')
    .order('created_at', { ascending: false })
    .limit(500);
  if (status) query = query.eq('status', status);
  if (from) query = query.gte('created_at', `${from}T00:00:00`);
  if (to) query = query.lte('created_at', `${to}T23:59:59`);
  return unwrap(await query);
}

export const listActivityLogs = async () =>
  unwrap(await supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(200));

export const updateSettings = async (values) =>
  unwrap(
    await supabase.rpc('admin_update_settings', {
      p_commission_rate: Number(values.commission_rate),
      p_shipping_flat_fee: Number(values.shipping_flat_fee),
      p_contact_email: values.contact_email,
      p_contact_phone: values.contact_phone,
      p_contact_address: values.contact_address,
    })
  );
