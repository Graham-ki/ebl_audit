"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function MarketersPage() {
  const [marketers, setMarketers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMarketer, setSelectedMarketer] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [newPayment, setNewPayment] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: ""
  });
  const [showOrdersDialog, setShowOrdersDialog] = useState(false);
  const [showPaymentsDialog, setShowPaymentsDialog] = useState(false);

  // Fetch all marketers with their order counts
  const fetchMarketers = async () => {
    setLoading(true);
    try {
      // First get all users with type 'USERS'
      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("id, name")
        .eq("type", "USER");
      
      if (usersError) throw usersError;

      // Then get order counts for each user
      const marketersWithCounts = await Promise.all(
        users.map(async (user) => {
          const { count, error: countError } = await supabase
            .from("order")
            .select("*", { count: "exact", head: true })
            .eq("user", user.id);
          
          if (countError) throw countError;

          return {
            ...user,
            orderCount: count || 0
          };
        })
      );

      setMarketers(marketersWithCounts);
    } catch (error) {
      console.error("Error fetching marketers:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch orders for a specific marketer
  const fetchOrders = async (userId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("order")
        .select("*")
        .eq("user", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch payments for a specific order
  const fetchPayments = async (orderId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("finance")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error("Error fetching payments:", error);
    } finally {
      setLoading(false);
    }
  };

  // Add a new payment
  const addPayment = async () => {
    if (!selectedOrder || !newPayment.amount) return;

    try {
      const { data, error } = await supabase
        .from("finance")
        .insert([{
          order_id: selectedOrder.id,
          amount_paid: parseFloat(newPayment.amount),
          created_at: newPayment.date,
          user_id: selectedMarketer.id
        }]);

      if (error) throw error;
      
      // Refresh payments
      await fetchPayments(selectedOrder.id);
      // Reset form
      setNewPayment({
        date: new Date().toISOString().split('T')[0],
        amount: ""
      });
    } catch (error) {
      console.error("Error adding payment:", error);
    }
  };

  // Calculate total paid amount
  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount_paid, 0);
  const balance = selectedOrder ? selectedOrder.total_amount - totalPaid : 0;

  useEffect(() => {
    fetchMarketers();
  }, []);

  const handleViewOrders = (marketer: any) => {
    setSelectedMarketer(marketer);
    fetchOrders(marketer.id);
    setShowOrdersDialog(true);
  };

  const handleViewPayments = (order: any) => {
    setSelectedOrder(order);
    fetchPayments(order.id);
    setShowPaymentsDialog(true);
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          Marketers Management
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          View and manage marketers and their orders
        </p>
      </div>

      {/* Marketers Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden mb-8">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="font-semibold text-gray-700">Marketer Name</TableHead>
              <TableHead className="font-semibold text-gray-700">Number of Orders</TableHead>
              <TableHead className="font-semibold text-gray-700 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : marketers.length > 0 ? (
              marketers.map((marketer) => (
                <TableRow key={marketer.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">{marketer.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{marketer.orderCount}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewOrders(marketer)}
                    >
                      View Orders
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                  No marketers found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Orders Dialog */}
      <Dialog open={showOrdersDialog} onOpenChange={setShowOrdersDialog}>
        <DialogContent className="max-w-4xl rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Orders for {selectedMarketer?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="font-semibold">Date</TableHead>
                  <TableHead className="font-semibold">Total Amount</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      {new Date(order.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {order.total_amount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          order.status === 'Approved' ? 'default' :
                          order.status === 'Pending' ? 'secondary' :
                          order.status === 'Cancelled' ? 'destructive' : 'outline'
                        }
                      >
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewPayments(order)}
                      >
                        View Payments
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {orders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                      No orders found for this marketer
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payments Dialog */}
      <Dialog open={showPaymentsDialog} onOpenChange={setShowPaymentsDialog}>
        <DialogContent className="max-w-2xl rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Payments for Order #{selectedOrder?.id}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="border rounded-lg p-3">
                <p className="text-sm text-gray-500">Total Amount</p>
                <p className="font-bold">{selectedOrder?.total_amount.toLocaleString()}</p>
              </div>
              <div className="border rounded-lg p-3">
                <p className="text-sm text-gray-500">Amount Paid</p>
                <p className="font-bold">{totalPaid.toLocaleString()}</p>
              </div>
              <div className="border rounded-lg p-3">
                <p className="text-sm text-gray-500">Balance</p>
                <p className={`font-bold ${
                  balance > 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {balance.toLocaleString()}
                </p>
              </div>
            </div>

            <h3 className="font-medium">Payment History</h3>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        {new Date(payment.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {payment.amount_paid.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {payments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center py-4 text-gray-500">
                        No payments recorded
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}