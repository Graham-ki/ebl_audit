'use client';

import { FC, useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { PlusCircle } from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { CategoryTableRow } from '@/components/category';
import {
  createCategorySchema,
  CreateCategorySchema,
} from '@/app/admin/stock/categories/create-category.schema';
import { CategoriesWithProductsResponse } from '@/app/admin/stock/categories/categories.types';
import { CategoryForm } from '@/app/admin/stock/categories/category-form';
import {
  createCategory,
  deleteCategory,
  updateCategory,
} from '@/actions/categories';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

type Props = {
  categories: CategoriesWithProductsResponse;
};

const CategoriesPageComponent: FC<Props> = ({ categories }) => {
  const [isCreateCategoryModalOpen, setIsCreateCategoryModalOpen] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<CreateCategorySchema | null>(null);

  const form = useForm<CreateCategorySchema>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: {
      name: '',
    },
  });

  const router = useRouter();

  const submitCategoryHandler: SubmitHandler<CreateCategorySchema> = async data => {
    const { name, intent = 'create' } = data;

    switch (intent) {
      case 'create': {
        await createCategory({ name });
        form.reset();
        router.refresh();
        setIsCreateCategoryModalOpen(false);
        toast.success('Category created successfully');
        break;
      }
      case 'update': {
        if (currentCategory?.slug) {
          await updateCategory({
            name,
            slug: currentCategory.slug,
            intent: 'update',
          });
          form.reset();
          router.refresh();
          setIsCreateCategoryModalOpen(false);
          toast.success('Category updated successfully');
        }
        break;
      }
      default:
        console.error('Invalid intent');
    }
  };

  const deleteCategoryHandler = async (id: number) => {
    await deleteCategory(id);
    router.refresh();
    toast.success('Category deleted successfully');
  };

  return (
    <main className='grid flex-1 gap-6 p-4 sm:px-6 md:gap-8 bg-gray-50 dark:bg-[#0c0c0c] rounded-xl'>
      <div className='flex items-center justify-between py-4 px-2'>
        <h1 className='text-3xl font-bold text-gray-800 dark:text-gray-100'>
          Categories Management
        </h1>
        <Dialog
          open={isCreateCategoryModalOpen}
          onOpenChange={() => setIsCreateCategoryModalOpen(!isCreateCategoryModalOpen)}
        >
          <DialogContent className='sm:max-w-md bg-white dark:bg-gray-900 rounded-xl shadow-xl p-6'>
            <DialogHeader>
              <DialogTitle className='text-lg font-semibold'>Create Category</DialogTitle>
            </DialogHeader>
            <CategoryForm
              form={form}
              onSubmit={submitCategoryHandler}
              defaultValues={currentCategory}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card className='shadow-lg rounded-2xl overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800'>
        <CardHeader className='bg-blue-100 dark:bg-gray-800 px-6 py-4'>
          <CardTitle className='text-lg font-semibold text-gray-900 dark:text-white'>
            Categories List
          </CardTitle>
        </CardHeader>

        <CardContent className='px-4 py-2'>
          <div className='w-full overflow-x-auto'>
            <Table className='min-w-[600px] text-sm'>
              <TableHeader>
                <TableRow>
                  <TableHead className='font-medium text-gray-700 dark:text-gray-300'>Name</TableHead>
                  <TableHead className='md:table-cell font-medium text-gray-700 dark:text-gray-300'>
                    Created At
                  </TableHead>
                  <TableHead className='md:table-cell font-medium text-gray-700 dark:text-gray-300'>
                    Products
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map(category => (
                  <CategoryTableRow
                    key={category.id}
                    category={category}
                    setCurrentCategory={setCurrentCategory}
                    setIsCreateCategoryModalOpen={setIsCreateCategoryModalOpen}
                    deleteCategoryHandler={deleteCategoryHandler}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </main>
  );
};

export default CategoriesPageComponent;
