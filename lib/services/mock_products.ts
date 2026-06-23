import { Product } from '../firebase/converters';

export const MOCK_PRODUCTS: Product[] = [
  {
    id: 'mock-prod-1',
    name: 'Glutathione Serum (Demo)',
    category: 'Serum',
    imageUrl: '',
    sellingPrice: 5000,
    buyingPrice: 3000,
    reorder: 5,
    stock: 12,
    branchId: 'calabar',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mock-prod-2',
    name: 'Vitamin C Cream (Demo)',
    category: 'Cream',
    imageUrl: '',
    sellingPrice: 8500,
    buyingPrice: 6000,
    reorder: 5,
    stock: 2, // Low stock demo
    branchId: 'ucl',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];
