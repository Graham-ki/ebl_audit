// app/financial-health/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { createClient } from "@supabase/supabase-js";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

// Color palette for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28DFF', '#FF6E83'];

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Type definitions
type ExpenseDetail = {
  id: string;
  date: string;
  amount: number;
  department?: string;
  account?: string;
};

type ExpenseItem = {
  name: string;
  value: number;
  department?: string;
  details: ExpenseDetail[];
};

type FinancialData = {
  liquidityRatio: number;
  cashFlowRatio: number;
  burnRate: number;
  runway: number;
  cashAtHand: number;
  totalDeposits: number;
  totalLiabilities: number;
  totalExpenses: number;
  totalAmountAvailable: number;
  expenseByItem: ExpenseItem[];
  liabilitiesStatus: { name: string; value: number }[];
  monthlyTrends: { month: string; inflow: number; outflow: number; net: number }[];
  largestExpenses: ExpenseItem[];
  recentTransactions: { description: string; amount: number; type: 'income' | 'expense'; date: string }[];
};

// Tooltip explanations
const metricExplanations = {
  liquidityRatio: "Measures ability to pay short-term debts. Ratio >1.5 is healthy.",
  cashFlowRatio: "Shows if operating cash covers current liabilities. ≥1 is good.",
  burnRate: "Net monthly cash loss. Negative means you're gaining cash.",
  runway: "Months until cash runs out at current burn rate. 6+ months is ideal.",
  cashAtHand: "Actual available cash.",
  totalDeposits: "Total money received from all sources.",
  totalLiabilities: "Total unpaid obligations to suppliers/service providers.",
  totalExpenses: "Sum of all expenses in the selected period.",
  totalAmountAvailable: "Total funds available before expenses."
};

