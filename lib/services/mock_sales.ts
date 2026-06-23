import { Sale } from '../firebase/converters';

export const MOCK_SALES: Sale[] = [
  {
    id: 'mock-sale-1',
    branchId: 'calabar',
    branchName: 'calabar',
    items: [
      { productId: 'p1', name: 'Mock Cleanser', qty: 2, sellingPrice: 2000, buyingPrice: 1500, itemProfit: 1000 },
    ],
    subtotal: 4000,
    discount: 0,
    total: 4000,
    profit: 1000,
    profitMargin: 25,
    status: 'completed',
    createdAt: new Date().toISOString()
  },
  {
    id: 'mock-sale-2',
    branchId: 'ucl',
    branchName: 'ucl',
    items: [
      { productId: 'p2', name: 'Mock Toner', qty: 1, sellingPrice: 3500, buyingPrice: 2000, itemProfit: 1500 },
    ],
    subtotal: 3500,
    discount: 0,
    total: 3500,
    profit: 1500,
    profitMargin: 42,
    status: 'completed',
    createdAt: new Date().toISOString()
  }
];
