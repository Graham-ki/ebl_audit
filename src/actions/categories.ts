'use server';

import slugify from 'slugify';

import { CategoriesWithProductsResponse } from '@/app/admin/stock/categories/categories.types';
import {
  CreateCategorySchemaServer,
  UpdateCategorySchema,
} from '@/app/admin/stock/categories/create-category.schema';
import { createClient } from '@/supabase/server';
import { revalidatePath } from 'next/cache';

export const getCategoriesWithProducts =
  async (): Promise<CategoriesWithProductsResponse> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('category')
      .select('* , products:product(*)')
      .returns<CategoriesWithProductsResponse>();

    if (error) throw new Error(`Error fetching categories: ${error.message}`);

    return data || [];
  };

export const createCategory = async ({
  name,
}: CreateCategorySchemaServer) => {
  const supabase = await createClient();
  const slug = slugify(name, { lower: true });

  const { data, error } = await supabase.from('category').insert({
    name,
    slug,
  });

  if (error) throw new Error(`Error creating category: ${error.message}`);

  revalidatePath('/admin/categories');

  return data;
};

export const updateCategory = async ({
  name,
  slug,
}: UpdateCategorySchema) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('category')
    .update({ name })
    .match({ slug });

  if (error) throw new Error(`Error updating category: ${error.message}`);

  revalidatePath('/admin/categories');

  return data;
};

export const deleteCategory = async (id: number) => {
  const supabase = await createClient();
  const { error } = await supabase.from('category').delete().match({ id });

  if (error) throw new Error(`Error deleting category: ${error.message}`);

  revalidatePath('/admin/categories');
};

export const getCategoryData = async () => {
  const supabase = createClient();
  const { data, error } = await (await supabase)
    .from('category')
    .select('name, products:product(id)');

  if (error) throw new Error(`Error fetching category data: ${error.message}`);

  const categoryData = data.map(
    (category: { name: string; products: { id: number }[] }) => ({
      name: category.name,
      products: category.products.length,
    })
  );

  return categoryData;
};
