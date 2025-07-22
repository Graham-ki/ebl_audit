import { z } from 'zod';

export const createOrUpdateProductSchema = z.object({
  title: z.string().min(1, { message: 'Title is required' }),
  maxQuantity: z.string().min(1, { message: 'Max Quantity is required' }), 
  category: z.string().min(1, { message: 'Category is required' }),
  intent: z
    .enum(['create', 'update'], {
      message: 'Intent must be either create or update',
    })
    .optional(),
  slug: z.string().optional(),
});

export type CreateOrUpdateProductSchema = z.infer<
  typeof createOrUpdateProductSchema
>;

export const createProductSchemaServer = z.object({
  title: z.string().min(1, { message: 'Title is required' }),
  maxQuantity: z.number().positive({ message: 'Max Quantity must be a positive number' }),
  category: z.number().positive({ message: 'Category is required' }),
});

export type CreateProductSchemaServer = z.infer<
  typeof createProductSchemaServer
>;