export default function FinancialHealth() {
  // State management
  const [data, setData] = useState<FinancialData>({
    liquidityRatio: 0,
    cashFlowRatio: 0,
    burnRate: 0,
    runway: 0,
    cashAtHand: 0,
    totalDeposits: 0,
    totalLiabilities: 0,
    totalExpenses: 0,
    totalAmountAvailable: 0,
    expenseByItem: [],
    liabilitiesStatus: [],
    monthlyTrends: [],
    largestExpenses: [],
    recentTransactions: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: new Date(new Date().setMonth(new Date().getMonth() - 6)),
    end: new Date()
  });
  const [selectedExpense, setSelectedExpense] = useState<ExpenseItem | null>(null);
  const [showExpenseDetails, setShowExpenseDetails] = useState(false);

  // Fetch data with error handling
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Format dates for query
      const startDate = dateRange.start.toISOString().split('T')[0];
      const endDate = dateRange.end.toISOString().split('T')[0];

      // Execute all queries in parallel
      const results = await Promise.allSettled([
        supabase
          .from('expenses')
          .select('id, item, amount_spent, date, department, account')
          .gte('date', startDate)
          .lte('date', endDate),
        supabase
          .from('finance')
          .select('amount_paid, amount_available, created_at')
          .gte('created_at', startDate)
          .lte('created_at', endDate),
        supabase
          .from('supply_items')
          .select('total_cost, amount_paid, balance, created_at')
          .gte('created_at', startDate)
          .lte('created_at', endDate)
      ]);

      // Check for errors
      const errors = results
        .filter(result => result.status === 'rejected')
        .map(result => (result as PromiseRejectedResult).reason);

      if (errors.length > 0) {
        throw new Error(`Failed to fetch data: ${errors.join(', ')}`);
      }

      // Extract data from successful promises
      const [
        { data: expenses },
        { data: finance },
        { data: liabilities }
      ] = results.map(result => 
        (result as PromiseFulfilledResult<any>).value
      );

      // Process data
      const processedData = processFinancialData(
        expenses || [],
        finance || [],
        liabilities || []
      );
      setData(processedData);
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  // Handle date range change
  const handleDateChange = (newRange: { start: Date; end: Date }) => {
    setDateRange(newRange);
  };

  // Fetch data when date range changes
  useEffect(() => {
    fetchData();
  }, [dateRange]);

  // Process raw data into metrics
  const processFinancialData = (
    expenses: any[],
    finance: any[],
    liabilities: any[]
  ): FinancialData => {
    // Calculate totals
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount_spent || 0), 0);
    const totalDeposits = finance.reduce((sum, f) => sum + (f.amount_paid || 0), 0);
    const totalAmountAvailable = finance.reduce((sum, f) => sum + (f.amount_available || 0), 0);
    const cashAtHand = totalAmountAvailable - totalExpenses;
    const totalLiabilities = liabilities.reduce((sum, l) => sum + (l.balance || 0), 0);
    const totalPaidLiabilities = liabilities.reduce((sum, l) => sum + (l.amount_paid || 0), 0);

    // Group expenses by item with all details
    const expenseMap = new Map<string, ExpenseItem>();
    
    expenses.forEach(expense => {
      if (!expense?.item) return;
      
      const existing = expenseMap.get(expense.item);
      const detail = {
        id: expense.id,
        date: expense.date,
        amount: expense.amount_spent || 0,
        department: expense.department,
        account: expense.account
      };

      if (existing) {
        existing.value += detail.amount;
        existing.details.push(detail);
      } else {
        expenseMap.set(expense.item, { 
          name: expense.item, 
          value: detail.amount,
          details: [detail]
        });
      }
    });

    const expenseByItem = Array.from(expenseMap.values());

    // Sort and get top expenses
    expenseByItem.sort((a, b) => b.value - a.value);
    const largestExpenses = [...expenseByItem].slice(0, 3);

    // Create monthly trends
    const monthlyTrends = [
      { month: 'Current Period', inflow: totalDeposits, outflow: totalExpenses, net: totalDeposits - totalExpenses }
    ];

    // Create recent transactions list
    const recentTransactions = [
      ...expenses.map(e => ({
        description: e.item,
        amount: -(e.amount_spent || 0),
        type: 'expense' as const,
        date: e.date
      })),
      ...finance.map(f => ({
        description: 'Deposit',
        amount: f.amount_paid || 0,
        type: 'income' as const,
        date: f.created_at
      }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Calculate financial ratios
    const liquidityRatio = totalLiabilities > 0 ? cashAtHand / totalLiabilities : 0;
    const cashFlowRatio = totalLiabilities > 0 ? (totalDeposits - totalExpenses) / totalLiabilities : 0;
    const burnRate = totalExpenses - totalDeposits;
    const runway = cashAtHand > 0 ? Math.round(cashAtHand / Math.max(burnRate, 1)) : 0;

    return {
      liquidityRatio,
      cashFlowRatio,
      burnRate,
      runway,
      cashAtHand,
      totalDeposits,
      totalLiabilities,
      totalExpenses,
      totalAmountAvailable,
      expenseByItem,
      liabilitiesStatus: [
        { name: 'Paid', value: totalPaidLiabilities },
        { name: 'Pending', value: totalLiabilities }
      ],
      monthlyTrends,
      largestExpenses,
      recentTransactions
    };
  };

  // View expense details
  const viewExpenseDetails = (expense: ExpenseItem) => {
    setSelectedExpense(expense);
    setShowExpenseDetails(true);
  };

  // Loading skeleton UI
  const LoadingSkeleton = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-gray-200 rounded-xl animate-pulse" />
        <div className="space-y-2">
          <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
          <div className="h-4 bg-gray-200 rounded w-64 animate-pulse" />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white p-5 rounded-lg shadow">
            <div className="h-5 bg-gray-200 rounded w-3/4 mb-2 animate-pulse" />
            <div className="h-8 bg-gray-200 rounded w-full mb-3 animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-full animate-pulse" />
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-white p-5 rounded-lg shadow">
            <div className="h-5 bg-gray-200 rounded w-1/2 mb-4 animate-pulse" />
            <div className="h-64 bg-gray-200 rounded w-full animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );

  // Date range picker component
  const DateRangePicker = ({ 
    onChange, 
    initialRange 
  }: { 
    onChange: (range: { start: Date; end: Date }) => void;
    initialRange: { start: Date; end: Date };
  }) => {
    const [start, setStart] = useState(initialRange.start.toISOString().split('T')[0]);
    const [end, setEnd] = useState(initialRange.end.toISOString().split('T')[0]);

    const handleApply = () => {
      const startDate = new Date(start);
      const endDate = new Date(end);
      if (startDate <= endDate) {
        onChange({ start: startDate, end: endDate });
      }
    };

    return (
      <div className="flex flex-col sm:flex-row gap-2 mt-4">
        <div className="flex items-center">
          <label className="mr-2 text-sm text-gray-600">From:</label>
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
            max={end}
          />
        </div>
        <div className="flex items-center">
          <label className="mr-2 text-sm text-gray-600">To:</label>
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
            min={start}
          />
        </div>
        <button
          onClick={handleApply}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
        >
          Apply
        </button>
      </div>
    );
  };

  // Metric card component with tooltip
  const MetricCard = ({ 
    title, 
    value, 
    idealRange, 
    isGood, 
    description,
    metricKey,
    isCurrency = false, 
    unit = '',
    loading = false
  }: {
    title: string;
    value: number;
    idealRange: string;
    isGood: boolean;
    description: string;
    metricKey: keyof typeof metricExplanations;
    isCurrency?: boolean;
    unit?: string;
    loading?: boolean;
  }) => (
    <div className="bg-white p-5 rounded-lg shadow relative group">
      <h3 className="text-sm font-medium text-gray-500 mb-1 flex items-center">
        {title}
        <span className="ml-1 text-gray-400 cursor-help" title={metricExplanations[metricKey]}>
          (?)
        </span>
      </h3>
      {loading ? (
        <div className="h-8 bg-gray-200 rounded w-3/4 mb-2 animate-pulse" />
      ) : (
        <p className="text-2xl font-bold text-gray-900 m-0 mb-1">
          {isCurrency ? 'UGX ' : ''}{value.toLocaleString()}{unit ? ` ${unit}` : ''}
        </p>
      )}
      <div className="flex items-center mb-1">
        {!loading && (
          <>
            <div className={`w-3 h-3 rounded-full mr-2 ${isGood ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-gray-500">Ideal: {idealRange}</span>
          </>
        )}
      </div>
      {loading ? (
        <div className="h-4 bg-gray-200 rounded w-full animate-pulse" />
      ) : (
        <p className="text-xs text-gray-500 m-0">{description}</p>
      )}
    </div>
  );

  // Chart card component
  const ChartCard = ({ 
    title, 
    children, 
    className = ''
  }: {
    title: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <div className={`bg-white p-5 rounded-lg shadow ${className}`}>
      <h3 className="text-sm font-medium text-gray-500 mb-4">{title}</h3>
      {children}
    </div>
  );

  // Error display component
  const ErrorDisplay = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
    <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
      <h3 className="text-lg font-medium text-red-800">Error</h3>
      <p className="text-red-700">{message}</p>
      <button
        onClick={onRetry}
        className="mt-2 px-4 py-2 bg-red-100 text-red-800 rounded hover:bg-red-200"
      >
        Retry
      </button>
    </div>
  );

  // Expense Details Modal
  const ExpenseDetailsModal = () => {
    if (!selectedExpense) return null;

    // Calculate total spent on this item
    const totalSpent = selectedExpense.details.reduce((sum, detail) => sum + detail.amount, 0);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {selectedExpense.name}
                </h3>
                <p className="text-lg text-gray-700">
                  Total Spent: UGX {totalSpent.toLocaleString()}
                </p>
              </div>
              <button 
                onClick={() => setShowExpenseDetails(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <h4 className="font-medium mb-3">Transaction Details:</h4>
            {selectedExpense.details.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                      {selectedExpense.details.some(d => d.department) && (
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                      )}
                      {selectedExpense.details.some(d => d.account) && (
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Source Account</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedExpense.details.map((detail) => (
                      <tr key={detail.id}>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                          {detail.date ? new Date(detail.date).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                          UGX {detail.amount?.toLocaleString() || '0'}
                        </td>
                        {selectedExpense.details.some(d => d.department) && (
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                            {detail.department || 'N/A'}
                          </td>
                        )}
                        {selectedExpense.details.some(d => d.account) && (
                          <td className="px-4 py-2 text-sm text-gray-500">
                            {detail.account || 'N/A'}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500">No detailed transaction records available</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Expense Item Component with Percentage Bar
  const ExpenseItem = ({ expense, totalExpenses, index }: { expense: ExpenseItem, totalExpenses: number, index: number }) => {
    const percentage = (expense.value / totalExpenses) * 100;
    const color = COLORS[index % COLORS.length];
    
    return (
      <div className="py-3 px-4 border-b border-gray-100 hover:bg-gray-50">
        <div className="flex justify-between items-center mb-1">
          <p className="font-medium truncate">{expense.name}</p>
          <span className="font-medium whitespace-nowrap ml-4">
            UGX {expense.value.toLocaleString()}
          </span>
        </div>
        
        <div className="flex items-center">
          <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
            <div 
              className="h-2.5 rounded-full" 
              style={{ 
                width: `${percentage}%`,
                backgroundColor: color
              }}
            />
          </div>
          <span className="text-xs text-gray-500">{percentage.toFixed(1)}%</span>
        </div>
        
        <div className="flex justify-end mt-2">
          <button 
            onClick={() => viewExpenseDetails(expense)}
            className="px-3 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 text-sm"
          >
            View Details
          </button>
        </div>
      </div>
    );
  };

  // Expense Breakdown Component
  const ExpenseBreakdown = ({ expenses, totalExpenses }: { expenses: ExpenseItem[], totalExpenses: number }) => (
    <div className="border rounded-lg overflow-hidden">
      {expenses.length > 0 ? (
        <div className="max-h-[300px] overflow-y-auto">
          {expenses.map((expense, index) => (
            <ExpenseItem 
              key={index} 
              expense={expense} 
              totalExpenses={totalExpenses} 
              index={index} 
            />
          ))}
        </div>
      ) : (
        <div className="p-4 text-center text-gray-500">
          No expenses recorded for this period
        </div>
      )}
    </div>
  );

  // Main render
  return (
    <div className="min-h-screen p-6 bg-gray-50">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
            <span className="text-2xl">💓</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 m-0">Financial Health Status</h1>
            <p className="text-gray-500 m-0 text-sm">
              {dateRange.start.toLocaleDateString()} - {dateRange.end.toLocaleDateString()}
            </p>
          </div>
        </div>
        <DateRangePicker onChange={handleDateChange} initialRange={dateRange} />
      </header>

      {/* Error state */}
      {error && <ErrorDisplay message={error} onRetry={fetchData} />}

      {/* Loading state */}
      {loading && <LoadingSkeleton />}

      {/* Data display */}
      {!loading && !error && (
        <>
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            <MetricCard 
              title="Liquidity Ratio" 
              value={data.liquidityRatio} 
              idealRange="1.5-3" 
              isGood={data.liquidityRatio >= 1.5}
              description="Current assets vs liabilities"
              metricKey="liquidityRatio"
            />
            <MetricCard 
              title="Operating Cash Flow" 
              value={data.cashFlowRatio} 
              idealRange="≥1" 
              isGood={data.cashFlowRatio >= 1}
              description="Operating cash vs liabilities"
              metricKey="cashFlowRatio"
            />
            <MetricCard 
              title="Monthly Burn Rate" 
              value={data.burnRate} 
              isCurrency={true}
              idealRange="Negative" 
              isGood={data.burnRate < 0}
              description="Net monthly cash flow"
              metricKey="burnRate"
            />
            <MetricCard 
              title="Cash Runway" 
              value={data.runway} 
              unit="months"
              idealRange="6+ months" 
              isGood={data.runway >= 6}
              description="Months until cash runs out"
              metricKey="runway"
            />
            <MetricCard 
              title="Cash At Hand" 
              value={data.cashAtHand} 
              isCurrency={true}
              idealRange="Positive" 
              isGood={data.cashAtHand >= 0}
              description="Actual available cash"
              metricKey="cashAtHand"
            />
            <MetricCard 
              title="Total Deposits" 
              value={data.totalDeposits} 
              isCurrency={true}
              idealRange="Monitor growth" 
              isGood={true}
              description="Total money received"
              metricKey="totalDeposits"
            />
            <MetricCard 
              title="Total Expenses" 
              value={data.totalExpenses} 
              isCurrency={true}
              idealRange="Monitor reduction" 
              isGood={false}
              description="Total money spent"
              metricKey="totalExpenses"
            />
            <MetricCard 
              title="Total Liabilities" 
              value={data.totalLiabilities} 
              isCurrency={true}
              idealRange="Monitor reduction" 
              isGood={false}
              description="Unpaid obligations"
              metricKey="totalLiabilities"
            />
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
            <ChartCard title="Cash Flow Trend">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip 
                      formatter={(value, name) => [
                        `UGX ${Number(value).toLocaleString()}`,
                        name === 'inflow' ? 'Income' : 
                        name === 'outflow' ? 'Expenses' : 'Net'
                      ]}
                    />
                    <Area type="monotone" dataKey="inflow" stroke="#4ade80" fill="#bbf7d0" name="Income" />
                    <Area type="monotone" dataKey="outflow" stroke="#f87171" fill="#fecaca" name="Expenses" />
                    <Area type="monotone" dataKey="net" stroke="#60a5fa" fill="#bfdbfe" name="Net" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Expenses Breakdown">
              <ExpenseBreakdown 
                expenses={data.expenseByItem} 
                totalExpenses={data.totalExpenses} 
              />
            </ChartCard>
          </div>

          {/* Recommendations */}
          <ChartCard title="Actionable Insights">
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-800">Cash Position Summary</h4>
                <p className="text-sm text-blue-700">
                  Available: UGX {data.totalAmountAvailable.toLocaleString()} | 
                  Spent: UGX {data.totalExpenses.toLocaleString()} | 
                  Cash At Hand: UGX {data.cashAtHand.toLocaleString()}
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  Runway: {data.runway} months | 
                  Liabilities: UGX {data.totalLiabilities.toLocaleString()}
                </p>
              </div>

              <ul className="list-disc pl-5 space-y-2 text-gray-700">
                {data.liquidityRatio < 1.5 && (
                  <li>Increase cash reserves to improve liquidity (current ratio: {data.liquidityRatio.toFixed(2)})</li>
                )}
                {data.cashFlowRatio < 1 && (
                  <li>Improve operating cash flow by increasing revenue or reducing expenses</li>
                )}
                {data.burnRate > 0 && (
                  <li>Reduce monthly burn rate (currently UGX {data.burnRate.toLocaleString()})</li>
                )}
                {data.runway < 6 && (
                  <li>Extend cash runway beyond current {data.runway} months by increasing deposits or reducing expenses</li>
                )}
                {data.largestExpenses.length > 0 && (
                  <li>
                    Review top expenses: {data.largestExpenses.map((e, i) => (
                      <span key={i}>
                        {e.name} (UGX {e.value.toLocaleString()}){i < data.largestExpenses.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </li>
                )}
                {data.cashAtHand < data.totalLiabilities && (
                  <li className="text-red-600 font-medium">
                    Warning: Cash at hand is less than pending liabilities
                  </li>
                )}
              </ul>
            </div>
          </ChartCard>
        </>
      )}

      {/* Expense Details Modal */}
      {showExpenseDetails && <ExpenseDetailsModal />}
    </div>
  );
}
