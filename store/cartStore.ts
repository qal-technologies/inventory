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

  addItem: (product: Product) => { success: boolean; message?: string };
  removeItem: (productId: string) => void;
  updateQty: (productId: string, qty: number) => { success: boolean; message?: string };
  setDiscount: (value: number) => void;
  setDiscountType: (type: 'flat' | 'percent') => void;
  clearCart: () => void;

  // Derived
  subtotal: () => number;
  discountAmount: () => number;
  total: () => number;
  itemCount: () => number;

  // Validation
  hasStockIssues: () => boolean;
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
          // Check if adding one more would exceed stock
          if (existing.qty >= product.stock) {
            return {
              success: false,
              message: `Only ${product.stock} unit${product.stock === 1 ? '' : 's'} in stock`,
            };
          }
          set({
            items: get().items.map((i) =>
              i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i
            ),
          });
        } else {
          if (product.stock <= 0) {
            return { success: false, message: 'Product is out of stock' };
          }
          set({ items: [...get().items, { product, qty: 1 }] });
        }
        return { success: true };
      },

      removeItem: (productId) =>
        set({ items: get().items.filter((i) => i.product.id !== productId) }),

      updateQty: (productId, qty) => {
        if (qty <= 0) {
          get().removeItem(productId);
          return { success: true };
        }
        const item = get().items.find((i) => i.product.id === productId);
        if (item && qty > item.product.stock) {
          // Clamp to max stock silently and return message
          set({
            items: get().items.map((i) =>
              i.product.id === productId ? { ...i, qty: item.product.stock } : i
            ),
          });
          return {
            success: false,
            message: `Only ${item.product.stock} unit${item.product.stock === 1 ? '' : 's'} available`,
          };
        }
        set({
          items: get().items.map((i) =>
            i.product.id === productId ? { ...i, qty } : i
          ),
        });
        return { success: true };
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

      hasStockIssues: () =>
        get().items.some((i) => i.qty > i.product.stock),
    }),
    { name: 'inv-cart' }
  )
);
