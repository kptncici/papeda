// Uji integrasi lapisan service (src/services/*) terhadap PostgREST lokal dengan RLS aktif.
// Modul dimuat lewat Vite supaya import.meta.env bekerja seperti di aplikasi.
// Login Supabase Auth dan Storage TIDAK tercakup; sesi ditiru dengan JWT buatan sendiri.
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import { createServer } from 'vite';

const SECRET = 'nokara-local-test-secret-jangan-dipakai-di-produksi';
const b64 = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
function jwt(claims) {
  const body = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ exp: Math.floor(Date.now() / 1000) + 3600, ...claims })}`;
  return `${body}.${crypto.createHmac('sha256', SECRET).update(body).digest('base64url')}`;
}
process.env.VITE_SUPABASE_URL = 'http://127.0.0.1:54321';
process.env.VITE_SUPABASE_ANON_KEY = jwt({ role: 'anon' });

const sql = (query) => execSync(`psql -X -q -At -d nokara_api -c "${query}"`).toString().trim();
const uid = (email) => sql(`select id from auth.users where email='${email}'`);

const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const load = (path) => vite.ssrLoadModule(path);
const { supabase } = await load('/src/lib/supabase.js');
const catalog = await load('/src/services/catalog.js');
const cart = await load('/src/services/cart.js');
const addresses = await load('/src/services/addresses.js');
const orders = await load('/src/services/orders.js');
const seller = await load('/src/services/seller.js');
const admin = await load('/src/services/admin.js');
const notifications = await load('/src/services/notifications.js');
const profileService = await load('/src/services/profile.js');

let token = null;
supabase.auth.getSession = async () => ({ data: { session: token ? { access_token: token } : null }, error: null });
const as = (id) => { token = id ? jwt({ role: 'authenticated', sub: id }) : null; };

let pass = 0; let fail = 0;
async function test(name, fn) {
  try {
    const result = await fn();
    if (result === false) throw new Error('pemeriksaan bernilai false');
    pass += 1; console.log(`PASS | ${name}`);
  } catch (error) {
    fail += 1; console.log(`FAIL | ${name}\n       -> ${error.message}`);
  }
}
async function rejects(name, fn, pattern) {
  try {
    await fn();
    fail += 1; console.log(`FAIL | ${name}\n       -> seharusnya ditolak`);
  } catch (error) {
    if (pattern.test(error.message)) { pass += 1; console.log(`PASS | ${name}`); }
    else { fail += 1; console.log(`FAIL | ${name}\n       -> pesan tak terduga: ${error.message}`); }
  }
}

const P = (n) => `b0000000-0000-4000-8000-0000000000${String(n).padStart(2, '0')}`;
const ST1 = 'a0000000-0000-4000-8000-000000000001';
const B1 = uid('pembeli1@nokara.test'); const B2 = uid('pembeli2@nokara.test');
const S1 = uid('penjual1@nokara.test'); const S4 = uid('penjual4@nokara.test'); const ADMIN = uid('admin@nokara.test');

console.log('== Publik (anon) ==');
as(null);
await test('listCategories + buildCategoryTree: 5 kategori utama', async () => catalog.buildCategoryTree(await catalog.listCategories()).length === 5);
await test('searchProducts: 15 produk, 12 per halaman', async () => { const r = await catalog.searchProducts(); return r.total === 15 && r.items.length === 12 && Boolean(r.items[0].store_name); });
await test('searchProducts: kata kunci + urutan harga', async () => { const r = await catalog.searchProducts({ query: 'gelang', sort: 'price_asc' }); return r.total === 2 && Number(r.items[0].price) === 55000; });
await test('searchProducts: halaman 2', async () => (await catalog.searchProducts({ page: 2 })).items.length === 3);
await test('getProduct: memuat toko, kategori, gambar', async () => { const p = await catalog.getProduct(P(1)); return p.store.name === 'Noken Danau Biru' && p.category.slug === 'noken-rajut' && p.images.length === 1; });
await test('listProductReviews', async () => (await catalog.listProductReviews(P(1))).length === 1);
await test('getStore + listStores', async () => (await catalog.getStore(ST1)).name === 'Noken Danau Biru' && (await catalog.listStores()).length === 3);
await test('getSettings', async () => Number((await catalog.getSettings()).commission_rate) === 5);
await rejects('anon tidak bisa membaca keranjang', () => cart.getCartItems(), /izin/);

console.log('== Pembeli ==');
as(B1);
await test('profil sendiri terbaca (query AuthContext)', async () => { const { data } = await supabase.from('profiles').select('*').eq('id', B1).maybeSingle(); return data.role === 'buyer'; });
await test('updateProfile nama & telepon', async () => (await profileService.updateProfile(B1, { full_name: 'Pembeli Demo Satu', phone: '081300000001' })).phone === '081300000001');
await rejects('updateProfile tidak bisa mengubah role', () => profileService.updateProfile(B1, { role: 'admin' }), /izin/);
await test('addToCart + getCartItems (produk, toko, gambar)', async () => { await cart.addToCart(P(5), 2); const items = await cart.getCartItems(); return items.length === 1 && items[0].available && items[0].product.store.name === 'Noken Danau Biru' && items[0].image === '/demo/anyaman-1.svg'; });
await test('setCartItemQuantity', async () => { const [item] = await cart.getCartItems(); await cart.setCartItemQuantity(item.id, 3); return (await cart.getCartItems())[0].quantity === 3; });
await rejects('setCartItemQuantity melebihi stok ditolak', async () => { const [item] = await cart.getCartItems(); await cart.setCartItemQuantity(item.id, 500); }, /Stok tidak mencukupi/);
await test('removeCartItem', async () => { const [item] = await cart.getCartItems(); await cart.removeCartItem(item.id); return (await cart.getCartItems()).length === 0; });
let addressId;
await test('createAddress / updateAddress / setDefaultAddress / listAddresses', async () => {
  const created = await addresses.createAddress(B1, { label: 'Kantor', recipient_name: 'Pembeli Satu', phone: '081300000009', address_line: 'Jl. Uji API No. 9', city: 'Kupang', province: 'NTT', postal_code: '85111', is_default: false });
  addressId = created.id;
  await addresses.updateAddress(addressId, { ...created, city: 'Kota Kupang' });
  await addresses.setDefaultAddress(addressId);
  const list = await addresses.listAddresses();
  return list.length === 2 && list[0].id === addressId && list.filter((a) => a.is_default).length === 1;
});
await rejects('createAddress dengan kode pos salah ditolak constraint', () => addresses.createAddress(B1, { recipient_name: 'X Y', phone: '081300000009', address_line: 'Jl. Uji', city: 'Kota', province: 'Prov', postal_code: '12' }), /tidak valid/);
let orderId; let order;
await test('checkout 2 toko lalu getOrder (payment, store_orders, items)', async () => {
  await cart.addToCart(P(5), 1); await cart.addToCart(P(11), 2);
  const groups = cart.groupByStore(await cart.getCartItems());
  orderId = await orders.checkout(addressId, 'e_wallet', 'uji api');
  order = await orders.getOrder(orderId);
  return groups.length === 2 && order.payment.status === 'pending' && order.store_orders.length === 2 && order.store_orders[0].items.length === 1 && Number(order.grand_total) === 210000 + 190000 + 40000;
});
await test('simulatePayment berhasil', async () => (await orders.simulatePayment(orderId, true)).status === 'paid');
await rejects('simulatePayment kedua ditolak', () => orders.simulatePayment(orderId, true), /sudah diproses/);
await test('listMyOrders memuat pesanan + item', async () => { const list = await orders.listMyOrders(B1); return list.length === 3 && list[0].store_orders[0].items.length > 0; });
await test('listOrderHistory', async () => (await orders.listOrderHistory(orderId)).length >= 5);
await test('getBuyerStats', async () => { const s = await orders.getBuyerStats(); return s.total_orders === 3 && s.pending_payment === 1; });
await test('listReviewableItems memuat ulasan yang sudah ada', async () => { const items = await orders.listReviewableItems(B1); return items.length === 1 && items[0].review.rating === 5; });
await test('notifikasi: list, countUnread, markRead, markAllRead, delete', async () => {
  const list = await notifications.listNotifications(B1);
  const before = await notifications.countUnread(B1);
  await notifications.markRead(list[0].id);
  const mid = await notifications.countUnread(B1);
  await notifications.markAllRead(B1);
  await notifications.deleteNotification(list[0].id);
  return list.length > 3 && mid === before - 1 && (await notifications.countUnread(B1)) === 0 && (await notifications.listNotifications(B1)).length === list.length - 1;
});
await rejects('pembeli tidak bisa memanggil statistik admin', () => admin.getAdminStats(), /hak akses/);

console.log('== Penjual ==');
as(S1);
let soId;
await test('toko sendiri terbaca (query AuthContext)', async () => { const { data } = await supabase.from('stores').select('*').eq('owner_id', S1).maybeSingle(); return data.id === ST1; });
await test('getSellerStats', async () => { const s = await seller.getSellerStats(); return s.total_products === 6 && s.new_orders === 2 && s.chart.length === 14; });
await test('getSalesReport penjual', async () => { const r = await seller.getSalesReport(null, null); return r.by_store.length === 1 && r.summary.orders === 3; });
await test('listStoreProducts + getStoreProduct', async () => { const list = await seller.listStoreProducts(ST1); const one = await seller.getStoreProduct(ST1, P(1)); return list.length === 6 && Boolean(list[0].category.name) && one.images.length === 1; });
let newProductId;
await test('saveProduct (tambah, tanpa foto) lalu ubah harga & stok', async () => {
  const category = (await catalog.listCategories()).find((c) => c.slug === 'noken-modern');
  const values = { name: 'Noken Uji API', category_id: category.id, description: 'Produk untuk pengujian lapisan service.', price: '99000', stock: '4', origin_region: '', status: 'active' };
  newProductId = await seller.saveProduct({ storeId: ST1, values });
  await seller.saveProduct({ storeId: ST1, productId: newProductId, values: { ...values, price: '120000', stock: '9' } });
  const saved = await seller.getStoreProduct(ST1, newProductId);
  return Number(saved.price) === 120000 && saved.stock === 9;
});
await test('deleteProduct', async () => { await seller.deleteProduct({ id: newProductId, images: [] }); return (await seller.getStoreProduct(ST1, newProductId)) === null; });
await rejects('saveProduct ke toko lain ditolak RLS', async () => {
  const category = (await catalog.listCategories()).find((c) => c.slug === 'gelang');
  await seller.saveProduct({ storeId: 'a0000000-0000-4000-8000-000000000002', values: { name: 'Susupan', category_id: category.id, description: 'x'.repeat(20), price: '1000', stock: '1', status: 'active' } });
}, /izin/);
await test('listStoreOrders (filter paid) + getStoreOrder + riwayat', async () => {
  const list = await seller.listStoreOrders(ST1, 'paid');
  soId = list.find((row) => row.shipping_name === 'Pembeli Satu').id;
  const detail = await seller.getStoreOrder(ST1, soId);
  return list.length === 2 && detail.items.length === 1 && detail.history.length === 2 && detail.shipping_name === 'Pembeli Satu';
});
await test('updateStoreOrderStatus: diproses lalu dikirim', async () => { await orders.updateStoreOrderStatus(soId, 'processing'); await orders.updateStoreOrderStatus(soId, 'shipped', { tracking: 'API-RESI-1' }); return (await seller.getStoreOrder(ST1, soId)).tracking_number === 'API-RESI-1'; });
await test('updateStore (deskripsi)', async () => (await seller.updateStore(ST1, { description: 'Toko demo: noken rajut dan anyaman serat alam buatan tangan.' })).id === ST1);
await rejects('updateStore tidak bisa mengubah status', () => seller.updateStore(ST1, { status: 'approved' }), /izin/);
as(S4);
await test('submitStoreApplication (penjual baru)', async () => Boolean(await seller.submitStoreApplication({ name: 'Toko Uji API', description: 'Toko percobaan untuk uji service.', address: 'Jl. Uji 4', city: 'Sorong', region: 'Papua Barat Daya', phone: '0812000004', email: '' })));
as(B1);
await test('pembeli mengonfirmasi diterima lalu submitReview', async () => {
  await orders.updateStoreOrderStatus(soId, 'completed');
  const items = await orders.listReviewableItems(B1);
  const target = items.find((item) => !item.review);
  await orders.submitReview(target.id, 5, 'Uji ulasan lewat service.');
  return (await orders.listReviewableItems(B1)).every((item) => item.review);
});

console.log('== Admin ==');
as(ADMIN);
await test('getAdminStats', async () => { const s = await admin.getAdminStats(); return s.total_users === 7 && s.pending_stores === 1 && s.chart.length === 14 && s.top_products.length > 0; });
await test('listUsers (filter role & cari email)', async () => (await admin.listUsers({ role: 'seller' })).length === 4 && (await admin.listUsers({ search: 'pembeli2' })).length === 1);
await test('setUserActive: nonaktifkan lalu aktifkan', async () => { await admin.setUserActive(B2, false); const off = (await admin.listUsers({ search: 'pembeli2' }))[0].is_active; await admin.setUserActive(B2, true); return off === false; });
await test('listStoresForAdmin (embed pemilik) + setStoreStatus', async () => { const pending = await admin.listStoresForAdmin('pending'); await admin.setStoreStatus(pending[0].id, 'approved'); return pending.length === 1 && pending[0].owner.email === 'penjual4@nokara.test' && (await admin.listStoresForAdmin('approved')).length === 4; });
await test('kategori: create, update, delete', async () => { const c = await admin.createCategory({ name: 'Kategori API', slug: 'kategori-api', parent_id: null, description: '', sort_order: 9, is_active: false }); await admin.updateCategory(c.id, { name: 'Kategori API 2' }); await admin.deleteCategory(c.id); return true; });
await rejects('deleteCategory yang masih dipakai ditolak', async () => { const c = (await catalog.listCategories()).find((x) => x.slug === 'gelang'); await admin.deleteCategory(c.id); }, /masih dipakai/);
await test('listProductsForAdmin + moderateProduct', async () => { const list = await admin.listProductsForAdmin({ search: 'patung' }); await admin.moderateProduct(list[0].id, 'blocked', 'uji moderasi'); const blocked = await admin.listProductsForAdmin({ moderation: 'blocked' }); await admin.moderateProduct(list[0].id, 'approved'); return list.length === 1 && Boolean(list[0].store.name) && blocked.length === 1; });
await test('listTransactions (embed pembeli, pembayaran, pesanan toko)', async () => { const list = await admin.listTransactions('paid'); return list.length === 3 && Boolean(list[0].buyer.email) && list[0].store_orders.length > 0 && list[0].payment != null; });
await test('listAllStoreOrders', async () => (await admin.listAllStoreOrders('')).length === 9);
await test('listCommissions (embed pesanan toko)', async () => { const rows = await admin.listCommissions({ status: 'earned' }); return rows.length === 7 && Boolean(rows[0].store_order.store_order_number); });
await test('getSalesReport admin', async () => (await admin.getSalesReport(null, null)).by_store.length === 3);
await test('updateSettings + listActivityLogs', async () => { await admin.updateSettings({ commission_rate: 5, shipping_flat_fee: 20000, contact_email: 'halo@nokara.example', contact_phone: '0812', contact_address: 'Jayapura, Papua' }); const logs = await admin.listActivityLogs(); return logs.length >= 8 && logs[0].action === 'settings.updated'; });

console.log(`\nHASIL: ${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
