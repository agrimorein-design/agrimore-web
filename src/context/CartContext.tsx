import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { db } from '../firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  discountPrice?: number;
  image: string;
  quantity: number;
  stock: number;
  variantLabel?: string | null;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  cartTotal: number;
}

const CartContext = createContext<CartContextType>({
  cart: [],
  addToCart: () => {},
  removeFromCart: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  cartTotal: 0,
});

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const { userData } = useAuth();
  const [cartLoaded, setCartLoaded] = useState(false);

  // Load cart on startup / login
  useEffect(() => {
    const loadCart = async () => {
      try {
        if (userData?.uid) {
          const docRef = doc(db, 'users', userData.uid, 'cart', 'items');
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setCart(docSnap.data().items || []);
          } else {
            // Fallback for new users who might have started a cart as guest
            const storedCart = await AsyncStorage.getItem('@agrimore_cart');
            if (storedCart) setCart(JSON.parse(storedCart));
          }
        } else {
          const storedCart = await AsyncStorage.getItem('@agrimore_cart');
          if (storedCart) setCart(JSON.parse(storedCart));
        }
      } catch (error) {
        console.error("Failed to load cart", error);
      } finally {
        setCartLoaded(true);
      }
    };
    loadCart();
  }, [userData?.uid]);

  // Save cart whenever it changes
  useEffect(() => {
    const saveCart = async () => {
      if (!cartLoaded) return;
      try {
        await AsyncStorage.setItem('@agrimore_cart', JSON.stringify(cart));
        if (userData?.uid) {
          const docRef = doc(db, 'users', userData.uid, 'cart', 'items');
          await setDoc(docRef, { items: cart, updatedAt: new Date() });
        }
      } catch (error) {
        console.error("Failed to save cart", error);
      }
    };
    saveCart();
  }, [cart, cartLoaded, userData?.uid]);

  const addToCart = (item: CartItem) => {
    // Generate a unique cart item ID
    const cartItemId = item.variantLabel ? `${item.id}-${item.variantLabel}` : item.id;
    // We store the cartItemId in a hidden property or use it to find
    
    setCart((prevCart) => {
      const existingItemIndex = prevCart.findIndex((i) => {
         const existingId = i.variantLabel ? `${i.id}-${i.variantLabel}` : i.id;
         return existingId === cartItemId;
      });

      if (existingItemIndex >= 0) {
        const newCart = [...prevCart];
        newCart[existingItemIndex] = {
          ...newCart[existingItemIndex],
          quantity: newCart[existingItemIndex].quantity + (item.quantity || 1)
        };
        return newCart;
      }
      return [...prevCart, { ...item, quantity: item.quantity || 1 }];
    });
  };

  const removeFromCart = (cartItemId: string) => {
    setCart((prevCart) => prevCart.filter((i) => {
       const iid = i.variantLabel ? `${i.id}-${i.variantLabel}` : i.id;
       return iid !== cartItemId;
    }));
  };

  const updateQuantity = (cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(cartItemId);
      return;
    }
    setCart((prevCart) =>
      prevCart.map((i) => {
        const iid = i.variantLabel ? `${i.id}-${i.variantLabel}` : i.id;
        return iid === cartItemId ? { ...i, quantity } : i;
      })
    );
  };

  const clearCart = () => setCart([]);

  const cartTotal = cart.reduce((total, item) => {
    const price = item.discountPrice || item.price;
    return total + price * item.quantity;
  }, 0);

  return (
    <CartContext.Provider
      value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, cartTotal }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
