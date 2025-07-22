// app/predictions/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine
} from 'recharts';
import { createClient } from "@supabase/supabase-js";

interface FinanceRecord {
  created_at: string;
  amount_available: number;
}

interface ExpenseRecord {
  date: string;
  amount_spent: number;
  item: string;
}

interface Order {
  id: number;
  created_at: string;
  status: string;
}

interface OrderItem {
  order: number;
  quantity: number;
}

interface SupplyItem {
  purchase_date: string;
  balance: number;
}

// Simple linear trend calculation
const calculateTrend = (data: number[]) => {
  if (data.length < 2) return data;
  
  const n = data.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  
  data.forEach((y, x) => {
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  });
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  return data.map((_, i) => intercept + slope * i);
};

export default function Predictions() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    financeRecords: [] as FinanceRecord[],
    expenses: [] as ExpenseRecord[],
    orders: [] as Order[],
    orderItems: [] as OrderItem[],
    supplyItems: [] as SupplyItem[]
  });
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Debugging logs
  useEffect(() => {
    console.log('Current data state:', data);
  }, [data]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setFetchError(null);
      
      console.log('Starting data fetch...');
      
      const [
        { data: financeRecords, error: financeError },
        { data: expenses, error: expensesError },
        { data: orders, error: ordersError },
        { data: orderItems, error: orderItemsError },
        { data: supplyItems, error: supplyItemsError }
      ] = await Promise.all([
        supabase.from('finance').select('created_at, amount_available').order('created_at'),
        supabase.from('expenses').select('date, amount_spent, item').order('date'),
        supabase.from('order').select('id, created_at, status').order('created_at'),
        supabase.from('order_items').select('order, quantity'),
        supabase.from('supply_items').select('purchase_date, balance').order('purchase_date')
      ]);

      // Log errors if any
      if (financeError) console.error('Finance fetch error:', financeError);
      if (expensesError) console.error('Expenses fetch error:', expensesError);
      if (ordersError) console.error('Orders fetch error:', ordersError);
      if (orderItemsError) console.error('Order items fetch error:', orderItemsError);
      if (supplyItemsError) console.error('Supply items fetch error:', supplyItemsError);

      // Additional debug query for order relationships
      const { data: orderRelations, error: relationsError } = await supabase
        .from('order')
        .select(`
          id,
          status,
          order_items:order_items(quantity)
        `)
        .eq('status', 'Approved');
      
      console.log('Order relationships:', orderRelations);
      if (relationsError) console.error('Relations error:', relationsError);

      setData({
        financeRecords: financeRecords || [],
        expenses: expenses || [],
        orders: orders || [],
        orderItems: orderItems || [],
        supplyItems: supplyItems || []
      });

      console.log('Data fetch completed');
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setFetchError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Process and format data for predictions with validation
  const processedData = useMemo(() => {
    console.log('Processing data...');
    
    try {
      // Validate order items
      const validOrderItems = data.orderItems.filter(item => 
        typeof item.order === 'number' && typeof item.quantity === 'number'
      );
      
      if (validOrderItems.length !== data.orderItems.length) {
        console.warn('Invalid order items filtered out:', 
          data.orderItems.length - validOrderItems.length);
      }

      // Group financial data by month
      const monthlyFinances = data.financeRecords.reduce((acc, record) => {
        try {
          const date = new Date(record.created_at);
          const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          acc[monthYear] = (acc[monthYear] || 0) + (record.amount_available || 0);
          return acc;
        } catch (e) {
          console.error('Error processing finance record:', record, e);
          return acc;
        }
      }, {} as Record<string, number>);

      // Group expenses by month
      const monthlyExpenses = data.expenses.reduce((acc, expense) => {
        try {
          const date = new Date(expense.date);
          const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          acc[monthYear] = (acc[monthYear] || 0) + (expense.amount_spent || 0);
          return acc;
        } catch (e) {
          console.error('Error processing expense:', expense, e);
          return acc;
        }
      }, {} as Record<string, number>);

      // Group sales by month - with enhanced debugging
      const monthlySales: Record<string, number> = {};
      const approvedOrders = data.orders.filter(order => {
        const status = order.status?.trim().toLowerCase();
        return status === 'approved';
      });

      console.log('Approved orders:', approvedOrders);
      console.log('All order items:', validOrderItems);

      approvedOrders.forEach(order => {
        try {
          const date = new Date(order.created_at);
          const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          
          const orderItems = validOrderItems.filter(oi => oi.order === order.id);
          console.log(`Items for order ${order.id}:`, orderItems);
          
          const orderQuantity = orderItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
          
          monthlySales[monthYear] = (monthlySales[monthYear] || 0) + orderQuantity;
        } catch (e) {
          console.error('Error processing order:', order, e);
        }
      });

      console.log('Monthly sales:', monthlySales);

      // Convert to arrays and sort by date
      const financeArray = Object.entries(monthlyFinances)
        .map(([monthYear, amount]) => ({
          monthYear,
          amount,
          date: new Date(monthYear)
        }))
        .sort((a, b) => a.date.getTime() - b.date.getTime());

      const expensesArray = Object.entries(monthlyExpenses)
        .map(([monthYear, amount]) => ({
          monthYear,
          amount,
          date: new Date(monthYear)
        }))
        .sort((a, b) => a.date.getTime() - b.date.getTime());

      const salesArray = Object.entries(monthlySales)
        .map(([monthYear, quantity]) => ({
          monthYear,
          quantity,
          date: new Date(monthYear)
        }))
        .sort((a, b) => a.date.getTime() - b.date.getTime());

      return {
        finances: financeArray,
        expenses: expensesArray,
        sales: salesArray
      };
    } catch (error) {
      console.error('Error processing data:', error);
      return {
        finances: [],
        expenses: [],
        sales: []
      };
    }
  }, [data]);

  // Generate trend data for charts
  const trendData = useMemo(() => {
    try {
      const financeTrend = calculateTrend(processedData.finances.map(d => d.amount));
      const expenseTrend = calculateTrend(processedData.expenses.map(d => d.amount));
      const salesTrend = calculateTrend(processedData.sales.map(d => d.quantity));
      
      return {
        finances: financeTrend,
        expenses: expenseTrend,
        sales: salesTrend
      };
    } catch (error) {
      console.error('Error calculating trends:', error);
      return {
        finances: [],
        expenses: [],
        sales: []
      };
    }
  }, [processedData]);

  // Calculate current cash position with validation
  const currentCash = useMemo(() => {
    try {
      const totalAvailable = data.financeRecords.reduce(
        (sum, record) => sum + (record.amount_available || 0), 0);
      const totalExpenses = data.expenses.reduce(
        (sum, expense) => sum + (expense.amount_spent || 0), 0);
      return totalAvailable - totalExpenses;
    } catch (error) {
      console.error('Error calculating current cash:', error);
      return 0;
    }
  }, [data.financeRecords, data.expenses]);

  // Calculate total sales volume from approved orders with enhanced debugging
  const totalSalesVolume = useMemo(() => {
    console.log('Calculating total sales volume...');
    
    try {
      // 1. Get all approved order IDs (case-insensitive check)
      const approvedOrderIds = data.orders
        .filter(order => {
          const status = order.status?.trim().toLowerCase();
          const isApproved = status === 'approved';
          if (!isApproved) {
            console.log(`Order ${order.id} has status '${order.status}' - not approved`);
          }
          return isApproved;
        })
        .map(order => order.id);

      console.log('Approved order IDs:', approvedOrderIds);

      // 2. Sum quantities for these orders
      const itemsForApprovedOrders = data.orderItems.filter(item => {
        const isIncluded = approvedOrderIds.includes(item.order);
        if (!isIncluded) {
          console.log(`Order item for order ${item.order} not included - order not approved`);
        }
        return isIncluded;
      });

      console.log('Order items for approved orders:', itemsForApprovedOrders);

      const total = itemsForApprovedOrders.reduce((sum, item) => {
        const quantity = item.quantity || 0;
        if (isNaN(quantity)) {
          console.warn('Invalid quantity for order item:', item);
          return sum;
        }
        return sum + quantity;
      }, 0);

      console.log('Total sales volume calculated:', total);
      return total;
    } catch (error) {
      console.error('Error calculating sales volume:', error);
      return 0;
    }
  }, [data.orders, data.orderItems]);

  // Calculate burn rate (average monthly expenses)
  const burnRate = useMemo(() => {
    try {
      if (processedData.expenses.length < 1) return 0;
      const totalExpenses = processedData.expenses.reduce((sum, e) => sum + e.amount, 0);
      return totalExpenses / processedData.expenses.length;
    } catch (error) {
      console.error('Error calculating burn rate:', error);
      return 0;
    }
  }, [processedData.expenses]);

  // Calculate runway (how many months until funds run out)
  const runway = useMemo(() => {
    try {
      if (burnRate <= 0) return Infinity;
      return currentCash / burnRate;
    } catch (error) {
      console.error('Error calculating runway:', error);
      return Infinity;
    }
  }, [currentCash, burnRate]);

  // Calculate growth rates with validation
  const growthRates = useMemo(() => {
    try {
      if (processedData.finances.length < 2 || processedData.sales.length < 2) {
        return { financeGrowth: 0, salesGrowth: 0 };
      }
      
      const financeGrowth = 
        (processedData.finances[processedData.finances.length - 1].amount - 
         processedData.finances[0].amount) / 
        Math.max(1, processedData.finances[0].amount) * 100;
      
      const salesGrowth = 
        (processedData.sales[processedData.sales.length - 1].quantity - 
         processedData.sales[0].quantity) / 
        Math.max(1, processedData.sales[0].quantity) * 100;
      
      return {
        financeGrowth: isNaN(financeGrowth) ? 0 : financeGrowth,
        salesGrowth: isNaN(salesGrowth) ? 0 : salesGrowth
      };
    } catch (error) {
      console.error('Error calculating growth rates:', error);
      return { financeGrowth: 0, salesGrowth: 0 };
    }
  }, [processedData]);

  // Prepare chart data with consistent property names
  const financeChartData = processedData.finances.map((d, i) => ({
    date: d.monthYear,
    actual: d.amount,
    trend: trendData.finances[i] || 0
  }));

  const expenseChartData = processedData.expenses.map((d, i) => ({
    date: d.monthYear,
    actual: d.amount,
    trend: trendData.expenses[i] || 0
  }));

  const salesChartData = processedData.sales.map((d, i) => ({
    date: d.monthYear,
    actual: d.quantity,
    trend: trendData.sales[i] || 0
  }));

  // Find the last date in the historical data
  const lastHistoricalDate = processedData.finances.length > 0 
    ? processedData.finances[processedData.finances.length - 1].monthYear
    : '';

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="bg-red-50 p-6 rounded-lg max-w-md">
          <h2 className="text-xl font-bold text-red-600 mb-2">Error Loading Data</h2>
          <p className="text-red-800">{fetchError}</p>
          <button 
            onClick={fetchData}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Financial Predictions Dashboard
        </h1>
        <p className="text-gray-600">Data-driven financial insights and trend analysis</p>
      </header>

      {/* Debug Panel */}
      <div className="bg-yellow-50 p-4 rounded-lg mb-8 border border-yellow-200">
        <h3 className="font-bold text-yellow-800 mb-2">Debug Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <h4 className="font-medium">Approved Orders</h4>
            <div className="text-xs overflow-auto max-h-40 bg-white p-2 rounded">
              {data.orders.filter(o => o.status?.trim().toLowerCase() === 'approved').length > 0 ? (
                <pre>{JSON.stringify(
                  data.orders.filter(o => o.status?.trim().toLowerCase() === 'approved'),
                  null, 2
                )}</pre>
              ) : (
                <p className="text-red-500">No approved orders found</p>
              )}
            </div>
          </div>
          <div>
            <h4 className="font-medium">Order Items</h4>
            <div className="text-xs overflow-auto max-h-40 bg-white p-2 rounded">
              <pre>{JSON.stringify(data.orderItems, null, 2)}</pre>
            </div>
          </div>
          <div>
            <h4 className="font-medium">Sales Calculation</h4>
            <div className="text-sm">
              <p>Approved Orders: {data.orders.filter(o => o.status?.trim().toLowerCase() === 'approved').length}</p>
              <p>Order Items: {data.orderItems.length}</p>
              <p>Matched Items: {data.orderItems.filter(oi => 
                data.orders.some(o => 
                  o.id === oi.order && o.status?.trim().toLowerCase() === 'approved'
                )
              ).length}</p>
              <p className="font-bold mt-2">Total Sales Volume: {totalSalesVolume} units</p>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-medium text-gray-700 mb-1">Current Cash</h3>
          <p className={`text-2xl font-bold ${
            currentCash >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {currentCash.toLocaleString()} UGX
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {currentCash >= 0 ? 'Healthy' : 'Critical'} position
          </p>
        </div>
        
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-medium text-gray-700 mb-1">Monthly Burn Rate</h3>
          <p className="text-2xl font-bold text-red-600">
            {burnRate.toLocaleString()} UGX
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Avg. monthly expenses
          </p>
        </div>
        
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-medium text-gray-700 mb-1">Runway</h3>
          <p className={`text-2xl font-bold ${
            runway >= 6 ? 'text-green-600' : runway >= 3 ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {runway === Infinity ? '∞' : runway.toFixed(1)} months
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {runway >= 6 ? 'Comfortable' : runway >= 3 ? 'Monitor closely' : 'Immediate action needed'}
          </p>
        </div>
        
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-medium text-gray-700 mb-1">Revenue Growth</h3>
          <p className={`text-2xl font-bold ${
            growthRates.financeGrowth >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {growthRates.financeGrowth.toFixed(1)}%
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {growthRates.financeGrowth >= 0 ? 'Growing' : 'Declining'} MoM
          </p>
        </div>
      </div>

      {/* Financial Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Cash Flow Trend */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Cash Flow Trend</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={financeChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    `${value.toLocaleString()} UGX`, 
                    name === 'actual' ? 'Actual' : 'Trend'
                  ]}
                  labelFormatter={(label) => `Period: ${label}`}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="actual" 
                  name="Actual"
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="trend" 
                  name="Trend"
                  stroke="#10b981" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                />
                {lastHistoricalDate && (
                  <ReferenceLine 
                    x={lastHistoricalDate} 
                    stroke="#ef4444" 
                    label={{ 
                      value: 'Current', 
                      position: 'top',
                      fill: '#ef4444'
                    }} 
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <p>Trend analysis based on historical cash flow data. {growthRates.financeGrowth >= 0 ? 
              `Growing at ${growthRates.financeGrowth.toFixed(1)}% monthly` : 
              `Declining at ${Math.abs(growthRates.financeGrowth).toFixed(1)}% monthly`}</p>
          </div>
        </div>

        {/* Expense Trend */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Expense Trend</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={expenseChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    `${value.toLocaleString()} UGX`, 
                    name === 'actual' ? 'Actual' : 'Trend'
                  ]}
                  labelFormatter={(label) => `Period: ${label}`}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="actual" 
                  name="Actual"
                  stroke="#ef4444" 
                  fill="#fecaca"
                  strokeWidth={2}
                />
                <Area 
                  type="monotone" 
                  dataKey="trend" 
                  name="Trend"
                  stroke="#f59e0b" 
                  fill="#fef3c7"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                />
                {lastHistoricalDate && (
                  <ReferenceLine 
                    x={lastHistoricalDate} 
                    stroke="#ef4444" 
                    label={{ 
                      value: 'Current', 
                      position: 'top',
                      fill: '#ef4444'
                    }} 
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <p>Expense trend showing {burnRate > processedData.expenses[0]?.amount ? 
              'increasing' : 'decreasing'} monthly expenses.</p>
          </div>
        </div>
      </div>

      {/* Sales Analysis */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Sales Analysis</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      `${value.toLocaleString()} units`, 
                      name === 'actual' ? 'Actual' : 'Trend'
                    ]}
                    labelFormatter={(label) => `Period: ${label}`}
                  />
                  <Legend />
                  <Bar 
                    dataKey="actual" 
                    name="Actual Sales"
                    fill="#8b5cf6"
                  />
                  <Bar 
                    dataKey="trend" 
                    name="Trend"
                    fill="#a78bfa"
                    opacity={0.7}
                  />
                  {lastHistoricalDate && (
                    <ReferenceLine 
                      x={lastHistoricalDate} 
                      stroke="#8b5cf6" 
                      label={{ 
                        value: 'Current', 
                        position: 'top',
                        fill: '#8b5cf6'
                      }} 
                    />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              <p>Sales trend showing {growthRates.salesGrowth >= 0 ? 
                `growth of ${growthRates.salesGrowth.toFixed(1)}%` : 
                `decline of ${Math.abs(growthRates.salesGrowth).toFixed(1)}%`} month-over-month.</p>
            </div>
          </div>
          
          <div>
            <h3 className="font-medium mb-2">Sales Insights</h3>
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-1">Current Growth Rate</h4>
                <p className={`text-xl font-bold ${
                  growthRates.salesGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {growthRates.salesGrowth.toFixed(1)}%
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Month-over-month sales {growthRates.salesGrowth >= 0 ? 'growth' : 'decline'}
                </p>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg">
                <h4 className="font-medium text-purple-800 mb-1">Peak Performance</h4>
                {salesChartData.length > 0 && (
                  <>
                    <p className="text-xl font-bold text-purple-600">
                      {Math.max(...salesChartData.map(s => s.actual)).toLocaleString()} units
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Highest monthly sales volume achieved
                    </p>
                  </>
                )}
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium text-green-800 mb-1">Recent Performance</h4>
                {salesChartData.length > 0 && (
                  <>
                    <p className={`text-xl font-bold ${
                      salesChartData[salesChartData.length - 1].actual >= 
                      (salesChartData[salesChartData.length - 2]?.actual || 0) ? 
                      'text-green-600' : 'text-red-600'
                    }`}>
                      {salesChartData[salesChartData.length - 1].actual.toLocaleString()} units
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Last month's sales volume
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Health */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Financial Health</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium text-blue-800 mb-1">Liquidity Ratio</h3>
            <p className={`text-2xl font-bold ${
              currentCash >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {(currentCash / (burnRate || 1)).toFixed(1)}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Months of operating cash available
            </p>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="font-medium text-purple-800 mb-1">Expense Coverage</h3>
            <p className={`text-2xl font-bold ${
              (currentCash / (data.expenses.reduce((sum, e) => sum + (e.amount_spent || 0), 0) || 1)) >= 1 ? 'text-green-600' : 'text-red-600'
            }`}>
              {(currentCash / (data.expenses.reduce((sum, e) => sum + (e.amount_spent || 0), 0) || 1)).toFixed(1)}x
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Current cash vs. total expenses
            </p>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-medium text-green-800 mb-1">Growth Potential</h3>
            <p className={`text-2xl font-bold ${
              growthRates.financeGrowth >= 10 ? 'text-green-600' : 
              growthRates.financeGrowth >= 0 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {growthRates.financeGrowth.toFixed(1)}%
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Revenue growth rate
            </p>
          </div>
        </div>
        
        {/* Financial Health Alert */}
        <div className={`p-4 rounded-lg ${
          runway < 3 ? 'bg-red-50 border-l-4 border-red-400' :
          runway < 6 ? 'bg-yellow-50 border-l-4 border-yellow-400' :
          'bg-green-50 border-l-4 border-green-400'
        }`}>
          <div className="flex">
            <div className="flex-shrink-0">
              {runway < 3 ? (
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              ) : runway < 6 ? (
                <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="ml-3">
              <h3 className={`text-sm font-medium ${
                runway < 3 ? 'text-red-800' : runway < 6 ? 'text-yellow-800' : 'text-green-800'
              }`}>
                {runway < 3 ? 'Critical Alert' : runway < 6 ? 'Warning' : 'Good Status'}
              </h3>
              <div className={`mt-2 text-sm ${
                runway < 3 ? 'text-red-700' : runway < 6 ? 'text-yellow-700' : 'text-green-700'
              }`}>
                <p>
                  {runway < 3 ? 
                    'Immediate action required: Cash runway is critically low.' :
                    runway < 6 ? 
                    'Monitor closely: Cash position may become tight in the near future.' :
                    'Healthy cash position detected. Current runway is sufficient.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
