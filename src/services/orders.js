import { supabase, unwrap, one } from '../lib/supabase';

/** itemIds: id baris keranjang yang di-checkout. Kosong berarti seluruh keranjang (butuh migrasi 0007 bila diisi). */
export const checkout = async (addressId, paymentMethod, notes, itemIds) =>
  unwrap(
    await supabase.rpc('checkout', {
      p_address_id: addressId, p_payment_method: paymentMethod, p_notes: notes || null,
      ...(itemIds?.length ? { p_item_ids: itemIds } : {}),
    })
  );

export const simulatePayment = async (orderId, success) =>
  unwrap(await supabase.rpc('simulate_payment', { p_order_id: orderId, p_success: success }));

export const updateStoreOrderStatus = async (storeOrderId, status, { tracking = null, note = null } = {}) =>
  unwrap(await supabase.rpc('update_store_order_status', { p_store_order_id: storeOrderId, p_new_status: status, p_tracking: tracking, p_note: note }));

// ---------- Pembeli ----------
export const getBuyerStats = async () => unwrap(await supabase.rpc('buyer_dashboard_stats'));

export async function listMyOrders(buyerId, limit = 100) {
  return unwrap(
    await supabase
      .from('orders')
      .select('id, order_number, status, payment_status, payment_method, grand_total, created_at, store_orders(id, store_name, status, items:order_items(id, product_name, product_image, quantity))')
      .eq('buyer_id', buyerId)
      .order('created_at', { ascending: false })
      .limit(limit)
  );
}

export async function getOrder(id) {
  const order = unwrap(
    await supabase
      .from('orders')
      .select('*, payment:payments(*), store_orders(*, items:order_items(*, review:reviews(id, rating, comment)))')
      .eq('id', id)
      .maybeSingle()
  );
  if (!order) return null;
  return {
    ...order,
    payment: one(order.payment),
    store_orders: (order.store_orders || [])
      .map((so) => ({ ...so, items: (so.items || []).map((item) => ({ ...item, review: one(item.review) })) }))
      .sort((a, b) => a.store_order_number.localeCompare(b.store_order_number)),
  };
}

export const listOrderHistory = async (orderId) =>
  unwrap(await supabase.from('order_status_history').select('*').eq('order_id', orderId).order('created_at'));

/** Item dari pesanan selesai milik pembeli, beserta ulasannya bila sudah ada. */
export async function listReviewableItems(buyerId) {
  const rows = unwrap(
    await supabase
      .from('store_orders')
      .select('id, store_name, completed_at, order_id, items:order_items(id, product_id, product_name, product_image, unit_price, quantity, review:reviews(id, rating, comment, created_at))')
      .eq('buyer_id', buyerId)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
  );
  return rows.flatMap((so) =>
    (so.items || []).map((item) => ({ ...item, review: one(item.review), store_name: so.store_name, completed_at: so.completed_at, order_id: so.order_id }))
  );
}

export const submitReview = async (orderItemId, rating, comment) =>
  unwrap(await supabase.rpc('submit_review', { p_order_item_id: orderItemId, p_rating: rating, p_comment: comment || '' }));