'use server';

import { createClient } from '@/supabase/server';
import { revalidatePath } from 'next/cache';
import { sendNotification } from './notifications';

export const getOrdersWithProducts = async () => {
  const supabase =  createClient();
  const { data, error } = await (await supabase)
    .from('order')
    .select('*, order_items:order_item(*, product(*)), user(*)')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return data;
};

//update order status
export const updateOrderStatus = async (orderId: number, status: string) => {
  const supabase = await createClient();

  // Update the order status
  const { error } = await supabase
    .from('order')
    .update({ status })
    .eq('id', orderId);

  if (error) throw new Error(error.message);

  console.log(`Order status updated to: ${status}`);
  
  // Notify the user (assuming sendNotification is defined elsewhere)
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id ?? null;
  await sendNotification(userId, status + ' 🚀');

  // Revalidate the orders page
  revalidatePath('/admin/orders');
};

//update order status

export const getMonthlyOrders = async () => {
  const supabase =  createClient();
  const { data, error } = await (await supabase).from('order').select('created_at');

  if (error) throw new Error(error.message);

  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  const ordersByMonth = data.reduce(
    (acc: Record<string, number>, order: { created_at: string }) => {
      const date = new Date(order.created_at);
      const month = monthNames[date.getUTCMonth()]; // Get the month name

      // Increment the count for this month
      if (!acc[month]) acc[month] = 0;
      acc[month]++;

      return acc;
    },
    {}
  );

  return Object.keys(ordersByMonth).map(month => ({
    name: month,
    orders: ordersByMonth[month],
  }));
};

//check status
