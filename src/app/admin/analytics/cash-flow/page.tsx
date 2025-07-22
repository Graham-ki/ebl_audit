// app/cash-flow/page.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Expense {
  id: string;
  item: string;
  amount_spent: number;
  department: string;
  date: string;
}

interface Finance {
  id: number;
  total_amount: number;
  amount_paid: number;
  mode_of_payment: 'Cash' | 'Bank' | 'Mobile Money';
  created_at: string;
}

export default function CashFlow() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [finances, setFinances] = useState<Finance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('week');
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const { data: expensesData, error: expensesError } = await supabase
          .from('expenses')
          .select('*').order('date',{ascending:false});

        const { data: financesData, error: financesError } = await supabase
          .from('finance')
          .select('*').order('created_at',{ascending:false});

        if (expensesError || financesError) {
          throw expensesError || financesError;
        }

        setExpenses(expensesData || []);
        setFinances(financesData || []);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'UGX'
    }).format(amount);
  };

  // Process data for trends charts
  const getTrendData = () => {
    const dataMap = new Map<string, { date: string, income: number, expenses: number }>();

    // Process finances (income)
    finances.forEach(finance => {
      const date = new Date(finance.created_at);
      const dateKey = timeRange === 'day' 
        ? date.toLocaleDateString() 
        : timeRange === 'week' 
          ? `Week ${Math.ceil(date.getDate() / 7)}` 
          : date.toLocaleDateString('en-US', { month: 'short' });

      if (!dataMap.has(dateKey)) {
        dataMap.set(dateKey, { date: dateKey, income: 0, expenses: 0 });
      }
      const entry = dataMap.get(dateKey)!;
      entry.income += finance.amount_paid;
    });

    // Process expenses
    expenses.forEach(expense => {
      const date = new Date(expense.date);
      const dateKey = timeRange === 'day' 
        ? date.toLocaleDateString() 
        : timeRange === 'week' 
          ? `Week ${Math.ceil(date.getDate() / 7)}` 
          : date.toLocaleDateString('en-US', { month: 'short' });

      if (!dataMap.has(dateKey)) {
        dataMap.set(dateKey, { date: dateKey, income: 0, expenses: 0 });
      }
      const entry = dataMap.get(dateKey)!;
      entry.expenses += expense.amount_spent;
    });

    return Array.from(dataMap.values()).sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
  };

  // Process data for payment method distribution
  const getPaymentMethodData = () => {
    const paymentMethods = {
      'Cash': 0,
      'Bank': 0,
      'Mobile Money': 0
    };

    finances.forEach(finance => {
      paymentMethods[finance.mode_of_payment] += finance.amount_paid;
    });

    return Object.entries(paymentMethods).map(([name, value]) => ({
      name,
      value
    }));
  };

  // Calculate totals for comparison
  const getComparisonData = () => {
    const totalIncome = finances.reduce((sum, finance) => sum + finance.amount_paid, 0);
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount_spent, 0);
    const netDifference = totalIncome - totalExpenses;

    return [
      { name: 'Income', value: totalIncome, fill: '#4ade80' },
      { name: 'Expenses', value: totalExpenses, fill: '#f87171' },
      { name: 'Net', value: netDifference, fill: netDifference >= 0 ? '#4ade80' : '#f87171' }
    ];
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28'];

  if (isLoading) {
    return (
      <div className="min-h-screen p-6 bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-600">Loading cash flow data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <span className="text-blue-500">📈</span> Cash Flow Dashboard
            </h1>
            <p className="text-gray-600">Track income and expenses over time</p>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as 'day' | 'week' | 'month')}
              className="px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="day">Daily</option>
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
            </select>
            <input
              type="date"
              value={selectedDate.toISOString().split('T')[0]}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </header>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-300 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Income vs Expenses Comparison */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="text-green-500">↑</span> Income vs Expenses
          </h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={getComparisonData()}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Bar dataKey="value" name="Amount">
                  {getComparisonData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4 text-center">
            {getComparisonData().map((item) => (
              <div key={item.name} className="p-3 rounded-lg bg-gray-50">
                <p className="text-sm font-medium text-gray-500">{item.name}</p>
                <p className={`text-lg font-semibold ${
                  item.name === 'Net' 
                    ? item.value >= 0 ? 'text-green-600' : 'text-red-600'
                    : item.name === 'Income' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(item.value)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Method Distribution */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="text-purple-500">💳</span> Account Deposits
          </h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={getPaymentMethodData()}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {getPaymentMethodData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4">
            {getPaymentMethodData().map((method, index) => (
              <div key={method.name} className="flex items-center">
                <div 
                  className="w-3 h-3 rounded-full mr-2" 
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-sm">
                  {method.name}: {formatCurrency(method.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cash Flow Trends */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span className="text-blue-500">📊</span> Cash Flow Trends ({timeRange === 'day' ? 'Daily' : timeRange === 'week' ? 'Weekly' : 'Monthly'})
        </h2>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={getTrendData()}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Legend />
              <Line
                type="monotone"
                dataKey="income"
                name="Income"
                stroke="#4ade80"
                strokeWidth={2}
                activeDot={{ r: 8 }}
              />
              <Line
                type="monotone"
                dataKey="expenses"
                name="Expenses"
                stroke="#f87171"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="text-red-500">↓</span> Recent Expenses
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {expenses.slice(0, 5).map((expense) => (
                  <tr key={expense.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {expense.item}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                      {formatCurrency(expense.amount_spent)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {expense.department}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(expense.date)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="text-green-500">↑</span> Recent Income
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount Paid
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Account
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {finances.slice(0, 5).map((finance) => (
                  <tr key={finance.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      {formatCurrency(finance.amount_paid)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrency(finance.total_amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {finance.mode_of_payment}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(finance.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
