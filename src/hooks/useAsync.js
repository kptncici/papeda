import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Menjalankan fungsi async saat komponen dimuat / dependensi berubah.
 * Mengembalikan { data, loading, error, reload }.
 */
export function useAsync(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const callId = useRef(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(async () => {
    const id = ++callId.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fn();
      if (id === callId.current) setState({ data, loading: false, error: null });
    } catch (error) {
      if (id === callId.current) setState({ data: null, loading: false, error: error.message || 'Terjadi kesalahan.' });
    }
  }, deps);

  useEffect(() => {
    run();
    return () => { callId.current += 1; };
  }, [run]);

  return { ...state, reload: run };
}
