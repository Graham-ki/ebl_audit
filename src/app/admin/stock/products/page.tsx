'use client';
import slugify from 'slugify';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
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

const supabaseUrl = 'https://kxnrfzcurobahklqefjs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4bnJmemN1cm9iYWhrbHFlZmpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc5NTk1MzUsImV4cCI6MjA1MzUzNTUzNX0.pHrrAPHV1ln1OHugnB93DTUY5TL9K8dYREhz1o0GkjE';
const supabase = createClient(supabaseUrl, supabaseKey);

type Product = {
  id: number;
  title: string;
  maxQuantity: number;
};

type ProductEntry = {
  id: number;
  title: string;
  quantity: number;
  created_at: string;
  Created_by: string;
  status: string;
};

type SoldProduct = {
  product_name: string;
  quantity: number;
  created_at: string;
};

type Category = {
  id: number;
  name: string;
};

export default function SummaryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productEntries, setProductEntries] = useState<ProductEntry[]>([]);
  const [soldProducts, setSoldProducts] = useState<SoldProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [title, setTitle] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [combinedData, setCombinedData] = useState<{ type: string; data: any }[]>([]);
  const [filteredSales, setFilteredSales] = useState<SoldProduct[]>([]);
  const [dateRange, setDateRange] = useState<[Date, Date]>([
    new Date(new Date().setMonth(new Date().getMonth() - 1)),
    new Date(),
  ]);

  // Fetch Products List
  useEffect(() => {
    const fetchProducts = async () => {
      const { data, error } = await supabase.from('product').select('id, title, maxQuantity');
      if (error) console.error('Error fetching products:', error);
      else setProducts(data || []);
    };

    fetchProducts();
  }, []);

  // Fetch Categories
  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase.from('category').select('*');
      if (error) console.error('Error fetching categories:', error);
      else setCategories(data || []);
    };

    fetchCategories();
  }, []);

  // Fetch Sold Products (from approved orders only)
  const fetchSoldProducts = async () => {
    try {
      const { data: orderItems, error: orderItemsError } = await supabase
        .from('order_item')
        .select('order');

      if (orderItemsError) {
        console.error('Error fetching order items:', orderItemsError);
        return;
      }

      if (!orderItems || orderItems.length === 0) {
        console.log('No order items found.');
        return;
      }

      const orderIds = [...new Set(orderItems.map((item) => item.order))];

      const { data: approvedOrders, error: approvedOrdersError } = await supabase
        .from('order')
        .select('id')
        .in('id', orderIds)
        .eq('status', 'Approved');

      if (approvedOrdersError) {
        console.error('Error fetching approved orders:', approvedOrdersError);
        return;
      }

      if (!approvedOrders || approvedOrders.length === 0) {
        console.log('No approved orders found.');
        return;
      }

      const approvedOrderIds = approvedOrders.map((order) => order.id);

      const { data: validOrderItems, error: validOrderItemsError } = await supabase
        .from('order_item')
        .select('product, quantity, created_at')
        .or(approvedOrderIds.map((id) => `order.eq.${id}`).join(','));

      if (validOrderItemsError) {
        console.error('Error fetching valid order items:', validOrderItemsError);
        return;
      }

      if (!validOrderItems || validOrderItems.length === 0) {
        console.log('No valid order items found.');
        return;
      }

      const productIds = [...new Set(validOrderItems.map((item) => item.product))];
      const { data: products, error: productsError } = await supabase
        .from('product')
        .select('id, title')
        .in('id', productIds);

      if (productsError) {
        console.error('Error fetching product data:', productsError);
        return;
      }

      const productMap = products.reduce((acc, product) => {
        acc[product.id] = product.title;
        return acc;
      }, {});

      const soldProductsArray = validOrderItems.map((orderItem) => ({
        product_name: productMap[orderItem.product] || 'Unknown Product',
        quantity: orderItem.quantity,
        created_at: orderItem.created_at,
      }));

      setSoldProducts(soldProductsArray);
      setFilteredSales(soldProductsArray);
    } catch (error) {
      console.error('Error in fetching sold products:', error);
    }
  };

  // Fetch Sold Products on Component Mount
  useEffect(() => {
    fetchSoldProducts();
  }, []);

  // Handle Add Product
  const handleAddProduct = async () => {
    const slug = slugify(title, { lower: true, strict: true });

    if (!title || !selectedCategory) {
      alert('Please enter product title and select a category.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('product')
        .insert([{ title, category: selectedCategory, maxQuantity: 0, slug }]);

      if (error) {
        console.error('Error adding product:', error);
        alert('Failed to add product.');
      } else {
        alert('Beverage added successfully!');
        window.location.reload();
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      alert('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Combined Data for a Specific Product
  const fetchCombinedData = async (productId: number) => {
    const { data: entries, error: entriesError } = await supabase
      .from('product_entries')
      .select('*')
      .eq('product_id', productId);

    if (entriesError) {
      console.error('Error fetching product entries:', entriesError);
      return;
    }

    const { data: soldItems, error: soldItemsError } = await supabase
      .from('order_item')
      .select('product, quantity, created_at')
      .eq('product', productId);

    if (soldItemsError) {
      console.error('Error fetching sold products:', soldItemsError);
      return;
    }

    const combined = [
      ...(entries?.map((entry) => ({ type: 'Entry', data: entry })) || []),
      ...(soldItems?.map((soldItem) => ({ type: 'Ordered', data: soldItem })) || []),
    ];

    setCombinedData(combined);
  };

  // Handle Product Click
  const handleProductClick = async (productId: number) => {
    setSelectedProductId(productId);
    await fetchCombinedData(productId);
  };

  // Handle Date Range Change
  const handleDateRangeChange = (value: [Date, Date]) => {
    setDateRange(value);

    const filtered = soldProducts.filter((sale) => {
      const saleDate = new Date(sale.created_at);
      return saleDate >= value[0] && saleDate <= value[1];
    });

    setFilteredSales(filtered);
  };

  // Get Most Selling Products
  const getMostSellingProducts = () => {
    const productSales: { [key: string]: number } = {};

    filteredSales.forEach((sale) => {
      if (productSales[sale.product_name]) {
        productSales[sale.product_name] += sale.quantity;
      } else {
        productSales[sale.product_name] = sale.quantity;
      }
    });

    return Object.entries(productSales)
      .map(([product, quantity]) => ({ product, quantity }))
      .sort((a, b) => b.quantity - a.quantity);
  };

  // Get Sales Trends Over Time
  const getSalesTrends = () => {
    const trends: { [key: string]: number } = {};

    filteredSales.forEach((sale) => {
      const date = new Date(sale.created_at).toLocaleDateString();
      if (trends[date]) {
        trends[date] += sale.quantity;
      } else {
        trends[date] = sale.quantity;
      }
    });

    return Object.entries(trends).map(([date, quantity]) => ({ date, quantity }));
  };

  // Pie Chart Data
  const pieChartData = getMostSellingProducts().map((item) => ({
    name: item.product,
    value: item.quantity,
  }));

  // Pie Chart Colors
  const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  // Handle Approve Entry
  const handleApproveEntry = async (entryId: number) => {
    const { error } = await supabase
      .from('product_entries')
      .update({ status: 'Approved' })
      .eq('id', entryId);

    if (error) {
      console.error('Error approving entry:', error);
      alert('Failed to approve entry.');
    } else {
      alert('Entry approved successfully!');
      if (selectedProductId) {
        await fetchCombinedData(selectedProductId);
      }
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex items-center gap-3">
          <span className="text-4xl">🥤</span>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
            Beverage Inventory Dashboard
          </h1>
        </div>

        {/* Add Product Button */}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="default" className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700">
              <span>➕</span>
              <span>Add New Beverage</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-lg max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span>🥤</span>
                <span>Add New Beverage</span>
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                Fill in the details below to add a new beverage to inventory.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Beverage Name</label>
                <Input
                  type="text"
                  placeholder="e.g. Cola, Orange Juice"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <Select onValueChange={(value) => setSelectedCategory(Number(value))}>
                  <SelectTrigger className="w-full border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500">
                    <SelectValue placeholder="Select a Category" />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg border-gray-200">
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={String(category.id)} className="hover:bg-gray-50">
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={handleAddProduct} 
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="animate-spin">🌀</span>
                    <span>Adding...</span>
                  </>
                ) : (
                  <>
                    <span>➕</span>
                    <span>Add Beverage</span>
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Inventory Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {products.map((product) => (
          <div 
            key={product.id} 
            className="p-5 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100"
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">{product.title}</h2>
                <p className="text-gray-600 text-sm mt-1">EN: #{product.id.toString().padStart(4, '0')}</p>
              </div>
              <span className="text-2xl">📦</span>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Available stock</p>
                <p className="text-2xl font-bold text-indigo-600">{product.maxQuantity} boxes</p>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    onClick={() => handleProductClick(product.id)}
                    variant="outline"
                    className="border-indigo-300 text-indigo-600 hover:bg-indigo-50 flex items-center gap-1"
                  >
                    <span>🔍</span>
                    <span>Details</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-lg max-w-2xl">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <span>📊</span>
                      <span>Transaction History for {product.title}</span>
                    </DialogTitle>
                  </DialogHeader>
                  <div className="max-h-[400px] overflow-auto">
                    <Table className="border-collapse">
                      <TableHeader className="bg-gray-50">
                        <TableRow>
                          <TableHead className="font-medium text-gray-700">Type</TableHead>
                          <TableHead className="font-medium text-gray-700">Quantity</TableHead>
                          <TableHead className="font-medium text-gray-700">Date</TableHead>
                          <TableHead className="font-medium text-gray-700">Created By</TableHead>
                          <TableHead className="font-medium text-gray-700">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {combinedData.map((item, index) => (
                          <TableRow key={index} className="border-b border-gray-100 hover:bg-gray-50">
                            <TableCell className={item.type === 'Entry' ? 'text-blue-600' : 'text-green-600'}>
                              {item.type === 'Entry' ? '📥 Inbound' : '📤 Ordered'}
                            </TableCell>
                            <TableCell>{item.data.quantity}</TableCell>
                            <TableCell>
                              {new Date(item.data.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              {item.type === 'Entry' ? item.data.Created_by : '-'}
                            </TableCell>
                            <TableCell>
                              {item.type === 'Entry' && item.data.status === 'Pending' ? (
                                <Button
                                  variant="outline"
                                  onClick={() => handleApproveEntry(item.data.id)}
                                  className="border-green-500 text-green-600 hover:bg-green-50 flex items-center gap-1"
                                >
                                  <span>✅</span>
                                  <span>Approve</span>
                                </Button>
                              ) : item.type === 'Entry' && item.data.status === 'Approved' ? (
                                <span className="flex items-center gap-1 text-green-600">
                                  <span>✔️</span>
                                  <span>Approved</span>
                                </span>
                              ) : (
                                '-'
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        ))}
      </div>

      {/* Analytics Dashboard */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <span>📈</span>
          <span>Sales Analytics</span>
        </h2>

        {/* Date Range Picker */}
        <div className="mb-6">
          <Card className="border border-gray-200 rounded-xl overflow-hidden">
            <CardHeader className="bg-gray-50 border-b border-gray-200">
              <CardTitle className="flex items-center gap-2">
                <span>📅</span>
                <span>Select Date Range</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex justify-center">
              <Calendar
                onChange={handleDateRangeChange as any}
                value={dateRange}
                selectRange={true}
                className="border-0 rounded-lg"
              />
            </CardContent>
          </Card>
        </div>

        {/* Sales Table */}
        <div className="mb-8">
          <Card className="border border-gray-200 rounded-xl overflow-hidden">
            <CardHeader className="bg-gray-50 border-b border-gray-200">
              <CardTitle className="flex items-center gap-2">
                <span>📋</span>
                <span>Sales Records</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[400px] overflow-auto">
                <Table>
                  <TableHeader className="bg-gray-50 sticky top-0">
                    <TableRow>
                      <TableHead className="font-medium text-gray-700">Beverage</TableHead>
                      <TableHead className="font-medium text-gray-700">Quantity Sold</TableHead>
                      <TableHead className="font-medium text-gray-700">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSales.map((sale, index) => (
                      <TableRow key={index} className="hover:bg-gray-50">
                        <TableCell className="font-medium">{sale.product_name}</TableCell>
                        <TableCell>{sale.quantity} boxes</TableCell>
                        <TableCell className="text-gray-600">
                          {new Date(sale.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Most Selling Products Bar Chart */}
          <Card className="border border-gray-200 rounded-xl overflow-hidden">
            <CardHeader className="bg-gray-50 border-b border-gray-200">
              <CardTitle className="flex items-center gap-2">
                <span>🏆</span>
                <span>Top Selling Beverages</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getMostSellingProducts()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="product" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white',
                        borderColor: '#e5e7eb',
                        borderRadius: '0.5rem',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Legend />
                    <Bar 
                      dataKey="quantity" 
                      fill="#6366F1" 
                      radius={[4, 4, 0, 0]}
                      name="Boxes Sold"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Sales Trends Line Chart */}
          <Card className="border border-gray-200 rounded-xl overflow-hidden">
            <CardHeader className="bg-gray-50 border-b border-gray-200">
              <CardTitle className="flex items-center gap-2">
                <span>📊</span>
                <span>Sales Trends</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getSalesTrends()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white',
                        borderColor: '#e5e7eb',
                        borderRadius: '0.5rem',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Legend />
                    <Bar 
                      dataKey="quantity" 
                      fill="#10B981" 
                      radius={[4, 4, 0, 0]}
                      name="Daily Sales"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Pie Chart for Sales Distribution */}
          <Card className="border border-gray-200 rounded-xl overflow-hidden lg:col-span-2">
            <CardHeader className="bg-gray-50 border-b border-gray-200">
              <CardTitle className="flex items-center gap-2">
                <span>🍹</span>
                <span>Beverage Sales Distribution</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      fill="#8884d8"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white',
                        borderColor: '#e5e7eb',
                        borderRadius: '0.5rem',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                      formatter={(value, name, props) => [
                        `${value} boxes`,
                        name
                      ]}
                    />
                    <Legend 
                      layout="horizontal"
                      verticalAlign="bottom"
                      align="center"
                      wrapperStyle={{ paddingTop: '20px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
