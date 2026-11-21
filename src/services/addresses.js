import { supabase, unwrap } from '../lib/supabase';

export const listAddresses = async () =>
  unwrap(await supabase.from('addresses').select('*').order('is_default', { ascending: false }).order('created_at'));

const clean = (values) => ({
  label: values.label?.trim() || 'Rumah',
  recipient_name: values.recipient_name.trim(),
  phone: values.phone.trim(),
  address_line: values.address_line.trim(),
  city: values.city.trim(),
  province: values.province.trim(),
  postal_code: values.postal_code?.trim() || null,
  is_default: Boolean(values.is_default),
});

export const createAddress = async (userId, values) =>
  unwrap(await supabase.from('addresses').insert({ ...clean(values), user_id: userId }).select().single());

export const updateAddress = async (id, values) =>
  unwrap(await supabase.from('addresses').update(clean(values)).eq('id', id).select().single());

export const deleteAddress = async (id) => unwrap(await supabase.from('addresses').delete().eq('id', id));

export const setDefaultAddress = async (id) =>
  unwrap(await supabase.from('addresses').update({ is_default: true }).eq('id', id));
