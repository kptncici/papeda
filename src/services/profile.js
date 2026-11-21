import { supabase, unwrap } from '../lib/supabase';

export const updateProfile = async (userId, values) =>
  unwrap(await supabase.from('profiles').update(values).eq('id', userId).select().single());

export async function changePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
}
