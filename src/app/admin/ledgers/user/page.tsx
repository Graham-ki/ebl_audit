"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Edit, Trash2, Plus } from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function MarketersPage() {
  const [marketers, setMarketers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMarketer, setSelectedMarketer] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [openingBalances, setOpeningBalances] = useState<any[]>([]);
  const [newPayment, setNewPayment] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: "",
    mode_of_payment: "",
    bank_name: "",
    mobile_money_provider: "",
    purpose: "Debt Clearance",
    order_id: null
  });
  const [newOrder, setNewOrder] = useState({
    date: new Date().toISOString().split('T')[0],
    item: "",
    quantity: "",
    cost: ""
  });
  const [newExpense, setNewExpense] = useState({
    date: new Date().toISOString().split('T')[0],
    item: "",
    amount: ""
  });
  const [newOpeningBalance, setNewOpeningBalance] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: "",
    marketer_id: "",
    status: "Unpaid"
  });
  const [showOrdersDialog, setShowOrdersDialog] = useState(false);
  const [showPaymentsDialog, setShowPaymentsDialog] = useState(false);
  const [showAddOrderDialog, setShowAddOrderDialog] = useState(false);
  const [showLedgerDialog, setShowLedgerDialog] = useState(false);
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [showOpeningBalanceDialog, setShowOpeningBalanceDialog] = useState(false);
  const [showOpeningBalancesList, setShowOpeningBalancesList] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [editingPayment, setEditingPayment] = useState<any>(null);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [editingOpeningBalance, setEditingOpeningBalance] = useState<any>(null);

  const fetchMarketers = async () => {
    setLoading(true);
    try {
      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("id, name")
        .eq("type", "USER");
      
      if (usersError) throw usersError;

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

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("product")
        .select("id, title")
        .order("title", { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOpeningBalances = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("opening_balances")
        .select("*")
        .not("marketer_id","is",null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOpeningBalances(data || []);
    } catch (error) {
      console.error("Error fetching opening balances:", error);
    } finally {
      setLoading(false);
    }
  };

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

  const fetchPayments = async (userId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("finance")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error("Error fetching payments:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchExpenses = async (userId: string) => {
    setLoading(true);
    try {
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("name")
        .eq("id", userId)
        .single();

      if (userError) throw userError;
      if (!userData) throw new Error("User not found");

      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("department", userData.name)
        .order("date", { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (error) {
      console.error("Error fetching expenses:", error);
    } finally {
      setLoading(false);
    }
  };

const fetchTransactions = async (userId: string) => {
    setLoading(true);
    try {
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("name")
        .eq("id", userId)
        .single();

      if (userError) throw userError;
      if (!userData) throw new Error("User not found");

      const { data: ordersData, error: ordersError } = await supabase
        .from("order")
        .select("*")
        .eq("user", userId)
        .order("created_at", { ascending: true });

      if (ordersError) throw ordersError;

      const { data: paymentsData, error: paymentsError } = await supabase
        .from("finance")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      if (paymentsError) throw paymentsError;

      const { data: openingBalancesData, error: openingBalancesError } = await supabase
        .from("opening_balances")
        .select("*")
        .eq("marketer_id", userId)
        .order("created_at", { ascending: true });

      if (openingBalancesError) throw openingBalancesError;

      const allTransactions = [
        ...(openingBalancesData?.map(balance => ({
          type: 'opening_balance',
          id: balance.id,
          date: balance.created_at,
          item: `Opening Balance`,
          amount: Math.abs(parseFloat(balance.amount || "0")),
          quantity: 1,
          unit_price: Math.abs(parseFloat(balance.amount || "0")),
          payment: 0,
          status: balance.status,
          purpose: '',
          mode_of_payment: '',
          bank_name: '',
          mobile_money_provider: ''
        })) || []),
        ...((ordersData || []).map(order => ({
          type: 'order',
          id: order.id,
          date: order.created_at,
          item: order.item,
          quantity: order.quantity,
          unit_price: order.cost,
          amount: Math.abs(order.quantity * order.cost),
          payment: 0,
          purpose: '',
          status: '',
          mode_of_payment: '',
          bank_name: '',
          mobile_money_provider: ''
        })) || []),
        ...((paymentsData || []).map(payment => ({
          type: 'payment',
          id: payment.id,
          date: payment.created_at,
          order_id: payment.order_id,
          amount: 0,
          payment: Math.abs(payment.amount_paid),
          item: `Payment (${payment.mode_of_payment}) - ${payment.purpose}`,
          mode_of_payment: payment.mode_of_payment,
          bank_name: payment.bank_name,
          mobile_money_provider: payment.mode_of_mobilemoney,
          purpose: payment.purpose || '',
          status: '',
          quantity: 0,
          unit_price: 0
        })) || [])
      ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      let netBalance = 0;
      let orderBalance = 0;
      const transactionsWithBalance = allTransactions.map(transaction => {
        if (transaction.type === 'opening_balance') {
          netBalance += transaction.amount; // Add opening balance permanently
        } else if (transaction.type === 'order') {
          orderBalance += transaction.amount; // Add to order balance
          netBalance += transaction.amount; // Add to net balance (increases debt)
        } else if (transaction.type === 'payment') {
          if (transaction.purpose === 'Debt Clearance') {
            // Direct debt reduction
            netBalance -= transaction.payment;
          } else {
            // Regular payment reduces order balance first, then net balance
            const paymentApplied = Math.min(transaction.payment, orderBalance);
            orderBalance -= paymentApplied;
            netBalance -= paymentApplied;
            
            // If payment exceeds order balance, apply remainder to net balance
            if (transaction.payment > paymentApplied) {
              netBalance -= (transaction.payment - paymentApplied);
            }
          }
        }
        
        // REMOVED the Math.max(0, netBalance) constraint to allow negative balances
        // This allows negative net balance to indicate overpayment (company owes marketer)
        orderBalance = Math.max(0, orderBalance); // Order balance should still not go negative
        
        return {
          ...transaction,
          order_balance: orderBalance,
          net_balance: netBalance
        };
      });

      setTransactions(transactionsWithBalance);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const addPayment = async () => {
    if (!selectedMarketer || !newPayment.amount || !newPayment.mode_of_payment) return;

    try {
      const { data: balances, error: balanceError } = await supabase
        .from("opening_balances")
        .select("*")
        .eq("marketer_id", selectedMarketer.id)
        .order("created_at", { ascending: true })
        .limit(1);

      if (balanceError) throw balanceError;
      
      let paymentPurpose = newPayment.purpose;
      let remainingPaymentAmount = parseFloat(newPayment.amount);
      
      if (balances && balances.length > 0 && balances[0].status !== "Paid") {
        const balance = balances[0];
        const balanceAmount = parseFloat(balance.amount);
        
        if (remainingPaymentAmount >= balanceAmount) {
          const { error: updateError } = await supabase
            .from("opening_balances")
            .update({ 
              amount: "0",
              status: "Paid"
            })
            .eq("id", balance.id);

          if (updateError) throw updateError;
          
          remainingPaymentAmount -= balanceAmount;
          paymentPurpose = "Debt Clearance";
          
          if (remainingPaymentAmount > 0) {
            paymentPurpose = "Debt Clearance and Order Payment";
          }
        } else {
          const newBalanceAmount = balanceAmount - remainingPaymentAmount;
          
          const { error: updateError } = await supabase
            .from("opening_balances")
            .update({ 
              amount: newBalanceAmount.toString(),
              status: "Partially Paid"
            })
            .eq("id", balance.id);

          if (updateError) throw updateError;
          
          paymentPurpose = "Debt Clearance";
          remainingPaymentAmount = 0;
        }
      } else {
        paymentPurpose = "Order Payment";
      }

      const paymentData: any = {
        amount_paid: parseFloat(newPayment.amount),
        created_at: newPayment.date,
        user_id: selectedMarketer.id,
        mode_of_payment: newPayment.mode_of_payment,
        payment_reference: `PAY-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        purpose: paymentPurpose
      };

      if (newPayment.mode_of_payment === 'Bank') {
        paymentData.bank_name = newPayment.bank_name;
      } else if (newPayment.mode_of_payment === 'Mobile Money') {
        paymentData.mode_of_mobilemoney = newPayment.mobile_money_provider;
      }

      const { data, error } = await supabase
        .from("finance")
        .insert([paymentData]);

      if (error) throw error;
      
      await fetchPayments(selectedMarketer.id);
      await fetchTransactions(selectedMarketer.id);
      await fetchOpeningBalances();
      
      setNewPayment({
        date: new Date().toISOString().split('T')[0],
        amount: "",
        mode_of_payment: "",
        bank_name: "",
        mobile_money_provider: "",
        purpose: "Debt Clearance",
        order_id: null
      });
      setShowPaymentForm(false);
    } catch (error) {
      console.error("Error adding payment:", error);
      alert("Error adding payment. Please try again.");
    }
  };

  const updatePayment = async () => {
    if (!editingPayment || !editingPayment.amount_paid || !editingPayment.mode_of_payment) return;

    try {
      const paymentData: any = {
        amount_paid: parseFloat(editingPayment.amount_paid),
        created_at: editingPayment.created_at,
        mode_of_payment: editingPayment.mode_of_payment,
        purpose: editingPayment.purpose
      };

      if (editingPayment.mode_of_payment === 'Bank') {
        paymentData.bank_name = editingPayment.bank_name;
      } else if (editingPayment.mode_of_payment === 'Mobile Money') {
        paymentData.mode_of_mobilemoney = editingPayment.mobile_money_provider;
      }

      const { error } = await supabase
        .from("finance")
        .update(paymentData)
        .eq("id", editingPayment.id);

      if (error) throw error;
      
      await fetchPayments(selectedMarketer.id);
      await fetchTransactions(selectedMarketer.id);
      await fetchOpeningBalances();
      
      setEditingPayment(null);
      alert("Payment updated successfully!");
    } catch (error) {
      console.error("Error updating payment:", error);
      alert("Error updating payment. Please try again.");
    }
  };

  const deletePayment = async (paymentId: string) => {
    if (!confirm("Are you sure you want to delete this payment?")) return;

    try {
      const { error } = await supabase
        .from("finance")
        .delete()
        .eq("id", paymentId);

      if (error) throw error;
      
      await fetchPayments(selectedMarketer.id);
      await fetchTransactions(selectedMarketer.id);
      await fetchOpeningBalances();
      
      alert("Payment deleted successfully!");
    } catch (error) {
      console.error("Error deleting payment:", error);
      alert("Error deleting payment. Please try again.");
    }
  };

  const addOrder = async () => {
    if (!selectedMarketer || !newOrder.item || !newOrder.quantity || !newOrder.cost) return;

    try {
      const product = products.find(p => p.title === newOrder.item);
      if (!product) throw new Error("Product not found");

      const { data: orderData, error: orderError } = await supabase
        .from("order")
        .insert([{
          user: selectedMarketer.id,
          item: newOrder.item,
          quantity: parseFloat(newOrder.quantity),
          cost: parseFloat(newOrder.cost),
          created_at: newOrder.date,
          total_amount: parseFloat(newOrder.quantity) * parseFloat(newOrder.cost)
        }])
        .select();

      if (orderError) throw orderError;
      
      const { error: entryError } = await supabase
        .from("product_entries")
        .insert([{
          product_id: product.id,
          title: newOrder.item,
          quantity: -parseFloat(newOrder.quantity),
          created_at: newOrder.date,
          created_by: 'Admin',
          transaction: `${selectedMarketer.name}-Order`
        }]);

      if (entryError) throw entryError;
      
      await fetchOrders(selectedMarketer.id);
      await fetchTransactions(selectedMarketer.id);
      setNewOrder({
        date: new Date().toISOString().split('T')[0],
        item: "",
        quantity: "",
        cost: ""
      });
      setShowAddOrderDialog(false);
    } catch (error) {
      console.error("Error adding order:", error);
      alert("Error adding order. Please try again.");
    }
  };

  const updateOrder = async () => {
    if (!editingOrder || !editingOrder.item || !editingOrder.quantity || !editingOrder.cost) return;

    try {
      const product = products.find(p => p.title === editingOrder.item);
      if (!product) throw new Error("Product not found");

      const { data: originalOrder, error: fetchError } = await supabase
        .from("order")
        .select("*")
        .eq("id", editingOrder.id)
        .single();

      if (fetchError) throw fetchError;

      const quantityDifference = parseFloat(editingOrder.quantity) - parseFloat(originalOrder.quantity);

      const { error: orderError } = await supabase
        .from("order")
        .update({
          item: editingOrder.item,
          quantity: parseFloat(editingOrder.quantity),
          cost: parseFloat(editingOrder.cost),
          created_at: editingOrder.created_at,
          total_amount: parseFloat(editingOrder.quantity) * parseFloat(editingOrder.cost)
        })
        .eq("id", editingOrder.id);

      if (orderError) throw orderError;
      
      if (quantityDifference !== 0) {
        const { error: entryError } = await supabase
          .from("product_entries")
          .insert([{
            product_id: product.id,
            title: editingOrder.item,
            quantity: -quantityDifference,
            created_at: new Date().toISOString(),
            created_by: 'Admin',
            transaction: `${selectedMarketer.name}-Order Update`
          }]);

        if (entryError) throw entryError;
      }
      
      await fetchOrders(selectedMarketer.id);
      await fetchTransactions(selectedMarketer.id);
      setEditingOrder(null);
      alert("Order updated successfully!");
    } catch (error) {
      console.error("Error updating order:", error);
      alert("Error updating order. Please try again.");
    }
  };

  const deleteOrder = async (orderId: string) => {
    if (!confirm("Are you sure you want to delete this order?")) return;

    try {
      const { data: order, error: fetchError } = await supabase
        .from("order")
        .select("*")
        .eq("id", orderId)
        .single();

      if (fetchError) throw fetchError;

      const product = products.find(p => p.title === order.item);
      if (product) {
        const { error: entryError } = await supabase
          .from("product_entries")
          .insert([{
            product_id: product.id,
            title: order.item,
            quantity: parseFloat(order.quantity),
            created_at: new Date().toISOString(),
            created_by: 'Admin',
            transaction: `${selectedMarketer.name}-Order Deletion`
          }]);

        if (entryError) throw entryError;
      }

      const { error } = await supabase
        .from("order")
        .delete()
        .eq("id", orderId);

      if (error) throw error;
      
      await fetchOrders(selectedMarketer.id);
      await fetchTransactions(selectedMarketer.id);
      
      alert("Order deleted successfully!");
    } catch (error) {
      console.error("Error deleting order:", error);
      alert("Error deleting order. Please try again.");
    }
  };

  const addExpense = async () => {
    if (!selectedMarketer || !newExpense.item || !newExpense.amount) return;

    try {
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("name")
        .eq("id", selectedMarketer.id)
        .single();

      if (userError) throw userError;
      if (!userData) throw new Error("User not found");

      const { data, error } = await supabase
        .from("expenses")
        .insert([{
          date: newExpense.date,
          item: newExpense.item,
          amount_spent: parseFloat(newExpense.amount),
          department: userData.name
        }]);

      if (error) throw error;
      
      await fetchExpenses(selectedMarketer.id);
      await fetchTransactions(selectedMarketer.id);
      setNewExpense({
        date: new Date().toISOString().split('T')[0],
        item: "",
        amount: ""
      });
      setShowExpenseDialog(false);
    } catch (error) {
      console.error("Error adding expense:", error);
      alert("Error adding expense. Please try again.");
    }
  };

  const updateExpense = async () => {
    if (!editingExpense || !editingExpense.item || !editingExpense.amount_spent) return;

    try {
      const { error } = await supabase
        .from("expenses")
        .update({
          date: editingExpense.date,
          item: editingExpense.item,
          amount_spent: parseFloat(editingExpense.amount_spent)
        })
        .eq("id", editingExpense.id);

      if (error) throw error;
      
      await fetchExpenses(selectedMarketer.id);
      await fetchTransactions(selectedMarketer.id);
      setEditingExpense(null);
      alert("Expense updated successfully!");
    } catch (error) {
      console.error("Error updating expense:", error);
      alert("Error updating expense. Please try again.");
    }
  };

  const deleteExpense = async (expenseId: string) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;

    try {
      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", expenseId);

      if (error) throw error;
      
      await fetchExpenses(selectedMarketer.id);
      await fetchTransactions(selectedMarketer.id);
      
      alert("Expense deleted successfully!");
    } catch (error) {
      console.error("Error deleting expense:", error);
      alert("Error deleting expense. Please try again.");
    }
  };

  const addOpeningBalance = async () => {
    if (!newOpeningBalance.marketer_id || !newOpeningBalance.amount) return;

    try {
      const { data, error } = await supabase
        .from("opening_balances")
        .insert([{
          marketer_id: newOpeningBalance.marketer_id,
          amount: parseFloat(newOpeningBalance.amount),
          status: newOpeningBalance.status,
          created_at: newOpeningBalance.date
        }]);

      if (error) throw error;
      
      await fetchOpeningBalances();
      await fetchTransactions(newOpeningBalance.marketer_id);
      setNewOpeningBalance({
        date: new Date().toISOString().split('T')[0],
        amount: "",
        marketer_id: "",
        status: "Unpaid"
      });
      setShowOpeningBalanceDialog(false);
    } catch (error) {
      console.error("Error adding opening balance:", error);
      alert("Error adding opening balance. Please try again.");
    }
  };

  const updateOpeningBalance = async () => {
    if (!editingOpeningBalance || !editingOpeningBalance.amount) return;

    try {
      const { error } = await supabase
        .from("opening_balances")
        .update({
          amount: parseFloat(editingOpeningBalance.amount),
          status: editingOpeningBalance.status,
          created_at: editingOpeningBalance.created_at
        })
        .eq("id", editingOpeningBalance.id);

      if (error) throw error;
      
      await fetchOpeningBalances();
      await fetchTransactions(editingOpeningBalance.marketer_id);
      setEditingOpeningBalance(null);
      alert("Opening balance updated successfully!");
    } catch (error) {
      console.error("Error updating opening balance:", error);
      alert("Error updating opening balance. Please try again.");
    }
  };

  const deleteOpeningBalance = async (balanceId: string) => {
    if (!confirm("Are you sure you want to delete this opening balance?")) return;

    try {
      const { error } = await supabase
        .from("opening_balances")
        .delete()
        .eq("id", balanceId);

      if (error) throw error;
      
      await fetchOpeningBalances();
      
      alert("Opening balance deleted successfully!");
    } catch (error) {
      console.error("Error deleting opening balance:", error);
      alert("Error deleting opening balance. Please try again.");
    }
  };

  const calculateTotalPaymentsForMarketer = async (marketerId: string) => {
    try {
      const { data, error } = await supabase
        .from("finance")
        .select("amount_paid")
        .eq("user_id", marketerId)
        .eq("purpose", "Debt Clearance");

      if (error) throw error;
      
      return data.reduce((sum, payment) => sum + payment.amount_paid, 0);
    } catch (error) {
      console.error("Error calculating total payments:", error);
      return 0;
    }
  };

  const downloadLedger = () => {
    if (transactions.length === 0) return;

    const headers = [
      "Date",
      "Type",
      "Description",
      "Quantity",
      "Unit Price",
      "Order Amount",
      "Payment",
      "Expense",
      "Order Balance",
      "Net Balance"
    ];

    const csvRows = [
      headers.join(","),
      ...transactions.map(t => [
        new Date(t.date).toLocaleDateString(),
        t.type,
        t.type === 'order' ? 
          `${t.item} (Order #${t.id})` : 
          t.type === 'payment' ?
          `Payment (${t.mode_of_payment}) - ${t.purpose}` :
          t.type === 'opening_balance' ?
          `Opening Balance (${t.status})` :
          `Expense: ${t.item}`,
        t.type === 'order' || t.type === 'opening_balance' ? t.quantity : '',
        t.type === 'order' || t.type === 'opening_balance' ? t.unit_price : '',
        t.type === 'order' || t.type === 'opening_balance' ? t.amount : '',
        t.type === 'payment' ? t.payment : '',
        t.type === 'expense' ? t.expense.toLocaleString() : '',
        t.order_balance,
        t.net_balance
      ].map(v => `"${v}"`).join(","))
    ];

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ledger_${selectedMarketer?.name}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount_paid, 0);
  const balance = selectedOrder ? selectedOrder.total_amount - totalPaid : 0;
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount_spent, 0);

  useEffect(() => {
    fetchMarketers();
    fetchProducts();
    fetchOpeningBalances();
  }, []);

  const handleViewOrders = async (marketer: any) => {
    setSelectedMarketer(marketer);
    await fetchOrders(marketer.id);
    await fetchExpenses(marketer.id);
    await fetchPayments(marketer.id);
    await fetchTransactions(marketer.id);
    setShowOrdersDialog(true);
  };

  const handleViewPayments = (order: any) => {
    setSelectedOrder(order);
    setShowPaymentsDialog(true);
  };

  const handleViewLedger = () => {
    setShowLedgerDialog(true);
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

      <div className="flex space-x-4 mb-6">
        <Button
          variant="outline"
          onClick={() => setShowOpeningBalancesList(true)}
        >
          View Opening Balances
        </Button>
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
                      className="mr-2"
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

      

      {/* Opening Balances List Dialog */}
      <Dialog open={showOpeningBalancesList} onOpenChange={setShowOpeningBalancesList}>
        <DialogContent className="max-w-4xl rounded-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Opening Balances
            </DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="font-semibold">Date</TableHead>
                <TableHead className="font-semibold">Marketer</TableHead>
                <TableHead className="font-semibold text-right">Original Amount</TableHead>
                <TableHead className="font-semibold text-right">Amount Paid</TableHead>
                <TableHead className="font-semibold text-right">Remaining Balance</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {openingBalances.map(async (balance) => {
                const marketer = marketers.find(m => m.id === balance.marketer_id);
                const totalPayments = await calculateTotalPaymentsForMarketer(balance.marketer_id);
                const remainingBalance = Math.max(0, parseFloat(balance.amount) - totalPayments);
                
                let status = balance.status;
                if (remainingBalance === 0) {
                  status = "Fully Paid";
                } else if (totalPayments > 0) {
                  status = "Partially Paid";
                }
                
                return (
                  <TableRow key={balance.id}>
                    <TableCell>
                      {new Date(balance.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{marketer?.name || 'Unknown'}</TableCell>
                    <TableCell className="text-right">
                      {parseFloat(balance.amount).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {totalPayments.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {remainingBalance.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          status === 'Fully Paid' ? 'default' :
                          status === 'Partially Paid' ? 'secondary' :
                          'destructive'
                        }
                      >
                        {status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {openingBalances.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    No opening balances recorded
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      {/* Payment Form */}
      <Dialog open={showPaymentForm} onOpenChange={setShowPaymentForm}>
        <DialogContent className="max-w-md rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Record Payment for {selectedMarketer?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <Input
                type="date"
                value={newPayment.date}
                onChange={(e) => setNewPayment({
                  ...newPayment,
                  date: e.target.value
                })}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount
              </label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={newPayment.amount}
                onChange={(e) => setNewPayment({
                  ...newPayment,
                  amount: e.target.value
                })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mode of Payment
              </label>
              <Select
                value={newPayment.mode_of_payment}
                onValueChange={(value) => setNewPayment({
                  ...newPayment,
                  mode_of_payment: value,
                  bank_name: "",
                  mobile_money_provider: ""
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Bank">Bank</SelectItem>
                  <SelectItem value="Mobile Money">Mobile Money</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newPayment.mode_of_payment === 'Bank' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bank Name
                </label>
                <Input
                  type="text"
                  placeholder="Enter bank name"
                  value={newPayment.bank_name}
                  onChange={(e) => setNewPayment({
                    ...newPayment,
                    bank_name: e.target.value
                  })}
                />
              </div>
            )}
            {newPayment.mode_of_payment === 'Mobile Money' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mobile Money Provider
                </label>
                <Select
                  value={newPayment.mobile_money_provider}
                  onValueChange={(value) => setNewPayment({
                    ...newPayment,
                    mobile_money_provider: value
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MTN">MTN</SelectItem>
                    <SelectItem value="Airtel">Airtel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={addPayment}
              disabled={
                !newPayment.amount || 
                !newPayment.mode_of_payment || 
                (newPayment.mode_of_payment === 'Bank' && !newPayment.bank_name) ||
                (newPayment.mode_of_payment === 'Mobile Money' && !newPayment.mobile_money_provider)
              }
            >
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Payment Dialog */}
      <Dialog open={!!editingPayment} onOpenChange={() => setEditingPayment(null)}>
        <DialogContent className="max-w-md rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Edit Payment
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <Input
                type="date"
                value={editingPayment?.created_at?.split('T')[0] || ''}
                onChange={(e) => setEditingPayment({
                  ...editingPayment,
                  created_at: e.target.value
                })}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount
              </label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={editingPayment?.amount_paid || ''}
                onChange={(e) => setEditingPayment({
                  ...editingPayment,
                  amount_paid: e.target.value
                })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mode of Payment
              </label>
              <Select
                value={editingPayment?.mode_of_payment || ''}
                onValueChange={(value) => setEditingPayment({
                  ...editingPayment,
                  mode_of_payment: value,
                  bank_name: "",
                  mobile_money_provider: ""
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Bank">Bank</SelectItem>
                  <SelectItem value="Mobile Money">Mobile Money</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editingPayment?.mode_of_payment === 'Bank' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bank Name
                </label>
                <Input
                  type="text"
                  placeholder="Enter bank name"
                  value={editingPayment?.bank_name || ''}
                  onChange={(e) => setEditingPayment({
                    ...editingPayment,
                    bank_name: e.target.value
                  })}
                />
              </div>
            )}
            {editingPayment?.mode_of_payment === 'Mobile Money' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mobile Money Provider
                </label>
                <Select
                  value={editingPayment?.mobile_money_provider || ''}
                  onValueChange={(value) => setEditingPayment({
                    ...editingPayment,
                    mobile_money_provider: value
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MTN">MTN</SelectItem>
                    <SelectItem value="Airtel">Airtel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button
              onClick={updatePayment}
              disabled={
                !editingPayment?.amount_paid || 
                !editingPayment?.mode_of_payment || 
                (editingPayment?.mode_of_payment === 'Bank' && !editingPayment?.bank_name) ||
                (editingPayment?.mode_of_payment === 'Mobile Money' && !editingPayment?.mobile_money_provider)
              }
            >
              Update Payment
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deletePayment(editingPayment.id)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Orders Dialog */}
      <Dialog open={showOrdersDialog} onOpenChange={setShowOrdersDialog}>
        <DialogContent className="max-w-6xl rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Orders for {selectedMarketer?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex justify-end mb-4 space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleViewLedger}
            >
              View General Ledger
            </Button>
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="font-semibold">Date</TableHead>
                  <TableHead className="font-semibold">Item</TableHead>
                  <TableHead className="font-semibold">Quantity</TableHead>
                  <TableHead className="font-semibold">Unit Price</TableHead>
                  <TableHead className="font-semibold">Total Amount</TableHead>
                  <TableHead className="font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      {new Date(order.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{order.item}</TableCell>
                    <TableCell>{order.quantity}</TableCell>
                    <TableCell>{order.cost.toLocaleString()}</TableCell>
                    <TableCell>
                      {(order.quantity * order.cost).toLocaleString()}
                    </TableCell>
                    
                  </TableRow>
                ))}
                {orders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      No orders found for this marketer
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Order Dialog */}
      <Dialog open={showAddOrderDialog} onOpenChange={setShowAddOrderDialog}>
        <DialogContent className="max-w-md rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Add New Order for {selectedMarketer?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <Input
                type="date"
                value={newOrder.date}
                onChange={(e) => setNewOrder({
                  ...newOrder,
                  date: e.target.value
                })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Item
              </label>
              <Select
                value={newOrder.item}
                onValueChange={(value) => setNewOrder({
                  ...newOrder,
                  item: value
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an item" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.title} value={product.title}>
                      {product.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity
              </label>
              <Input
                type="number"
                placeholder="Enter quantity"
                value={newOrder.quantity}
                onChange={(e) => setNewOrder({
                  ...newOrder,
                  quantity: e.target.value
                })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit Price
              </label>
              <Input
                type="number"
                placeholder="Enter unit price"
                value={newOrder.cost}
                onChange={(e) => setNewOrder({
                  ...newOrder,
                  cost: e.target.value
                })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={addOrder} disabled={!newOrder.item || !newOrder.quantity || !newOrder.cost}>
              Add Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Order Dialog */}
      <Dialog open={!!editingOrder} onOpenChange={() => setEditingOrder(null)}>
        <DialogContent className="max-w-md rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Edit Order for {selectedMarketer?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <Input
                type="date"
                value={editingOrder?.created_at?.split('T')[0] || ''}
                onChange={(e) => setEditingOrder({
                  ...editingOrder,
                  created_at: e.target.value
                })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Item
              </label>
              <Select
                value={editingOrder?.item || ''}
                onValueChange={(value) => setEditingOrder({
                  ...editingOrder,
                  item: value
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an item" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.title} value={product.title}>
                      {product.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity
              </label>
              <Input
                type="number"
                placeholder="Enter quantity"
                value={editingOrder?.quantity || ''}
                onChange={(e) => setEditingOrder({
                  ...editingOrder,
                  quantity: e.target.value
                })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit Price
              </label>
              <Input
                type="number"
                placeholder="Enter unit price"
                value={editingOrder?.cost || ''}
                onChange={(e) => setEditingOrder({
                  ...editingOrder,
                  cost: e.target.value
                })}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button onClick={updateOrder} disabled={!editingOrder?.item || !editingOrder?.quantity || !editingOrder?.cost}>
              Update Order
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteOrder(editingOrder.id)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Expense Dialog */}
      <Dialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog}>
        <DialogContent className="max-w-md rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Record Expense for {selectedMarketer?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <Input
                type="date"
                value={newExpense.date}
                onChange={(e) => setNewExpense({
                  ...newExpense,
                  date: e.target.value
                })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Item
              </label>
              <Input
                type="text"
                placeholder="Enter expense item"
                value={newExpense.item}
                onChange={(e) => setNewExpense({
                  ...newExpense,
                  item: e.target.value
                })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount
              </label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={newExpense.amount}
                onChange={(e) => setNewExpense({
                  ...newExpense,
                  amount: e.target.value
                })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={addExpense} disabled={!newExpense.item || !newExpense.amount}>
              Record Expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Expense Dialog */}
      <Dialog open={!!editingExpense} onOpenChange={() => setEditingExpense(null)}>
        <DialogContent className="max-w-md rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Edit Expense for {selectedMarketer?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <Input
                type="date"
                value={editingExpense?.date || ''}
                onChange={(e) => setEditingExpense({
                  ...editingExpense,
                  date: e.target.value
                })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Item
              </label>
              <Input
                type="text"
                placeholder="Enter expense item"
                value={editingExpense?.item || ''}
                onChange={(e) => setEditingExpense({
                  ...editingExpense,
                  item: e.target.value
                })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount
              </label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={editingExpense?.amount_spent || ''}
                onChange={(e) => setEditingExpense({
                  ...editingExpense,
                  amount_spent: e.target.value
                })}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button onClick={updateExpense} disabled={!editingExpense?.item || !editingExpense?.amount_spent}>
              Update Expense
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteExpense(editingExpense.id)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* General Ledger Dialog */}
      <Dialog open={showLedgerDialog} onOpenChange={setShowLedgerDialog}>
        <DialogContent className="max-w-6xl rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              General Ledger for {selectedMarketer?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex justify-end mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={downloadLedger}
            >
              Download as CSV
            </Button>
          </div>
          <div className="max-h-[70vh] overflow-y-auto">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="font-semibold">Date</TableHead>
                  <TableHead className="font-semibold">Description</TableHead>
                  <TableHead className="font-semibold text-right">Quantity</TableHead>
                  <TableHead className="font-semibold text-right">Unit Price</TableHead>
                  <TableHead className="font-semibold text-right">Order Amount</TableHead>
                  <TableHead className="font-semibold text-right">Payment</TableHead>
                  <TableHead className="font-semibold text-right">Expense</TableHead>
                  <TableHead className="font-semibold text-right">Order Balance</TableHead>
                  <TableHead className="font-semibold text-right">Net Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction, index) => (
                  <TableRow key={`${transaction.type}-${transaction.id}-${index}`}>
                    <TableCell>
                      {new Date(transaction.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {transaction.type === 'order' ? 
                        `${transaction.item} (Order #${transaction.id})` : 
                        transaction.type === 'payment' ?
                        `Payment (${transaction.mode_of_payment}) - ${transaction.purpose}` :
                        transaction.type === 'opening_balance' ?
                        `Opening Balance (${transaction.status})` :
                        `Expense: ${transaction.item}`}
                      {transaction.bank_name && ` - ${transaction.bank_name}`}
                      {transaction.mobile_money_provider && ` - ${transaction.mobile_money_provider}`}
                    </TableCell>
                    <TableCell className="text-right">
                      {transaction.type === 'order' || transaction.type === 'opening_balance' ? transaction.quantity : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {transaction.type === 'order' || transaction.type === 'opening_balance' ? transaction.unit_price.toLocaleString() : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {transaction.type === 'order' || transaction.type === 'opening_balance' ? transaction.amount.toLocaleString() : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {transaction.type === 'payment' ? transaction.payment.toLocaleString() : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {transaction.type === 'expense' ? transaction.expense.toLocaleString() : '-'}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${
                      transaction.order_balance < 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {transaction.order_balance.toLocaleString()}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${
                      transaction.net_balance < 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {transaction.net_balance.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
                {transactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                      No transactions found for this marketer
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
              Payments for {selectedMarketer?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <h3 className="font-medium">Payment History</h3>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        {new Date(payment.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{payment.purpose}</TableCell>
                      <TableCell>{payment.mode_of_payment}</TableCell>
                      <TableCell>
                        {payment.mode_of_payment === 'Bank' && payment.bank_name}
                        {payment.mode_of_payment === 'Mobile Money' && payment.mode_of_mobilemoney}
                      </TableCell>
                      <TableCell>
                        {payment.amount_paid.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingPayment(payment)}
                          >
                            <Edit size={14} />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deletePayment(payment.id)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {payments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4 text-gray-500">
                        No payments recorded
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-between items-center">
              <div className="font-medium">
                Total Paid: {totalPaid.toLocaleString()}
              </div>
              {selectedOrder && (
                <div className={`font-medium ${
                  balance > 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  Balance: {Math.abs(balance).toLocaleString()} ({balance > 0 ? 'Due' : 'Overpaid'})
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
