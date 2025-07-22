'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { createClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function AnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<{
    paymentAnalysis: any[];
    supplierData: any[];
    metrics: {
      totalOrders: number;
      onTimePercentage: number;
      averageDaysLate: number;
      totalSuppliers: number;
      totalSpend: number;
      outstanding: number;
    };
    chartData: {
      paymentStatus: any[];
      topCustomers: any[];
      vendorPaymentStatus: any[];
      topSuppliers: any[];
    };
  } | null>(null);

  const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all data at once
        const [
          { data: orders, error: ordersError },
          { data: payments, error: paymentsError },
          { data: users, error: usersError },
          { data: suppliers, error: suppliersError },
          { data: supplyItems, error: supplyItemsError }
        ] = await Promise.all([
          supabase.from('order').select('id, user, status, created_at').not('user', 'is', null),
          supabase.from('finance').select('user_id, order_id, total_amount, amount_paid, created_at').not('order_id', 'is', null),
          supabase.from('users').select('id, name'),
          supabase.from('suppliers').select('id, name'),
          supabase.from('supply_items').select('purchase_date, quantity, price, supplier_id, amount_paid')
        ]);

        if (ordersError || paymentsError || usersError || suppliersError || supplyItemsError) {
          throw new Error('Failed to fetch data from one or more tables');
        }

        if (!orders || !payments || !users || !suppliers || !supplyItems) {
          throw new Error('No data returned from one or more tables');
        }

        // Process customer payment data
        const userMap = new Map(users.map(user => [user.id, user.name]));
        
        const paymentAnalysis = orders.map(order => {
          const userPayments = payments.filter(p => p.order_id === order.id);
          const firstPayment = userPayments.sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0];
          
          const orderDate = new Date(order.created_at);
          const paymentDate = firstPayment ? new Date(firstPayment.created_at) : null;
          
          const daysLate = paymentDate ? 
            Math.floor((paymentDate.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24)) : null;
          
          return {
            userId: order.user,
            userName: userMap.get(order.user),
            orderId: order.id,
            orderDate: order.created_at,
            paymentDate: firstPayment?.created_at,
            totalAmount: firstPayment?.total_amount,
            amountPaid: firstPayment?.amount_paid,
            daysLate,
            status: daysLate === null ? 'Unpaid' : daysLate <= 0 ? 'On Time' : 'Late'
          };
        });

        // Calculate customer metrics
        const totalOrders = paymentAnalysis.length;
        const onTimePayments = paymentAnalysis.filter(p => p.status === 'On Time').length;
        const latePayments = paymentAnalysis.filter(p => p.status === 'Late').length;
        const unpaidOrders = paymentAnalysis.filter(p => p.status === 'Unpaid').length;
        const onTimePercentage = totalOrders > 0 ? Math.round((onTimePayments / totalOrders) * 100) : 0;
        const averageDaysLate = paymentAnalysis.filter(p => p.daysLate && p.daysLate > 0)
          .reduce((acc, curr) => acc + (curr.daysLate || 0), 0) / latePayments || 0;

        // Process customer charts data
        const userOrders = paymentAnalysis.reduce((acc, curr) => {
          if (!curr.userName) return acc;
          if (!acc[curr.userName]) {
            acc[curr.userName] = { orders: 0, late: 0, onTime: 0 };
          }
          acc[curr.userName].orders++;
          if (curr.status === 'Late') acc[curr.userName].late++;
          if (curr.status === 'On Time') acc[curr.userName].onTime++;
          return acc;
        }, {} as Record<string, { orders: number; late: number; onTime: number }>);

        const topCustomers = Object.entries(userOrders)
          .sort((a, b) => b[1].orders - a[1].orders)
          .slice(0, 5)
          .map(([name, data]) => ({ name, ...data }));

        const paymentStatusData = [
          { name: 'On Time', value: onTimePayments },
          { name: 'Late', value: latePayments },
          { name: 'Unpaid', value: unpaidOrders },
        ];

        // Process vendor data
        const supplierMap = new Map(suppliers.map(supplier => [supplier.id, supplier.name]));
        
        const supplierAnalysis = supplyItems.reduce((acc, item) => {
          const supplierName = supplierMap.get(item.supplier_id) || 'Unknown';
          if (!acc[supplierName]) {
            acc[supplierName] = {
              totalSpend: 0,
              totalPaid: 0,
              items: 0,
              outstanding: 0
            };
          }
          acc[supplierName].totalSpend += item.price * (item.quantity || 1);
          acc[supplierName].totalPaid += item.amount_paid || 0;
          acc[supplierName].items += 1;
          acc[supplierName].outstanding = acc[supplierName].totalSpend - acc[supplierName].totalPaid;
          return acc;
        }, {} as Record<string, { totalSpend: number; totalPaid: number; items: number; outstanding: number }>);

        const supplierData = Object.entries(supplierAnalysis)
          .map(([name, data]) => ({ name, ...data }));

        const topSuppliers = [...supplierData].sort((a, b) => b.totalSpend - a.totalSpend).slice(0, 5);
        const vendorPaymentStatusData = [
          { name: 'Paid', value: supplierData.reduce((acc, curr) => acc + curr.totalPaid, 0) },
          { name: 'Outstanding', value: supplierData.reduce((acc, curr) => acc + curr.outstanding, 0) },
        ];

        // Set all data
        setDashboardData({
          paymentAnalysis,
          supplierData,
          metrics: {
            totalOrders,
            onTimePercentage,
            averageDaysLate,
            totalSuppliers: suppliers.length,
            totalSpend: supplierData.reduce((acc, curr) => acc + curr.totalSpend, 0),
            outstanding: supplierData.reduce((acc, curr) => acc + curr.outstanding, 0)
          },
          chartData: {
            paymentStatus: paymentStatusData,
            topCustomers,
            vendorPaymentStatus: vendorPaymentStatusData,
            topSuppliers
          }
        });

      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#f9fafb'
      }}>
        <div>Loading analytics data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#f9fafb'
      }}>
        <div style={{ color: 'red' }}>Error: {error}</div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#f9fafb'
      }}>
        <div>No data available</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", padding: "24px", backgroundColor: "#f9fafb" }}>
      <header style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: "bold", color: "#111827", display: "flex", alignItems: "center", gap: "12px" }}>
          <span>📈</span> Vendor Analytics 
        </h1>
        <p style={{ color: "#4b5563" }}>
          Comprehensive view of marketers payments and supplier costs
        </p>
      </header>

      {/* Customer Payment Performance Section */}
      <section style={{ marginBottom: "48px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#111827" }}>
            <span>💰</span> Marketers Payment Performance
          </h2>
          <div style={{ flex: 1, height: "1px", backgroundColor: "#e5e7eb" }}></div>
        </div>

        {/* Customer Metrics */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "16px", marginBottom: "24px" }}>
          <div style={{ backgroundColor: "white", padding: "16px", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h3 style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "8px" }}>On-Time Payments</h3>
            <p style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#10B981" }}>{dashboardData.metrics.onTimePercentage}%</p>
          </div>
          <div style={{ backgroundColor: "white", padding: "16px", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h3 style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "8px" }}>Average Days Late</h3>
            <p style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#EF4444" }}>{dashboardData.metrics.averageDaysLate.toFixed(1)}</p>
          </div>
          <div style={{ backgroundColor: "white", padding: "16px", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h3 style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "8px" }}>Total Orders</h3>
            <p style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#3B82F6" }}>{dashboardData.metrics.totalOrders}</p>
          </div>
        </div>

        {/* Customer Charts */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
          <div style={{ backgroundColor: "white", padding: "24px", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h3 style={{ marginBottom: "16px", color: "#111827" }}>Payment Status</h3>
            <div style={{ height: "300px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dashboardData.chartData.paymentStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {dashboardData.chartData.paymentStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ backgroundColor: "white", padding: "24px", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h3 style={{ marginBottom: "16px", color: "#111827" }}>Top Marketers</h3>
            <div style={{ height: "300px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dashboardData.chartData.topCustomers}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="orders" fill="#3B82F6" name="Total Orders" />
                  <Bar dataKey="onTime" fill="#10B981" name="On Time" />
                  <Bar dataKey="late" fill="#EF4444" name="Late" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Customer Table */}
        <div style={{ backgroundColor: "white", padding: "24px", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <h3 style={{ marginBottom: "16px", color: "#111827" }}>Order Payment Details</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <th style={{ padding: "12px", textAlign: "left", color: "#6b7280", fontSize: "0.75rem" }}>Marketer</th>
                  <th style={{ padding: "12px", textAlign: "left", color: "#6b7280", fontSize: "0.75rem" }}>Order Date</th>
                  <th style={{ padding: "12px", textAlign: "left", color: "#6b7280", fontSize: "0.75rem" }}>Payment Date</th>
                  <th style={{ padding: "12px", textAlign: "left", color: "#6b7280", fontSize: "0.75rem" }}>Amount</th>
                  <th style={{ padding: "12px", textAlign: "left", color: "#6b7280", fontSize: "0.75rem" }}>Status</th>
                  <th style={{ padding: "12px", textAlign: "left", color: "#6b7280", fontSize: "0.75rem" }}>Days Late</th>
                </tr>
              </thead>
              <tbody>
                {dashboardData.paymentAnalysis.slice(0, 10).map((payment) => (
                  <tr key={payment.orderId} style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <td style={{ padding: "12px" }}>{payment.userName || 'Unknown'}</td>
                    <td style={{ padding: "12px" }}>{new Date(payment.orderDate).toLocaleDateString()}</td>
                    <td style={{ padding: "12px" }}>{payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString() : '-'}</td>
                    <td style={{ padding: "12px" }}>UGX {payment.totalAmount?.toLocaleString() || '0'}</td>
                    <td style={{ padding: "12px", color: payment.status === 'On Time' ? '#10B981' : payment.status === 'Late' ? '#EF4444' : '#6b7280' }}>
                      {payment.status}
                    </td>
                    <td style={{ padding: "12px" }}>{payment.daysLate || payment.daysLate === 0 ? payment.daysLate : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Vendor Cost Analysis Section */}
      <section>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#111827" }}>
            <span>📊</span> Suppliers Cost Analysis
          </h2>
          <div style={{ flex: 1, height: "1px", backgroundColor: "#e5e7eb" }}></div>
        </div>

        {/* Vendor Metrics */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "16px", marginBottom: "24px" }}>
          <div style={{ backgroundColor: "white", padding: "16px", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h3 style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "8px" }}>Total Suppliers</h3>
            <p style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#3B82F6" }}>{dashboardData.metrics.totalSuppliers}</p>
          </div>
          <div style={{ backgroundColor: "white", padding: "16px", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h3 style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "8px" }}>Total Spend</h3>
            <p style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#111827" }}>
              UGX {dashboardData.metrics.totalSpend.toLocaleString()}
            </p>
          </div>
          <div style={{ backgroundColor: "white", padding: "16px", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h3 style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "8px" }}>Outstanding</h3>
            <p style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#EF4444" }}>
              UGX {dashboardData.metrics.outstanding.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Vendor Charts */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
          <div style={{ backgroundColor: "white", padding: "24px", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h3 style={{ marginBottom: "16px", color: "#111827" }}>Payment Status</h3>
            <div style={{ height: "300px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dashboardData.chartData.vendorPaymentStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {dashboardData.chartData.vendorPaymentStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`UGX ${value.toLocaleString()}`, 'Amount']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ backgroundColor: "white", padding: "24px", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <h3 style={{ marginBottom: "16px", color: "#111827" }}>Top Suppliers</h3>
            <div style={{ height: "300px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dashboardData.chartData.topSuppliers}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`UGX ${value.toLocaleString()}`, 'Amount']} />
                  <Legend />
                  <Bar dataKey="totalSpend" fill="#3B82F6" name="Total Spend" />
                  <Bar dataKey="totalPaid" fill="#10B981" name="Paid" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Vendor Table */}
        <div style={{ backgroundColor: "white", padding: "24px", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <h3 style={{ marginBottom: "16px", color: "#111827" }}>Supplier Spending</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <th style={{ padding: "12px", textAlign: "left", color: "#6b7280", fontSize: "0.75rem" }}>Supplier</th>
                  <th style={{ padding: "12px", textAlign: "left", color: "#6b7280", fontSize: "0.75rem" }}>Total Spend</th>
                  <th style={{ padding: "12px", textAlign: "left", color: "#6b7280", fontSize: "0.75rem" }}>Amount Paid</th>
                  <th style={{ padding: "12px", textAlign: "left", color: "#6b7280", fontSize: "0.75rem" }}>Outstanding</th>
                  <th style={{ padding: "12px", textAlign: "left", color: "#6b7280", fontSize: "0.75rem" }}>Items</th>
                </tr>
              </thead>
              <tbody>
                {dashboardData.supplierData.sort((a, b) => b.totalSpend - a.totalSpend).slice(0, 10).map((supplier) => (
                  <tr key={supplier.name} style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <td style={{ padding: "12px" }}>{supplier.name}</td>
                    <td style={{ padding: "12px" }}>UGX {supplier.totalSpend.toLocaleString()}</td>
                    <td style={{ padding: "12px", color: "#10B981" }}>UGX {supplier.totalPaid.toLocaleString()}</td>
                    <td style={{ padding: "12px", color: supplier.outstanding > 0 ? "#EF4444" : "#10B981" }}>
                      UGX {supplier.outstanding.toLocaleString()}
                    </td>
                    <td style={{ padding: "12px" }}>{supplier.items}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
