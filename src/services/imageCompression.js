/**
 * Kompresi gambar di browser sebelum diunggah.
 * Foto kamera HP (5–15 MB) diperkecil dimensinya dan dikompres sampai muat
 * di batas bucket Supabase, jadi batas server tidak perlu dinaikkan.
 */

const QUALITIES = [0.86, 0.78, 0.7, 0.6, 0.5];
const MAX_SHRINK_ROUNDS = 4;

async function decode(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      // imageOrientation menjaga rotasi EXIF foto HP.
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      // Lanjut ke fallback <img>.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } catch {
    throw new Error(`"${file.name}" tidak dapat dibaca sebagai gambar.`);
  } finally {
    URL.revokeObjectURL(url);
  }
}

const toBlob = (canvas, type, quality) => new Promise((resolve) => canvas.toBlob(resolve, type, quality));

function draw(source, width, height, opaque) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (opaque) {
    // JPEG tidak punya transparansi: isi latar putih supaya PNG transparan tidak jadi hitam.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
  }
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, width, height);
  return canvas;
}

/** Encode ke WebP; bila browser tidak mendukung encode WebP (Safari lama), pakai JPEG. */
async function encode(source, width, height, quality) {
  const webp = await toBlob(draw(source, width, height, false), 'image/webp', quality);
  if (webp && webp.type === 'image/webp') return webp;
  return toBlob(draw(source, width, height, true), 'image/jpeg', quality);
}

const renamed = (name, type) => `${name.replace(/\.[^.]+$/, '') || 'gambar'}.${type === 'image/webp' ? 'webp' : 'jpg'}`;

/**
 * Mengembalikan File yang ukurannya <= maxBytes dan sisi terpanjangnya <= maxDimension.
 * File yang sudah memenuhi keduanya dikembalikan apa adanya.
 */
export async function compressImage(file, { maxBytes, maxDimension = 2000 }) {
  const source = await decode(file);
  try {
    const longest = Math.max(source.width, source.height);
    let scale = Math.min(1, maxDimension / longest);
    if (scale === 1 && file.size <= maxBytes) return file;

    for (let round = 0; round <= MAX_SHRINK_ROUNDS; round += 1) {
      const width = Math.max(1, Math.round(source.width * scale));
      const height = Math.max(1, Math.round(source.height * scale));
      for (const quality of QUALITIES) {
        const blob = await encode(source, width, height, quality);
        if (blob && blob.size <= maxBytes) return new File([blob], renamed(file.name, blob.type), { type: blob.type });
      }
      scale *= 0.75;
    }
    throw new Error(`"${file.name}" tidak dapat dikompres di bawah ${Math.round(maxBytes / 1024 / 1024)} MB.`);
  } finally {
    source.close?.();
  }
}
