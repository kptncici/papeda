import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { getCartItems, addToCart, setCartItemQuantity, removeCartItem } from '../services/cart';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { profile } = useAuth();
  const isBuyer = profile?.role === 'buyer';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    if (!isBuyer) {
      setItems([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setItems(await getCartItems());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [isBuyer]);

  useEffect(() => { reload(); }, [reload, profile?.id]);

  const add = useCallback(async (productId, quantity = 1) => { await addToCart(productId, quantity); await reload(); }, [reload]);
  const setQuantity = useCallback(async (itemId, quantity) => { await setCartItemQuantity(itemId, quantity); await reload(); }, [reload]);
  const remove = useCallback(async (itemId) => { await removeCartItem(itemId); await reload(); }, [reload]);

  const value = useMemo(() => {
    const count = items.reduce((sum, item) => sum + item.quantity, 0);
    return { items, count, loading, error, reload, add, setQuantity, remove };
  }, [items, loading, error, reload, add, setQuantity, remove]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart harus dipakai di dalam CartProvider');
  return context;
}
