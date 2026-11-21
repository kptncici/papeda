// Mengaktifkan / menonaktifkan akun pengguna.
// Selain mengubah profiles.is_active (lewat RPC admin_set_user_active, yang juga menulis log),
// fungsi ini memblokir atau membuka login pengguna di Supabase Auth.
import { corsHeaders, json, requireAdmin } from '../_shared/admin.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Metode tidak didukung.' }, 405);

  const context = await requireAdmin(req);
  if (context instanceof Response) return context;

  let body: { user_id?: string; active?: boolean };
  try { body = await req.json(); } catch { return json({ error: 'Body harus JSON.' }, 400); }
  const { user_id: userId, active } = body;
  if (typeof userId !== 'string' || !/^[0-9a-f-]{36}$/i.test(userId) || typeof active !== 'boolean') {
    return json({ error: 'Parameter user_id (uuid) dan active (boolean) wajib diisi.' }, 400);
  }

  // RPC dijalankan sebagai admin pemanggil: validasi (mis. tidak boleh menonaktifkan diri sendiri) tetap berlaku.
  const { error: rpcError } = await context.callerClient.rpc('admin_set_user_active', { p_user_id: userId, p_active: active });
  if (rpcError) return json({ error: rpcError.message }, 400);

  const { error: authError } = await context.serviceClient.auth.admin.updateUserById(userId, { ban_duration: active ? 'none' : '876000h' });
  if (authError) return json({ error: `Status profil berubah, tetapi blokir login gagal: ${authError.message}` }, 500);

  return json({ ok: true, user_id: userId, active });
});
