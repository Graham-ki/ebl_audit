import { Dispatch, SetStateAction } from 'react';
import { Pencil, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { TableRow, TableCell } from '@/components/ui/table';
import { ProductWithCategory } from '@/app/admin/stock/products/products.types';
import { CreateOrUpdateProductSchema } from '@/app/admin/stock/products/schema';

type Props = {
  product: ProductWithCategory;
  setIsProductModalOpen: Dispatch<SetStateAction<boolean>>;
  setCurrentProduct: Dispatch<SetStateAction<CreateOrUpdateProductSchema | null>>;
  setIsDeleteModalOpen: Dispatch<SetStateAction<boolean>>;
};

export const ProductTableRow = ({
  product,
  setIsProductModalOpen,
  setCurrentProduct,
  setIsDeleteModalOpen,
}: Props) => {
  const handleEditClick = (product: CreateOrUpdateProductSchema) => {
    setCurrentProduct({
      title: product.title,
      category: product.category,
      maxQuantity: product.maxQuantity,
      slug: product.slug,
      intent: 'update',
    });
    setIsProductModalOpen(true);
  };

  return (
    <TableRow key={product.id}>
      <TableCell>{product.title}</TableCell>
      <TableCell>{product.category.name}</TableCell>
      <TableCell>{product.maxQuantity}</TableCell>
      <TableCell>
        <Button
          variant='ghost'
          size='icon'
          onClick={() =>
            handleEditClick({
              title: product.title,
              category: product.category.id.toString(),
              maxQuantity: product.maxQuantity.toString(),
              slug: product.slug,
              intent: 'update',
            })
          }
        >
          <Pencil className='h-4 w-4' color='darkgreen'/>
        </Button>
        <Button
          variant='ghost'
          size='icon'
          onClick={() =>
            setCurrentProduct({
              title: product.title,
              category: product.category.id.toString(),
              maxQuantity: product.maxQuantity.toString(),
              slug: product.slug,
              intent: 'update',
            })
          }
        >
          <Trash2
          color='red'
            className='h-4 w-4'
            onClick={() => setIsDeleteModalOpen(true)}
          />
        </Button>
      </TableCell>
    </TableRow>
  );
};
