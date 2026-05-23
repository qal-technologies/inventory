'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product } from '@/lib/firebase/converters';

export interface CartItem {
  product: Product;
  qty: number;
}

interface CartState {
  items: CartItem[];
  discount: number;
  discountType: 'flat' | 'percent';

  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  setDiscount: (value: number) => void;
  setDiscountType: (type: 'flat' | 'percent') => void;
  clearCart: () => void;

  // Derived
  subtotal: () => number;
  discountAmount: () => number;
  total: () => number;
  itemCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      discount: 0,
      discountType: 'flat',

      addItem: (product) => {
        const existing = get().items.find((i) => i.product.id === product.id);
        if (existing) {
          set({
            items: get().items.map((i) =>
              i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i
            ),
          });
        } else {
          set({ items: [...get().items, { product, qty: 1 }] });
        }
      },

      removeItem: (productId) =>
        set({ items: get().items.filter((i) => i.product.id !== productId) }),

      updateQty: (productId, qty) => {
        if (qty <= 0) {
          get().removeItem(productId);
          return;
        }
        set({
          items: get().items.map((i) =>
            i.product.id === productId ? { ...i, qty } : i
          ),
        });
      },

      setDiscount: (value) => set({ discount: Math.max(0, value) }),
      setDiscountType: (type) => set({ discountType: type }),
      clearCart: () => set({ items: [], discount: 0, discountType: 'flat' }),

      subtotal: () =>
        get().items.reduce((sum, i) => sum + i.product.sellingPrice * i.qty, 0),

      discountAmount: () => {
        const { discount, discountType, subtotal } = get();
        if (discountType === 'percent') {
          return Math.min((discount / 100) * subtotal(), subtotal());
        }
        return Math.min(discount, subtotal());
      },

      total: () => get().subtotal() - get().discountAmount(),

      itemCount: () => get().items.reduce((sum, i) => sum + i.qty, 0),
    }),
    { name: 'inv-cart' }
  )
);
