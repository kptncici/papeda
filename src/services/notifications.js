import { supabase, unwrap } from '../lib/supabase';

export const listNotifications = async (userId, limit = 100) =>
  unwrap(await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(limit));

export async function countUnread(userId) {
  const { count, error } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('is_read', false);
  if (error) return 0;
  return count || 0;
}

export const markRead = async (id) => unwrap(await supabase.from('notifications').update({ is_read: true }).eq('id', id));
export const markAllRead = async (userId) =>
  unwrap(await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false));
export const deleteNotification = async (id) => unwrap(await supabase.from('notifications').delete().eq('id', id));
