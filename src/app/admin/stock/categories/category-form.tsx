import { useEffect } from 'react';
import { SubmitHandler, UseFormReturn } from 'react-hook-form';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormDescription,
  FormMessage,
} from '@/components/ui/form';
import { CreateCategorySchema } from '@/app/admin/stock/categories/create-category.schema';

export const CategoryForm = ({
  form,
  onSubmit,
  defaultValues,
}: {
  form: UseFormReturn<CreateCategorySchema>;
  onSubmit: SubmitHandler<CreateCategorySchema>;
  defaultValues: CreateCategorySchema | null;
}) => {
  const isSubmitting = form.formState.isSubmitting;

  useEffect(() => {
    if (defaultValues) {
      form.reset(defaultValues);
    } else {
      form.reset({ name: '' });
    }
  }, [defaultValues, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-8'>
        <FormField
          control={form.control}
          name='name'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input disabled={isSubmitting} placeholder='Category Name' {...field} />
              </FormControl>
              <FormDescription>Enter the name of the category</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button disabled={isSubmitting} type='submit' variant='outline'>
          {defaultValues ? 'Update Category' : 'Create Category'}
        </Button>
      </form>
    </Form>
  );
};
