import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase, toMessage } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);

  // Role dan status toko selalu dibaca dari database, tidak pernah dari input pengguna.
  const loadProfile = useCallback(async (user) => {
    if (!user) {
      setProfile(null);
      setStore(null);
      return null;
    }
    const { data: row, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (error) throw new Error(toMessage(error));
    if (!row) throw new Error('Profil belum tersedia. Coba masuk kembali.');
    if (!row.is_active) {
      await supabase.auth.signOut();
      throw new Error('Akun Anda dinonaktifkan oleh admin.');
    }
    setProfile(row);
    if (row.role === 'seller') {
      const { data: storeRow } = await supabase.from('stores').select('*').eq('owner_id', user.id).maybeSingle();
      setStore(storeRow ?? null);
    } else {
      setStore(null);
    }
    return row;
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      try {
        await loadProfile(data.session?.user);
      } catch {
        setProfile(null);
      } finally {
        if (active) setLoading(false);
      }
    });
    // Jangan memanggil supabase di dalam callback ini (bisa saling mengunci); cukup simpan sesi.
    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      if (event === 'SIGNED_OUT') {
        setProfile(null);
        setStore(null);
      }
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw new Error(toMessage(error));
    setSession(data.session);
    return loadProfile(data.user);
  }, [loadProfile]);

  const signUp = useCallback(async ({ email, password, fullName, phone, role }) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      // Server hanya menerima 'buyer' atau 'seller' (lihat trigger handle_new_user).
      options: { data: { full_name: fullName.trim(), phone: phone.trim(), role: role === 'seller' ? 'seller' : 'buyer' } },
    });
    if (error) throw new Error(toMessage(error));
    if (!data.session) return { needsConfirmation: true, profile: null };
    setSession(data.session);
    return { needsConfirmation: false, profile: await loadProfile(data.user) };
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setStore(null);
  }, []);

  const refresh = useCallback(() => loadProfile(session?.user), [loadProfile, session]);

  const value = useMemo(
    () => ({ session, user: session?.user ?? null, profile, store, loading, signIn, signUp, signOut, refresh }),
    [session, profile, store, loading, signIn, signUp, signOut, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth harus dipakai di dalam AuthProvider');
  return context;
}

export const homePathFor = (role) => ({ admin: '/admin', seller: '/seller', buyer: '/akun' }[role] || '/');
