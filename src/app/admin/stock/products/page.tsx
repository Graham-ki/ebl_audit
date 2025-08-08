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
  DialogFooter,
  DialogClose,
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
  category: number;
};

type ProductEntry = {
  id: number;
  product_id: number;
  title: string;
  quantity: number;
  created_at: string;
  created_by: string;
  transaction: string;
};

type Category = {
  id: number;
  name: string;
};

export default function SummaryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productEntries, setProductEntries] = useState<ProductEntry[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [title, setTitle] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState<[Date, Date]>([
    new Date(new Date().setMonth(new Date().getMonth() - 1)),
    new Date(),
  ]);
  const [inflowForm, setInflowForm] = useState({
    date: new Date().toISOString().split('T')[0],
    product_id: '',
    source: '',
    quantity: '',
  });
  const [outflowForm, setOutflowForm] = useState({
    date: new Date().toISOString().split('T')[0],
    product_id: '',
    reason: '',
    quantity: '',
  });
  const [productToDelete, setProductToDelete] = useState<number | null>(null);
  const [availableQuantities, setAvailableQuantities] = useState<Record<number, number>>({});

  // Fetch Products List
  useEffect(() => {
    const fetchProducts = async () => {
      const { data, error } = await supabase.from('product').select('id, title, category');
      if (error) console.error('Error fetching products:', error);
      else {
        setProducts(data || []);
        // Initialize available quantities
        const quantities: Record<number, number> = {};
        data?.forEach(product => {
          quantities[product.id] = 0;
        });
        setAvailableQuantities(quantities);
      }
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

  // Fetch Product Entries and calculate available quantities
  useEffect(() => {
    const fetchProductEntries = async () => {
      const { data, error } = await supabase
        .from('product_entries')
        .select('*');

      if (error) {
        console.error('Error fetching product entries:', error);
        return;
      }

      setProductEntries(data || []);

      // Calculate available quantities
      const quantities: Record<number, number> = {};
      products.forEach(product => {
        quantities[product.id] = 0;
      });

      data?.forEach(entry => {
        if (!quantities[entry.product_id]) quantities[entry.product_id] = 0;
        quantities[entry.product_id] += entry.quantity;
      });

      setAvailableQuantities(quantities);
    };

    if (products.length > 0) {
      fetchProductEntries();
    }
  }, [products]);

  // Fetch Product Entries for a specific product
  const fetchProductEntriesForProduct = async (productId: number) => {
    const { data, error } = await supabase
      .from('product_entries')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });

    if (error) console.error('Error fetching product entries:', error);
    else setProductEntries(data || []);
  };

  // Handle Add Product
  const handleAddProduct = async () => {
    const slug = slugify(title, { lower: true, strict: true });

    if (!title || !selectedCategory) {
      alert('Please enter product title and select a category.');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('product')
        .insert([{ title, category: selectedCategory, slug }])
        .select();

      if (error) {
        console.error('Error adding product:', error);
        alert('Failed to add product.');
      } else if (data) {
        alert('Beverage added successfully!');
        setProducts(prev => [...prev, data[0]]);
        setAvailableQuantities(prev => ({ ...prev, [data[0].id]: 0 }));
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      alert('An unexpected error occurred.');
    } finally {
      setLoading(false);
      setTitle('');
      setSelectedCategory(null);
    }
  };

  // Handle Delete Product
  const handleDeleteProduct = async () => {
    if (!productToDelete) return;

    setDeleteLoading(true);

    try {
      // First delete all related entries
      const { error: entriesError } = await supabase
        .from('product_entries')
        .delete()
        .eq('product_id', productToDelete);

      if (entriesError) throw entriesError;

      // Then delete the product
      const { error: productError } = await supabase
        .from('product')
        .delete()
        .eq('id', productToDelete);

      if (productError) throw productError;

      alert('Beverage deleted successfully!');
      setProducts(prev => prev.filter(p => p.id !== productToDelete));
      setProductToDelete(null);
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete beverage. Please try again.');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Handle Product Click to view transactions
  const handleProductClick = async (productId: number) => {
    setSelectedProductId(productId);
    await fetchProductEntriesForProduct(productId);
  };

  // Handle Date Range Change
  const handleDateRangeChange = (value: [Date, Date]) => {
    setDateRange(value);
  };

  // Handle Inflow Form Change
  const handleInflowFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setInflowForm(prev => ({ ...prev, [name]: value }));
  };

  // Handle Outflow Form Change
  const handleOutflowFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setOutflowForm(prev => ({ ...prev, [name]: value }));
  };

  // Record Inflow Transaction
  const recordInflow = async () => {
    if (!inflowForm.product_id || !inflowForm.source || !inflowForm.quantity) {
      alert('Please fill all fields');
      return;
    }

    const productId = Number(inflowForm.product_id);
    const product = products.find(p => p.id === productId);
    if (!product) return;

    try {
      // Record the transaction
      const { error: entryError } = await supabase
        .from('product_entries')
        .insert([{
          product_id: productId,
          title: product.title,
          quantity: Number(inflowForm.quantity),
          created_at: inflowForm.date,
          created_by: 'Admin',
          transaction: inflowForm.source,
        }]);

      if (entryError) throw entryError;

      // Update available quantity locally
      setAvailableQuantities(prev => ({
        ...prev,
        [productId]: (prev[productId] || 0) + Number(inflowForm.quantity)
      }));

      alert('Inflow recorded successfully!');
      setInflowForm({
        date: new Date().toISOString().split('T')[0],
        product_id: '',
        source: '',
        quantity: '',
      });
    } catch (error) {
      console.error('Error recording inflow:', error);
      alert('Failed to record inflow');
    }
  };

  // Record Outflow Transaction
  const recordOutflow = async () => {
    if (!outflowForm.product_id || !outflowForm.reason || !outflowForm.quantity) {
      alert('Please fill all fields');
      return;
    }

    const productId = Number(outflowForm.product_id);
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const currentQuantity = availableQuantities[productId] || 0;
    if (currentQuantity < Number(outflowForm.quantity)) {
      alert('Not enough quantity available');
      return;
    }

    try {
      // Record the transaction
      const { error: entryError } = await supabase
        .from('product_entries')
        .insert([{
          product_id: productId,
          title: product.title,
          quantity: -Number(outflowForm.quantity), // Negative for outflow
          created_at: outflowForm.date,
          created_by: 'Admin',
          transaction: outflowForm.reason,
        }]);

      if (entryError) throw entryError;

      // Update available quantity locally
      setAvailableQuantities(prev => ({
        ...prev,
        [productId]: (prev[productId] || 0) - Number(outflowForm.quantity)
      }));

      alert('Outflow recorded successfully!');
      setOutflowForm({
        date: new Date().toISOString().split('T')[0],
        product_id: '',
        reason: '',
        quantity: '',
      });
    } catch (error) {
      console.error('Error recording outflow:', error);
      alert('Failed to record outflow');
    }
  };

  // Get category name by ID
  const getCategoryName = (categoryId: number) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : 'Unknown';
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


      {/* Beverage Inventory Table */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Beverage Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Beverage Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Available Quantity</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.title}</TableCell>
                  <TableCell>{getCategoryName(product.category)}</TableCell>
                  <TableCell>{availableQuantities[product.id] || 0}</TableCell>
                  <TableCell className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleProductClick(product.id)}
                        >
                          View Transactions
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl">
                        <DialogHeader>
                          <DialogTitle>Transaction History for {product.title}</DialogTitle>
                          <DialogDescription>
                            Available Quantity: {availableQuantities[product.id] || 0}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="max-h-[500px] overflow-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Reason/Source</TableHead>
                                <TableHead>Quantity</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {productEntries
                                .filter(entry => entry.product_id === product.id)
                                .map((entry) => (
                                  <TableRow key={entry.id}>
                                    <TableCell>
                                      {new Date(entry.created_at).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell>{entry.transaction}</TableCell>
                                    <TableCell className={entry.quantity > 0 ? 'text-green-600' : 'text-red-600'}>
                                      {entry.quantity > 0 ? '+' : ''}{entry.quantity}
                                    </TableCell>
                                  </TableRow>
                                ))}
                            </TableBody>
                          </Table>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Analytics Dashboard */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <span>📈</span>
          <span>Inventory Analytics</span>
        </h2>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Inventory Levels Bar Chart */}
          <Card className="border border-gray-200 rounded-xl overflow-hidden">
            <CardHeader className="bg-gray-50 border-b border-gray-200">
              <CardTitle className="flex items-center gap-2">
                <span>📊</span>
                <span>Inventory Levels</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={products.map(product => ({
                      name: product.title,
                      quantity: availableQuantities[product.id] || 0,
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" stroke="#6b7280" />
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
                      name="Available Quantity"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Inventory Distribution Pie Chart */}
          <Card className="border border-gray-200 rounded-xl overflow-hidden">
            <CardHeader className="bg-gray-50 border-b border-gray-200">
              <CardTitle className="flex items-center gap-2">
                <span>🍹</span>
                <span>Inventory Distribution</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={products.map(product => ({
                        name: product.title,
                        value: availableQuantities[product.id] || 0,
                      }))}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {products.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][index % 5]} />
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
                        `${value} units`,
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
