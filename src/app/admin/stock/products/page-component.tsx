'use client';

import { FC, useState } from 'react';
import { PlusIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { ProductsWithCategoriesResponse } from '@/app/admin/stock/products/products.types';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Category } from '@/app/admin/stock/categories/categories.types';
import {
  createOrUpdateProductSchema,
  CreateOrUpdateProductSchema,
} from '@/app/admin/stock/products/schema';
import {
  createProduct,
  deleteProduct,
  updateProduct,
} from '@/actions/products';
import { ProductForm } from '@/app/admin/stock/products/product-form';
import { ProductTableRow } from '@/app/admin/stock/products/product-table-row';

type Props = {
  categories: Category[];
  productsWithCategories: ProductsWithCategoriesResponse;
};

export const ProductPageComponent: FC<Props> = ({
  categories,
  productsWithCategories,
}) => {
  const [currentProduct, setCurrentProduct] =
    useState<CreateOrUpdateProductSchema | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const form = useForm<CreateOrUpdateProductSchema>({
    resolver: zodResolver(createOrUpdateProductSchema),
    defaultValues: {
      title: '',
      category: undefined,
      maxQuantity: undefined,
      intent: 'create',
    },
  });

  const router = useRouter();

  const productCreateUpdateHandler = async (
    data: CreateOrUpdateProductSchema
  ) => {
    const {
      category,
      maxQuantity,
      title,
      slug,
      intent = 'create',
    } = data;

    switch (intent) {
      case 'create': {
        await createProduct({
          category: Number(category),
          maxQuantity: Number(maxQuantity),
          title,
        });
        form.reset();
        router.refresh();
        setIsProductModalOpen(false);
        toast.success('Product created successfully');
        break;
      }
      case 'update': {
        if (slug) {
          await updateProduct({
            category: Number(category),
            maxQuantity: Number(maxQuantity),
            title,
            slug,
          });
          form.reset();
          router.refresh();
          setIsProductModalOpen(false);
          toast.success('Product updated successfully');
        }
        break;
      }

      default:
        console.error('Invalid intent');
    }
  };

  const deleteProductHandler = async () => {
    if (currentProduct?.slug) {
      await deleteProduct(currentProduct.slug);
      router.refresh();
      toast.success('Product deleted successfully');
      setIsDeleteModalOpen(false);
      setCurrentProduct(null);
    }
  };

  return (
    <main className='grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8'>
      <div className='container mx-auto p-4'>
        <div className='flex justify-between items-center mb-4'>
          <h1 className='text-3xl font-bold mb-6 text-center shadow-lg p-4 rounded-lg bg-blue-100 dark:bg-gray-800 dark:text-white'>Products Management</h1>
          
        </div>

        <div className='rounded-lg shadow-lg p-4 bg-white'>
          <Table>
            <TableHeader className='bg-gray-100 shadow-md'>
              <TableRow>
                <TableHead className='p-4 text-lg font-semibold text-gray-700'>
                  Title
                </TableHead>
                <TableHead className='p-4 text-lg font-semibold text-gray-700'>
                  Category
                </TableHead>
                <TableHead className='p-4 text-lg font-semibold text-gray-700'>
                  Available Boxes
                </TableHead>
                <TableHead className='p-4 text-lg font-semibold text-gray-700'>
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productsWithCategories.map(product => (
                <ProductTableRow
                  setIsProductModalOpen={setIsProductModalOpen}
                  key={product.id}
                  product={product}
                  setCurrentProduct={setCurrentProduct}
                  setIsDeleteModalOpen={setIsDeleteModalOpen}
                />
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Product Modal */}
        <ProductForm
          form={form}
          onSubmit={productCreateUpdateHandler}
          categories={categories}
          isProductModalOpen={isProductModalOpen}
          setIsProductModalOpen={setIsProductModalOpen}
          defaultValues={currentProduct}
        />

        {/* Delete Product Modal */}
        <Dialog
          open={isDeleteModalOpen}
          onOpenChange={setIsDeleteModalOpen}
        >
          <DialogContent className='p-6'>
            <DialogHeader>
              <DialogTitle className='font-semibold text-lg'>
                Delete Product
              </DialogTitle>
            </DialogHeader>
            <p className='text-gray-600'>
              Are you sure you want to delete {currentProduct?.title}?
            </p>
            <DialogFooter className='mt-4'>
              <Button
                variant='destructive'
                onClick={deleteProductHandler}
                className='px-6 py-2 bg-red-600 text-white rounded-lg shadow-md hover:shadow-lg'
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
};
