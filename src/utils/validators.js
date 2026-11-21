export const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value || '').trim());
export const isPhone = (value) => /^[0-9+][0-9 -]{7,18}$/.test(String(value || '').trim());
export const isPostalCode = (value) => /^[0-9]{5}$/.test(String(value || '').trim());

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
/** Batas file asli yang boleh dipilih. File akan dikompres otomatis sebelum diunggah (lihat services/imageCompression.js). */
export const MAX_SOURCE_BYTES = 20 * 1024 * 1024;

/** Mengembalikan pesan kesalahan, atau null bila file gambar valid. */
export function validateImage(file, maxBytes = MAX_SOURCE_BYTES) {
  if (!file) return 'File tidak ditemukan.';
  if (!IMAGE_TYPES.includes(file.type)) return `"${file.name}" bukan JPG, PNG, atau WebP.`;
  if (file.size > maxBytes) return `"${file.name}" lebih besar dari ${Math.round(maxBytes / 1024 / 1024)} MB.`;
  return null;
}

/** Menjalankan aturan { field: (value, values) => pesan | null } dan mengembalikan objek error. */
export function validate(values, rules) {
  const errors = {};
  Object.entries(rules).forEach(([field, rule]) => {
    const message = rule(values[field], values);
    if (message) errors[field] = message;
  });
  return errors;
}
