import { supabase, unwrap } from '../lib/supabase';

export async function getCartItems() {
  const rows = unwrap(
    await supabase
      .from('cart_items')
      .select('id, quantity, product_id, product:products(id, name, price, stock, status, moderation_status, store:stores(id, name, city, status), images:product_images(url, is_primary, sort_order))')
      .order('created_at')
  );
  return rows.map((row) => {
    const product = row.product;
    const images = [...(product?.images || [])].sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order);
    const available = Boolean(product && product.status === 'active' && product.moderation_status === 'approved' && product.store?.status === 'approved');
    return { id: row.id, quantity: row.quantity, productId: row.product_id, product, image: images[0]?.url || null, available };
  });
}

export const addToCart = async (productId, quantity = 1) =>
  unwrap(await supabase.rpc('add_to_cart', { p_product_id: productId, p_quantity: quantity }));

export const setCartItemQuantity = async (itemId, quantity) =>
  unwrap(await supabase.rpc('set_cart_item_quantity', { p_item_id: itemId, p_quantity: quantity }));

export const removeCartItem = async (itemId) => unwrap(await supabase.from('cart_items').delete().eq('id', itemId));

/** Mengelompokkan item keranjang per toko dan menghitung subtotal. */
export function groupByStore(items) {
  const groups = new Map();
  items.filter((item) => item.available).forEach((item) => {
    const store = item.product.store;
    if (!groups.has(store.id)) groups.set(store.id, { store, items: [], subtotal: 0 });
    const group = groups.get(store.id);
    group.items.push(item);
    group.subtotal += Number(item.product.price) * item.quantity;
  });
  return [...groups.values()];
}
