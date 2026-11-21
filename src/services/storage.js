import { supabase, unwrap } from '../lib/supabase';
import { validateImage } from '../utils/validators';
import { compressImage } from './imageCompression';

/** Batas ukuran per bucket — harus sama dengan file_size_limit di supabase/migrations/0004_storage.sql. */
const BUCKET_LIMITS = { 'product-images': 2 * 1024 * 1024, 'store-images': 2 * 1024 * 1024, 'profile-images': 1024 * 1024 };
/** Sisi terpanjang hasil kompresi: foto produk/toko tetap tajam di hero, avatar cukup kecil. */
const BUCKET_DIMENSIONS = { 'product-images': 2400, 'store-images': 2000, 'profile-images': 800 };

const extensionOf = (file) => ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.type] || 'jpg');

/**
 * Mengunggah gambar ke bucket. `folder` harus diawali id pemilik
 * (store_id atau user_id) karena itulah yang diperiksa storage policy.
 * File besar (hingga MAX_SOURCE_BYTES) otomatis diperkecil & dikompres
 * di browser sampai muat di batas bucket.
 */
export async function uploadImage(bucket, folder, file, maxBytes = BUCKET_LIMITS[bucket] ?? 2 * 1024 * 1024) {
  const problem = validateImage(file);
  if (problem) throw new Error(problem);
  const ready = await compressImage(file, { maxBytes, maxDimension: BUCKET_DIMENSIONS[bucket] ?? 2000 });
  const path = `${folder}/${crypto.randomUUID()}.${extensionOf(ready)}`;
  unwrap(await supabase.storage.from(bucket).upload(path, ready, { cacheControl: '3600', upsert: false, contentType: ready.type }));
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { path, url: data.publicUrl };
}

export async function removeImages(bucket, paths) {
  const list = (paths || []).filter(Boolean);
  if (!list.length) return;
  unwrap(await supabase.storage.from(bucket).remove(list));
}

/** Mengambil path objek dari URL publik Supabase Storage (null untuk gambar statis/demo). */
export function pathFromPublicUrl(bucket, url) {
  const marker = `/object/public/${bucket}/`;
  const index = url ? url.indexOf(marker) : -1;
  return index === -1 ? null : decodeURIComponent(url.slice(index + marker.length));
}
