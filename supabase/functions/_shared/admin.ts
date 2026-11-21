// Util bersama Edge Functions NOKARA.
// SUPABASE_URL, SUPABASE_ANON_KEY, dan SUPABASE_SERVICE_ROLE_KEY tersedia otomatis di lingkungan Edge Functions.
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

/**
 * Memastikan pemanggil adalah admin aktif.
 * callerClient memakai JWT pemanggil (RLS berlaku); serviceClient memakai service role
 * dan hanya dipakai setelah pemeriksaan admin lolos.
 */
export async function requireAdmin(req: Request): Promise<{ callerClient: SupabaseClient; serviceClient: SupabaseClient } | Response> {
  const authorization = req.headers.get('Authorization');
  if (!authorization) return json({ error: 'Anda harus masuk terlebih dahulu.' }, 401);

  const url = Deno.env.get('SUPABASE_URL')!;
  const callerClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: isAdmin, error } = await callerClient.rpc('is_admin');
  if (error) return json({ error: 'Sesi tidak valid.' }, 401);
  if (!isAdmin) return json({ error: 'Anda tidak memiliki hak akses untuk tindakan ini.' }, 403);

  const serviceClient = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return { callerClient, serviceClient };
}
