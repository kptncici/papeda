// Menghapus berkas di bucket product-images yang tidak lagi dirujuk tabel product_images.
// Struktur path: {store_id}/{product_id}/{nama-file}
import { corsHeaders, json, requireAdmin } from '../_shared/admin.ts';

const BUCKET = 'product-images';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Metode tidak didukung.' }, 405);

  const context = await requireAdmin(req);
  if (context instanceof Response) return context;
  const storage = context.serviceClient.storage.from(BUCKET);

  const list = async (prefix: string) => {
    const { data, error } = await storage.list(prefix, { limit: 1000 });
    if (error) throw new Error(error.message);
    return data ?? [];
  };

  try {
    const { data: rows, error } = await context.serviceClient.from('product_images').select('storage_path').not('storage_path', 'is', null);
    if (error) throw new Error(error.message);
    const used = new Set((rows ?? []).map((row) => row.storage_path as string));

    const files: string[] = [];
    for (const store of await list('')) {
      for (const product of await list(store.name)) {
        for (const file of await list(`${store.name}/${product.name}`)) {
          if (file.id) files.push(`${store.name}/${product.name}/${file.name}`); // folder tidak punya id
        }
      }
    }

    const orphans = files.filter((path) => !used.has(path));
    for (let i = 0; i < orphans.length; i += 100) {
      const { error: removeError } = await storage.remove(orphans.slice(i, i + 100));
      if (removeError) throw new Error(removeError.message);
    }
    return json({ ok: true, checked: files.length, removed: orphans.length });
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
});
