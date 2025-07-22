import { Category } from '@/app/admin/stock/categories/categories.types';

export type ProductWithCategory = {
  category: Category;
  created_at: string;
  id: number;
  maxQuantity: number;
  slug: string;
  title: string;
};

export type ProductsWithCategoriesResponse = ProductWithCategory[];

export type UpdateProductSchema = {
  category: number;   
 maxQuantity: number;
  slug: string;
  title: string;
};
