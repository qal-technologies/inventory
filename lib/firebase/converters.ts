import type { FirestoreDataConverter, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface Branch {
  id: string;
  name: string;
  address: string;
  paymentAccount: string;
  paymentBank: string;
  paymentAccountName: string;
  keyHash: string;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  imageUrl: string;
  sellingPrice: number;
  buyingPrice: number;
  reorder: number;
  stock: number;
  branchId: string;
  category?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaleItem {
  productId: string;
  name: string;
  qty: number;
  sellingPrice: number;
  buyingPrice: number;
  itemProfit: number;
}

export interface Sale {
  id: string;
  branchId: string;
  branchName: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  total: number;
  profit: number;
  profitMargin: number; // percent
  status: 'completed' | 'refunded';
  createdAt: string;
}

export interface AppUser {
  id: string;
  role: 'admin' | 'staff';
  name: string;
  email: string;
  branchId?: string;
  createdAt: string;
}

// ─── Firestore Converters ──────────────────────────────────────────────────────

function makeConverter<T extends { id: string }>(): FirestoreDataConverter<T> {
  return {
    toFirestore(data: T): DocumentData {
      const { id, ...rest } = data;
      void id;
      return rest;
    },
    fromFirestore(snap: QueryDocumentSnapshot): T {
      return { id: snap.id, ...snap.data() } as T;
    },
  };
}

export const branchConverter = makeConverter<Branch>();
export const productConverter = makeConverter<Product>();
export const saleConverter = makeConverter<Sale>();
export const userConverter = makeConverter<AppUser>();
