// app/optimization/page.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, Legend
} from 'recharts';
import { createClient } from "@supabase/supabase-js";

interface SupplyItem {
  name: string;
  quantity: number;
  price: number;
  total_cost: number;
  amount_paid: number;
  balance: number;
  purchase_date: string;
}

interface Expense {
  item: string;
  amount_spent: number;
  date: string;
  department?: string;
}

interface Finance {
  amount_available: number;
  created_at: string;
}

interface Material {
  name: string;
  unit: number;
  cost: number;
}

interface Product {
  title: string;
  maQuantity: number;
}

interface OrderItem {
  id?: number;
  order: number;
  product_id: number;
  quantity: number;
  price?: number;
}

interface Employee {
  name: string;
  role: string;
  start_date: string;
  salary: number;
  status: string;
}

export default function Optimization() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    supplyItems: [] as SupplyItem[],
    expenses: [] as Expense[],
    finances: [] as Finance[],
    materials: [] as Material[],
    products: [] as Product[],
    approvedOrderItems: [] as OrderItem[],
    taxPayments: [] as Expense[],
    nssfPayments: [] as Expense[],
    otherTaxPayments: [] as Expense[],
    employees: [] as Employee[],
    salaryPayments: [] as Expense[]
  });
  
  const [inputs, setInputs] = useState({
    newHires: 0,
    purchaseAmount: 0,
    sellingPrice: 0,
    projectedRevenue: 0,
    newHireSalary: 0,
    fixedCosts: 5000000
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      try {
        console.log('Starting data fetch...');
        
        const [
          { data: supplyItems, error: supplyError }, 
          { data: expenses, error: expensesError }, 
          { data: finances, error: financeError },
          { data: materials, error: materialsError },
          { data: products, error: productsError },
          { data: employees, error: employeesError }
        ] = await Promise.all([
          supabase.from('supply_items').select('*'),
          supabase.from('expenses').select('*'),
          supabase.from('finance').select('*'),
          supabase.from('materials').select('*'),
          supabase.from('product').select('*'),
          supabase.from('employees').select('*')
        ]);

        // Log any errors from initial fetches
        if (supplyError) console.error('Supply items error:', supplyError);
        if (expensesError) console.error('Expenses error:', expensesError);
        if (financeError) console.error('Finance error:', financeError);
        if (materialsError) console.error('Materials error:', materialsError);
        if (productsError) console.error('Products error:', productsError);
        if (employeesError) console.error('Employees error:', employeesError);

        // Fetch salary payments
        const { data: salaryPayments, error: salaryError } = await supabase
          .from('expenses')
          .select('*')
          .eq('item', 'Salary');
        
        if (salaryError) console.error('Salary payments error:', salaryError);

        // Fetch tax payments
        const { data: taxPayments, error: taxError } = await supabase
          .from('expenses')
          .select('*')
          .or('item.eq.Tax,department.eq.URA');
        
        if (taxError) console.error('Tax payments error:', taxError);

        // Fetch NSSF payments
        const { data: nssfPayments, error: nssfError } = await supabase
          .from('expenses')
          .select('*')
          .or('item.eq.NSSF,department.eq.NSSF');
        
        if (nssfError) console.error('NSSF payments error:', nssfError);

        // Fetch other tax payments
        const { data: otherTaxPayments, error: otherTaxError } = await supabase
          .from('expenses')
          .select('*')
          .ilike('item', '%tax%')
          .neq('item', 'Tax')
          .neq('item', 'NSSF')
          .neq('department', 'URA')
          .neq('department', 'NSSF');
        
        if (otherTaxError) console.error('Other tax payments error:', otherTaxError);

        // Fetch approved orders and their items
        console.log('Fetching approved orders...');
        const { data: approvedOrders, error: ordersError } = await supabase
          .from('order')
          .select('id')
          .eq('status', 'Approved');
        
        if (ordersError) {
          console.error('Approved orders error:', ordersError);
        } else {
          console.log('Found approved orders:', approvedOrders);
        }

        let approvedOrderItems: OrderItem[] = [];
if (approvedOrders && approvedOrders.length > 0) {
  const orderIds = approvedOrders.map(order => order.id);
  console.log('Fetching order items for order IDs:', orderIds);

  try {
    // First try the standard .in() method
    const { data: items, error } = await supabase
      .from('order_item')
      .select('*')
      .in('order', orderIds);

    if (error) throw error;
    
    approvedOrderItems = items || [];
    console.log('Found order items using .in():', approvedOrderItems);
  } catch (error) {
    console.error('Standard .in() failed, trying alternative methods:', error);
    
    // Fallback 1: Using .or() with multiple .eq()
    try {
      const orConditions = orderIds.map(id => `order.eq.${id}`).join(',');
      const { data: items, error: orError } = await supabase
        .from('order_item')
        .select('*')
        .or(orConditions);

      if (orError) throw orError;
      
      approvedOrderItems = items || [];
      console.log('Found order items using .or():', approvedOrderItems);
    } catch (orError) {
      console.error('.or() method failed, trying raw filter:', orError);
      
      // Fallback 2: Using raw filter syntax
      try {
        const { data: items, error: rawError } = await supabase
          .from('order_item')
          .select('*')
          .filter('order', 'in', `(${orderIds.join(',')})`);

        if (rawError) throw rawError;
        
        approvedOrderItems = items || [];
        console.log('Found order items using raw filter:', approvedOrderItems);
      } catch (rawError) {
        console.error('Raw filter failed, trying manual filtering:', rawError);
        
        // Final Fallback: Fetch all and filter client-side
        try {
          const { data: allItems, error: allError } = await supabase
            .from('order_item')
            .select('*');

          if (allError) throw allError;
          
          approvedOrderItems = allItems?.filter(item => 
            orderIds.includes(item.order)
          ) || [];
          console.log('Filtered order items client-side:', approvedOrderItems);
        } catch (finalError) {
          console.error('All methods failed:', finalError);
        }
      }
    }
  }

  if (approvedOrderItems.length === 0) {
    console.warn('No order items found after trying all methods');
  }
}
        
        setData({
          supplyItems: supplyItems || [],
          expenses: expenses || [],
          finances: finances || [],
          materials: materials || [],
          products: products || [],
          approvedOrderItems,
          taxPayments: taxPayments || [],
          nssfPayments: nssfPayments || [],
          otherTaxPayments: otherTaxPayments || [],
          employees: employees || [],
          salaryPayments: salaryPayments || []
        });

        console.log('Data fetch completed. Approved order items count:', approvedOrderItems.length);
      } catch (error) {
        console.error('Error in fetchData:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Current cash position
  const totalAvailable = data.finances.reduce((sum, item) => sum + (item.amount_available || 0), 0);
  const totalExpenses = data.expenses.reduce((sum, item) => sum + (item.amount_spent || 0), 0);
  const currentCash = totalAvailable - totalExpenses;

  // Employee calculations
  const totalEmployees = data.employees.length;
  const totalMonthlySalary = data.salaryPayments.reduce((sum, payment) => sum + (payment.amount_spent || 0), 0);
  const avgEmployeeSalary = totalEmployees > 0 ? totalMonthlySalary / totalEmployees : 0;

  // What-if scenarios
  const monthlyExpenses = data.expenses
    .filter(e => new Date(e.date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
    .reduce((sum, item) => sum + (item.amount_spent || 0), 0);
  
  const projectedPayroll = totalMonthlySalary + (inputs.newHires * (inputs.newHireSalary || avgEmployeeSalary));
  const projectedCash = currentCash - inputs.purchaseAmount - (inputs.newHires * (inputs.newHireSalary || avgEmployeeSalary));

  // Break-even calculations
  const productionCostPerUnit = data.materials.reduce((sum, material) => 
    sum + ((material.unit || 0) * (material.cost || 0)), 0);
  
  const totalSalesVolume = data.approvedOrderItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
  console.log('Calculating sales volume:', {
    approvedOrderItemsCount: data.approvedOrderItems.length,
    totalSalesVolume
  });
  
  const breakEvenPoint = inputs.sellingPrice > 0 
    ? Math.ceil(inputs.fixedCosts / (inputs.sellingPrice - productionCostPerUnit))
    : 0;

  // Tax calculations
  const totalTaxPayments = data.taxPayments.reduce((sum, payment) => sum + (payment.amount_spent || 0), 0);
  const totalNSSFPayments = data.nssfPayments.reduce((sum, payment) => sum + (payment.amount_spent || 0), 0);
  const totalOtherTaxPayments = data.otherTaxPayments.reduce((sum, tax) => sum + (tax.amount_spent || 0), 0);
  
  const totalFinances = data.finances.reduce((sum, f) => sum + (f.amount_available || 0), 0);
  const avgTaxRate = data.taxPayments.length > 0 && totalFinances > 0 
    ? totalTaxPayments / totalFinances
    : 0.18;
  
  const projectedTax = inputs.projectedRevenue * avgTaxRate;
  const projectedNSSF = data.nssfPayments.length > 0 
    ? totalNSSFPayments / data.nssfPayments.length
    : 100000;
  
  const avgOtherTaxes = data.otherTaxPayments.length > 0 
    ? totalOtherTaxPayments / data.otherTaxPayments.length 
    : 0;

  // Chart data preparation
  const cashFlowData = [
    { name: 'Available', value: totalAvailable },
    { name: 'Expenses', value: totalExpenses },
    { name: 'Current', value: currentCash }
  ];

  const expenseBreakdown = data.expenses
    .filter(e => e.item && e.amount_spent)
    .reduce((acc, item) => {
      const existing = acc.find(i => i.name === item.item);
      if (existing) {
        existing.value += item.amount_spent || 0;
      } else {
        acc.push({ name: item.item, value: item.amount_spent || 0 });
      }
      return acc;
    }, [] as {name: string, value: number}[])
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const taxPaymentData = [...data.taxPayments, ...data.nssfPayments, ...data.otherTaxPayments]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(payment => ({
      date: new Date(payment.date).toLocaleDateString(),
      amount: payment.amount_spent || 0,
      type: payment.department?.includes('URA') ? 'URA Tax' : 
            payment.department?.includes('NSSF') ? 'NSSF' : 
            payment.item
    }));

  // Enhanced break-even chart data with proper labels
  const breakEvenChartData = [
    { 
      units: 0, 
      cost: inputs.fixedCosts, 
      revenue: 0,
      label: `Fixed Costs: ${inputs.fixedCosts.toLocaleString()} UGX` 
    },
    { 
      units: breakEvenPoint / 2, 
      cost: inputs.fixedCosts + (productionCostPerUnit * breakEvenPoint / 2), 
      revenue: inputs.sellingPrice * breakEvenPoint / 2,
      label: `Midpoint: ${(inputs.sellingPrice * breakEvenPoint / 2).toLocaleString()} UGX Revenue`
    },
    { 
      units: breakEvenPoint, 
      cost: inputs.fixedCosts + (productionCostPerUnit * breakEvenPoint), 
      revenue: inputs.sellingPrice * breakEvenPoint,
      label: `Break-even: ${breakEvenPoint} units, ${(inputs.sellingPrice * breakEvenPoint).toLocaleString()} UGX`
    },
    { 
      units: breakEvenPoint * 1.5, 
      cost: inputs.fixedCosts + (productionCostPerUnit * breakEvenPoint * 1.5), 
      revenue: inputs.sellingPrice * breakEvenPoint * 1.5,
      label: `Profit Zone: ${(inputs.sellingPrice * breakEvenPoint * 0.5).toLocaleString()} UGX Profit`
    }
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
          <p className="font-semibold">{label} units</p>
          <p className="text-sm text-gray-600">{payload[0].payload.label}</p>
          <p className="text-red-500">Cost: {payload[0].value.toLocaleString()} UGX</p>
          <p className="text-green-500">Revenue: {payload[1].value.toLocaleString()} UGX</p>
          <p className="text-blue-500">Profit: {(payload[1].value - payload[0].value).toLocaleString()} UGX</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Financial Optimization Dashboard
            </h1>
            <p className="text-gray-600">Actionable insights to maximize financial efficiency</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setActiveTab('overview')} 
              className={`px-4 py-2 rounded-lg ${activeTab === 'overview' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
            >
              Overview
            </button>
            <button 
              onClick={() => setActiveTab('scenarios')} 
              className={`px-4 py-2 rounded-lg ${activeTab === 'scenarios' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
            >
              Scenarios
            </button>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-900">Cash Position</h3>
                </div>
                <p className={`text-3xl font-bold mb-4 ${currentCash >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {currentCash.toLocaleString()} UGX
                </p>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cashFlowData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${value} UGX`, 'Amount']} />
                      <Bar dataKey="value" fill="#3B82F6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  {currentCash >= 0 ? 'Healthy cash position' : 'Warning: Negative cash position'}
                </p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-900">Expense Breakdown</h3>
                </div>
                <p className="text-3xl font-bold mb-4 text-gray-900">
                  {totalExpenses.toLocaleString()} UGX
                </p>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={expenseBreakdown}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${value} UGX`, 'Amount']} />
                      <Area type="monotone" dataKey="value" stroke="#EF4444" fill="#FEE2E2" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Top {expenseBreakdown.length} expense categories
                </p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="font-semibold text-gray-900">Employees & Payroll</h3>
                </div>
                <p className="text-3xl font-bold mb-1 text-gray-900">
                  {totalEmployees}
                </p>
                <p className="text-sm text-gray-500 mb-4">Total employees</p>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Total Monthly Payroll:</span>
                    <span className="font-medium">{totalMonthlySalary.toLocaleString()} UGX</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Average Salary:</span>
                    <span className="font-medium">{avgEmployeeSalary.toLocaleString()} UGX</span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500">Recent hires:</p>
                  <div className="space-y-1">
                    {data.employees
                      .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())
                      .slice(0, 2)
                      .map((emp, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span className="truncate">{emp.name}</span>
                          <span>{emp.salary.toLocaleString()} UGX</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900">What-If Scenarios</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  New Hires Impact
                </h3>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Number of New Hires</label>
                  <input
                    type="number"
                    value={inputs.newHires}
                    onChange={(e) => setInputs({...inputs, newHires: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Salary per Hire (UGX)</label>
                  <input
                    type="number"
                    value={inputs.newHireSalary || avgEmployeeSalary}
                    onChange={(e) => setInputs({...inputs, newHireSalary: parseInt(e.target.value) || avgEmployeeSalary})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="bg-gray-50 p-3 rounded-md">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Current Monthly Payroll:</span>
                    <span className="font-medium">{totalMonthlySalary.toLocaleString()} UGX</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Projected Monthly Payroll:</span>
                    <span className="font-medium text-purple-600">{projectedPayroll.toLocaleString()} UGX</span>
                  </div>
                </div>
                {inputs.newHires > 0 && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-md">
                    <p className="text-sm text-blue-800">
                      Hiring {inputs.newHires} new employees at {(inputs.newHireSalary || avgEmployeeSalary).toLocaleString()} UGX each will increase monthly payroll by {(inputs.newHires * (inputs.newHireSalary || avgEmployeeSalary)).toLocaleString()} UGX.
                    </p>
                  </div>
                )}
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Large Purchase Impact
                </h3>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Amount (UGX)</label>
                  <input
                    type="number"
                    value={inputs.purchaseAmount}
                    onChange={(e) => setInputs({...inputs, purchaseAmount: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="bg-gray-50 p-3 rounded-md">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Current Cash:</span>
                    <span className="font-medium">{currentCash.toLocaleString()} UGX</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Projected Cash:</span>
                    <span className={`font-medium ${projectedCash >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {projectedCash.toLocaleString()} UGX
                    </span>
                  </div>
                </div>
                {inputs.purchaseAmount > 0 && (
                  <div className={`mt-3 p-3 rounded-md ${projectedCash >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                    <p className={`text-sm ${projectedCash >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                      {projectedCash >= 0 
                        ? 'This purchase will maintain a positive cash position.' 
                        : 'Warning: This purchase will result in negative cash.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900">Break-Even Analysis</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price per Unit (UGX)</label>
                  <input
                    type="number"
                    value={inputs.sellingPrice}
                    onChange={(e) => setInputs({...inputs, sellingPrice: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fixed Costs (UGX)</label>
                  <input
                    type="number"
                    value={inputs.fixedCosts}
                    onChange={(e) => setInputs({...inputs, fixedCosts: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Production Cost per box:</span>
                    <span className="font-medium">{productionCostPerUnit.toLocaleString()} UGX</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Current Sales Volume:</span>
                    <span className="font-medium">{totalSalesVolume} boxes</span>
                  </div>
                </div>
              </div>

              {inputs.sellingPrice > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-3 text-center">Break-Even Point</h3>
                  <div className="text-center mb-4">
                    <p className="text-2xl font-bold text-green-600">
                      {breakEvenPoint} boxes
                    </p>
                    <p className="text-sm text-gray-600">
                      needed to cover costs
                    </p>
                  </div>

                  <div className={`p-3 rounded-md ${totalSalesVolume >= breakEvenPoint ? 'bg-green-50' : 'bg-yellow-50'}`}>
                    <p className={`text-sm ${totalSalesVolume >= breakEvenPoint ? 'text-green-800' : 'text-yellow-800'}`}>
                      {totalSalesVolume >= breakEvenPoint
                        ? `You're currently ${totalSalesVolume - breakEvenPoint} boxes above break-even.`
                        : `You need ${breakEvenPoint - totalSalesVolume} more boxes to reach break-even.`}
                    </p>
                  </div>

                  {inputs.sellingPrice > 0 && productionCostPerUnit > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium mb-1">Profit Margin per box:</p>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                          className="bg-green-600 h-2.5 rounded-full" 
                          style={{ width: `${((inputs.sellingPrice - productionCostPerUnit) / inputs.sellingPrice) * 100}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 text-right">
                        {Math.round(((inputs.sellingPrice - productionCostPerUnit) / inputs.sellingPrice) * 100)}%
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {inputs.sellingPrice > 0 && (
              <div className="mt-6 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={breakEvenChartData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="units" 
                      label={{ value: 'Boxes Sold', position: 'insideBottomRight', offset: -5 }} 
                    />
                    <YAxis 
                      label={{ value: 'UGX', angle: -90, position: 'insideLeft' }} 
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="cost" 
                      stackId="1" 
                      stroke="#EF4444" 
                      fill="#FEE2E2" 
                      name="Total Cost" 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stackId="2" 
                      stroke="#10B981" 
                      fill="#D1FAE5" 
                      name="Revenue" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900">Tax Liability Estimator</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Projected Revenue (UGX)</label>
                  <input
                    type="number"
                    value={inputs.projectedRevenue}
                    onChange={(e) => setInputs({...inputs, projectedRevenue: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Historical Tax Rate:</span>
                    <span className="font-medium">{Math.round(avgTaxRate * 100)}%</span>
                  </div>
                  {data.nssfPayments.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-sm">Average NSSF Payment:</span>
                      <span className="font-medium">
                        {projectedNSSF.toLocaleString()} UGX
                      </span>
                    </div>
                  )}
                  {data.otherTaxPayments.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-sm">Other Taxes (Avg):</span>
                      <span className="font-medium">
                        {avgOtherTaxes.toLocaleString()} UGX
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {inputs.projectedRevenue > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-3 text-center">Projected Tax Obligations</h3>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between">
                      <span className="text-sm">URA Tax ({Math.round(avgTaxRate * 100)}%):</span>
                      <span className="font-medium">{projectedTax.toLocaleString()} UGX</span>
                    </div>
                    {data.nssfPayments.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-sm">NSSF Contribution:</span>
                        <span className="font-medium">{projectedNSSF.toLocaleString()} UGX</span>
                      </div>
                    )}
                    {data.otherTaxPayments.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-sm">Other Taxes:</span>
                        <span className="font-medium">{avgOtherTaxes.toLocaleString()} UGX</span>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-gray-200 pt-3">
                    <div className="flex justify-between font-semibold">
                      <span>Total Estimated Tax:</span>
                      <span className="text-indigo-600">{(projectedTax + projectedNSSF + avgOtherTaxes).toLocaleString()} UGX</span>
                    </div>
                  </div>

                  <div className="mt-3 bg-blue-50 p-3 rounded-md">
                    <p className="text-sm text-blue-800">
                      Based on historical data. Set aside {(projectedTax + projectedNSSF + avgOtherTaxes).toLocaleString()} UGX for tax obligations.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {inputs.projectedRevenue > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium mb-2">Tax Payment History</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={taxPaymentData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${value} UGX`, 'Amount']} />
                      <Bar dataKey="amount" name="Amount">
                        {taxPaymentData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={
                              entry.type === 'URA Tax' ? '#6366F1' : 
                              entry.type === 'NSSF' ? '#8B5CF6' : 
                              '#A78BFA'
                            } 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
