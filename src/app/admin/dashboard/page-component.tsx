'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type MonthlyOrderData = {
  name: string;
  orders: number;
};

type CategoryData = {
  name: string;
  products: number;
};

type LatestUser = {
  id: string;
  email: string;
  date: string | null;
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28DFF', '#FF6B6B'];

const PageComponent = ({
  monthlyOrders = [],
  categoryData = [],
  latestUsers = [],
}: {
  monthlyOrders?: MonthlyOrderData[];
  categoryData?: CategoryData[];
  latestUsers?: LatestUser[];
}) => {
  // Calculate totals for summary
  const totalOrders = monthlyOrders.reduce((sum, item) => sum + item.orders, 0);
  const totalProducts = categoryData.reduce((sum, item) => sum + item.products, 0);
  const totalCategories = categoryData.length;
  const totalUsers = latestUsers.length;

  return (
    <div className='flex-1 p-4 md:p-8 overflow-auto'>
      <div className='mb-8'>
        <h1 className='text-3xl font-bold mb-4 text-center p-4 rounded-lg bg-blue-100 dark:bg-gray-800 dark:text-white'>
          Dashboard Overview
        </h1>
        
        {/* Summary Cards */}
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6'>
          <Card className='bg-blue-50 dark:bg-blue-900/30'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium'>Total Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{totalOrders}</div>
            </CardContent>
          </Card>
          
          <Card className='bg-green-50 dark:bg-green-900/30'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium'>Total Products</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{totalProducts}</div>
            </CardContent>
          </Card>
          
          <Card className='bg-purple-50 dark:bg-purple-900/30'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium'>Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{totalCategories}</div>
            </CardContent>
          </Card>
          
          <Card className='bg-orange-50 dark:bg-orange-900/30'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-sm font-medium'>New Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{totalUsers}</div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
        {/* Orders Chart */}
        <Card className='shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-100 dark:border-gray-700'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <span className='text-blue-500'>📈</span>
              <span>Orders Over Time</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='h-[300px]'>
              <ResponsiveContainer width='100%' height='100%'>
                <BarChart data={monthlyOrders}>
                  <CartesianGrid strokeDasharray='3 3' stroke='#eee' strokeOpacity={0.5} />
                  <XAxis 
                    dataKey='name' 
                    tick={{ fill: 'currentColor' }}
                    stroke='currentColor'
                  />
                  <YAxis 
                    tick={{ fill: 'currentColor' }}
                    stroke='currentColor'
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: 'var(--radius)',
                    }}
                  />
                  <Legend />
                  <Bar 
                    dataKey='orders' 
                    fill='#8884d8' 
                    radius={[4, 4, 0, 0]}
                    name='Monthly Orders'
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Products Chart */}
        <Card className='shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-100 dark:border-gray-700'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <span className='text-green-500'>🍕</span>
              <span>Product Distribution</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='h-[300px]'>
              <ResponsiveContainer width='100%' height='100%'>
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey='products'
                    cx='50%'
                    cy='50%'
                    outerRadius={80}
                    fill='#8884d8'
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {categoryData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: 'var(--radius)',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Category to Products Chart */}
        <Card className='shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-100 dark:border-gray-700'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <span className='text-purple-500'>🗂️</span>
              <span>Products per Category</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='h-[300px]'>
              <ResponsiveContainer width='100%' height='100%'>
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray='3 3' stroke='#eee' strokeOpacity={0.5} />
                  <XAxis 
                    dataKey='name' 
                    tick={{ fill: 'currentColor' }}
                    stroke='currentColor'
                  />
                  <YAxis 
                    tick={{ fill: 'currentColor' }}
                    stroke='currentColor'
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: 'var(--radius)',
                    }}
                  />
                  <Legend />
                  <Bar 
                    dataKey='products' 
                    fill='#82ca9d' 
                    radius={[4, 4, 0, 0]}
                    name='Products Count'
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Latest Users */}
        <Card className='shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-100 dark:border-gray-700'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <span className='text-orange-500'>👥</span>
              <span>Latest Users</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='max-h-[300px] overflow-y-auto'>
              <Table>
                <TableHeader className='sticky top-0 bg-background'>
                  <TableRow>
                    <TableHead className='w-[60%]'>Email</TableHead>
                    <TableHead className='text-right'>Join Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {latestUsers.map(user => (
                    <TableRow key={user.id} className='hover:bg-gray-50 dark:hover:bg-gray-800'>
                      <TableCell className='font-medium truncate max-w-[200px]'>
                        {user.email}
                      </TableCell>
                      <TableCell className='text-right'>
                        {user.date || 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {latestUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={2} className='text-center text-gray-500 py-4'>
                        No users found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PageComponent;
