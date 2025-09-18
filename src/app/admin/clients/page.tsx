"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, Trash2, Eye, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Utility function to format date to EAT (Kampala) timezone with time
const formatToEATDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  
  // Convert to EAT (UTC+3)
  const eatOffset = 3 * 60; // EAT is UTC+3 (180 minutes)
  const localOffset = date.getTimezoneOffset();
  const eatTime = new Date(date.getTime() + (localOffset + eatOffset) * 60000);
  
  return eatTime.toISOString();
};

// Utility function to get current datetime in EAT format for datetime-local input
const getCurrentEATDateTime = (): string => {
  const now = new Date();
  const eatOffset = 3 * 60; // EAT is UTC+3 (180 minutes)
  const localOffset = now.getTimezoneOffset();
  const eatTime = new Date(now.getTime() + (localOffset + eatOffset) * 60000);
  
  // Format for datetime-local input: YYYY-MM-DDTHH:MM
  const year = eatTime.getFullYear();
  const month = String(eatTime.getMonth() + 1).padStart(2, '0');
  const day = String(eatTime.getDate()).padStart(2, '0');
  const hours = String(eatTime.getHours()).padStart(2, '0');
  const minutes = String(eatTime.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

// Utility function to convert datetime-local string to ISO string
const datetimeLocalToISO = (datetimeLocal: string): string => {
  return new Date(datetimeLocal).toISOString();
};

interface Client {
  id: string;
  name: string;
  contact: string;
  address: string;
  orderCount?: number;
}

interface Material {
  id: string;
  name: string;
}

interface Order {
  id: string;
  user: string;
  material: string;
  quantity: number;
  cost: number;
  created_at: string;
  total_amount?: number;
}

interface Payment {
  id: string;
  amount_paid: number;
  created_at: string;
  mode_of_payment: string;
  bank_name?: string;
  mode_of_mobilemoney?: string;
  purpose?: string;
  order_id?: string;
  user_id?: string;
}

interface Expense {
  id: string;
  date: string;
  item: string;
  amount_spent: number;
  department: string;
}

interface OpeningBalance {
  id: string;
  client_id: string;
  amount: string;
  status: string;
  created_at: string;
  clients?: {
    id: string;
    name: string;
  };
  paid_amount?: number;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [openingBalances, setOpeningBalances] = useState<OpeningBalance[]>([]);
  const [clientPayments, setClientPayments] = useState<Payment[]>([]);
  
  const [newPayment, setNewPayment] = useState({
    date: getCurrentEATDateTime(),
    amount: "",
    mode_of_payment: "",
    bank_name: "",
    mobile_money_provider: "",
    purpose: "Payment for Orders",
    order_id: ""
  });
  
  const [newOrder, setNewOrder] = useState({
    date: getCurrentEATDateTime(),
    material: "",
    quantity: "",
    cost: ""
  });
  
  const [newExpense, setNewExpense] = useState({
    date: getCurrentEATDateTime(),
    item: "",
    amount: ""
  });
  
  const [newOpeningBalance, setNewOpeningBalance] = useState({
    date: getCurrentEATDateTime(),
    amount: "",
    client_id: "",
    status: "Unpaid"
  });
  
  const [newClient, setNewClient] = useState({
    name: "",
    contact: "",
    address: ""
  });
  
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [editOrder, setEditOrder] = useState<Order | null>(null);
  const [editPayment, setEditPayment] = useState<Payment | null>(null);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [editOpeningBalance, setEditOpeningBalance] = useState<OpeningBalance | null>(null);
  
  const [showOrdersDialog, setShowOrdersDialog] = useState(false);
  const [showPaymentsDialog, setShowPaymentsDialog] = useState(false);
  const [showAddOrderDialog, setShowAddOrderDialog] = useState(false);
  const [showLedgerDialog, setShowLedgerDialog] = useState(false);
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [showOpeningBalanceDialog, setShowOpeningBalanceDialog] = useState(false);
  const [showOpeningBalancesList, setShowOpeningBalancesList] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showAddClientDialog, setShowAddClientDialog] = useState(false);
  const [showEditClientDialog, setShowEditClientDialog] = useState(false);
  const [showEditOrderDialog, setShowEditOrderDialog] = useState(false);
  const [showEditPaymentDialog, setShowEditPaymentDialog] = useState(false);
  const [showEditExpenseDialog, setShowEditExpenseDialog] = useState(false);
  const [showEditOpeningBalanceDialog, setShowEditOpeningBalanceDialog] = useState(false);
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState({
    open: false,
    type: "",
    id: "",
    name: ""
  });

  const fetchClients = async () => {
    setLoading(true);
    try {
      const { data: clients, error: clientsError } = await supabase
        .from("clients")
        .select("id, name, contact, address");
      
      if (clientsError) throw clientsError;

      const clientsWithCounts = await Promise.all(
        (clients || []).map(async (client) => {
          const { count, error: countError } = await supabase
            .from("order")
            .select("*", { count: "exact", head: true })
            .eq("user", client.id);
          
          if (countError) throw countError;

          return {
            ...client,
            orderCount: count || 0
          };
        })
      );

      setClients(clientsWithCounts || []);
    } catch (error) {
      console.error("Error fetching clients:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("materials")
        .select("id, name")
        .order("name", { ascending: true });

      if (error) throw error;
      setMaterials(data || []);
    } catch (error) {
      console.error("Error fetching materials:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOpeningBalances = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("opening_balances")
        .select(`
          *,
          clients!opening_balances_client_id_fkey(id, name)
        `)
        .not("client_id","is",null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Calculate paid amounts for each opening balance
      const balancesWithPaidAmounts = await Promise.all(
        (data || []).map(async (balance) => {
          const { data: paymentsData, error: paymentsError } = await supabase
            .from("finance")
            .select("amount_paid")
            .eq("user_id", balance.client_id)
            .eq("purpose", "Debt Clearance")
            .order("created_at", { ascending: true });

          if (paymentsError) throw paymentsError;

          const paidAmount = paymentsData?.reduce((sum, payment) => sum + payment.amount_paid, 0) || 0;
          
          return {
            ...balance,
            paid_amount: paidAmount
          };
        })
      );

      setOpeningBalances(balancesWithPaidAmounts || []);
    } catch (error) {
      console.error("Error fetching opening balances:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async (clientId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("order")
        .select("*")
        .eq("user", clientId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async (orderId: string) => {
    if (!orderId || orderId === '') {
      console.error('Invalid orderId:', orderId);
      setPayments([]);
      return;
    }
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("finance")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Supabase error fetching payments:", error);
        throw error;
      }
      setPayments(data || []);
    } catch (error) {
      console.error("Error fetching payments:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClientPayments = async (clientId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("finance")
        .select("*")
        .eq("user_id", clientId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setClientPayments(data || []);
    } catch (error) {
      console.error("Error fetching client payments:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchExpenses = async (clientId: string) => {
    setLoading(true);
    try {
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("name")
        .eq("id", clientId)
        .single();

      if (clientError) throw clientError;
      if (!clientData) throw new Error("Client not found");

      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("department", clientData.name)
        .order("date", { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (error) {
      console.error("Error fetching expenses:", error);
    } finally {
      setLoading(false);
    }
  };

 const fetchTransactions = async (clientId: string) => {
    setLoading(true);
    try {
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("name")
        .eq("id", clientId)
        .single();

      if (clientError) throw clientError;
      if (!clientData) throw new Error("Client not found");

      const { data: ordersData, error: ordersError } = await supabase
        .from("order")
        .select("*")
        .eq("user", clientId)
        .order("created_at", { ascending: true });

      if (ordersError) throw ordersError;

      const { data: paymentsData, error: paymentsError } = await supabase
        .from("finance")
        .select("*")
        .eq("user_id", clientId)
        .order("created_at", { ascending: true });

      if (paymentsError) throw paymentsError;

      const { data: openingBalancesData, error: openingBalancesError } = await supabase
        .from("opening_balances")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: true });

      if (openingBalancesError) throw openingBalancesError;

      // Combine transactions (excluding expenses since they don't affect client debt)
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
          item: order.material,
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
          item: `Payment (${payment.mode_of_payment})`,
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
      const transactionsWithBalance = allTransactions.map(transaction => {
        if (transaction.type === 'opening_balance') {
          netBalance += transaction.amount; // Add opening balance permanently
        } else if (transaction.type === 'order') {
          netBalance += transaction.amount; // Add order amount to debt
        } else if (transaction.type === 'payment') {
          netBalance -= transaction.payment; // Subtract payment from debt
        }
        
        // REMOVED the Math.max(0, netBalance) constraint to allow negative balances
        // This allows negative net balance to indicate overpayment (company owes client)
        
        return {
          ...transaction,
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
    if (!selectedClient || !newPayment.amount || !newPayment.mode_of_payment) return;

    try {
      // Check if client has an opening balance
      const { data: balances, error: balanceError } = await supabase
        .from("opening_balances")
        .select("*")
        .eq("client_id", selectedClient.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (balanceError) throw balanceError;
      
      let paymentPurpose = "Payment for Orders";
      let amountToDeduct = parseFloat(newPayment.amount);
      
      // If client has an opening balance that's not fully paid
      if (balances && balances.length > 0 && balances[0].status !== "Paid") {
        const balance = balances[0];
        const balanceAmount = parseFloat(balance.amount);
        
        // Get total payments made for debt clearance
        const { data: debtPayments, error: debtPaymentsError } = await supabase
          .from("finance")
          .select("amount_paid")
          .eq("user_id", selectedClient.id)
          .eq("purpose", "Debt Clearance");

        if (debtPaymentsError) throw debtPaymentsError;
        
        const totalPaidForDebt = debtPayments?.reduce((sum, payment) => sum + payment.amount_paid, 0) || 0;
        const remainingDebt = balanceAmount - totalPaidForDebt;
        
        if (remainingDebt > 0) {
          paymentPurpose = "Debt Clearance";
          
          // If payment amount is more than remaining debt, split the payment
          if (amountToDeduct > remainingDebt) {
            // First part for debt clearance
            const debtClearanceAmount = remainingDebt;
            
            // Create debt clearance payment
            const debtPaymentData: any = {
              amount_paid: debtClearanceAmount,
              created_at: newPayment.date,
              user_id: selectedClient.id,
              mode_of_payment: newPayment.mode_of_payment,
              payment_reference: `PAY-DEBT-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
              purpose: "Debt Clearance"
            };

            if (newPayment.mode_of_payment === 'Bank') {
              debtPaymentData.bank_name = newPayment.bank_name;
            } else if (newPayment.mode_of_payment === 'Mobile Money') {
              debtPaymentData.mode_of_mobilemoney = newPayment.mobile_money_provider;
            }

            const { error: debtPaymentError } = await supabase
              .from("finance")
              .insert([debtPaymentData]);

            if (debtPaymentError) throw debtPaymentError;
            
            // Update opening balance status to Paid
            const { error: updateError } = await supabase
              .from("opening_balances")
              .update({ 
                status: "Paid"
              })
              .eq("id", balance.id);

            if (updateError) throw updateError;
            
            // Second part for order payment (if any)
            const orderPaymentAmount = amountToDeduct - debtClearanceAmount;
            if (orderPaymentAmount > 0) {
              const orderPaymentData: any = {
                amount_paid: orderPaymentAmount,
                created_at: newPayment.date,
                user_id: selectedClient.id,
                mode_of_payment: newPayment.mode_of_payment,
                payment_reference: `PAY-ORDER-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
                purpose: "Payment for Orders"
              };

              if (newPayment.mode_of_payment === 'Bank') {
                orderPaymentData.bank_name = newPayment.bank_name;
              } else if (newPayment.mode_of_payment === 'Mobile Money') {
                orderPaymentData.mode_of_mobilemoney = newPayment.mobile_money_provider;
              }

              const { error: orderPaymentError } = await supabase
                .from("finance")
                .insert([orderPaymentData]);

              if (orderPaymentError) throw orderPaymentError;
            }
          } else {
            // Entire payment goes to debt clearance
            const paymentData: any = {
              amount_paid: amountToDeduct,
              created_at: newPayment.date,
              user_id: selectedClient.id,
              mode_of_payment: newPayment.mode_of_payment,
              payment_reference: `PAY-DEBT-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
              purpose: "Debt Clearance"
            };

            if (newPayment.mode_of_payment === 'Bank') {
              paymentData.bank_name = newPayment.bank_name;
            } else if (newPayment.mode_of_payment === 'Mobile Money') {
              paymentData.mode_of_mobilemoney = newPayment.mobile_money_provider;
            }

            const { error } = await supabase
              .from("finance")
              .insert([paymentData]);

            if (error) throw error;
            
            // Check if debt is fully paid after this payment
            const newTotalPaid = totalPaidForDebt + amountToDeduct;
            const newStatus = newTotalPaid >= balanceAmount ? "Paid" : "Pending Clearance";
            
            const { error: updateError } = await supabase
              .from("opening_balances")
              .update({ 
                status: newStatus
              })
              .eq("id", balance.id);

            if (updateError) throw updateError;
          }
        } else {
          // No remaining debt, proceed with normal order payment
          paymentPurpose = "Payment for Orders";
        }
      } else {
        // No opening balance or already paid, proceed with normal order payment
        paymentPurpose = "Payment for Orders";
      }
      
      // If payment wasn't already processed as debt clearance, process as order payment
      if (paymentPurpose === "Payment for Orders") {
        const paymentData: any = {
          amount_paid: amountToDeduct,
          created_at: newPayment.date,
          user_id: selectedClient.id,
          mode_of_payment: newPayment.mode_of_payment,
          payment_reference: `PAY-ORDER-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
          purpose: "Payment for Orders"
        };

        if (newPayment.mode_of_payment === 'Bank') {
          paymentData.bank_name = newPayment.bank_name;
        } else if (newPayment.mode_of_payment === 'Mobile Money') {
          paymentData.mode_of_mobilemoney = newPayment.mobile_money_provider;
        }

        const { error } = await supabase
          .from("finance")
          .insert([paymentData]);

        if (error) throw error;
      }

      await fetchClientPayments(selectedClient.id);
      await fetchTransactions(selectedClient.id);
      await fetchOpeningBalances();
      
      setNewPayment({
        date: getCurrentEATDateTime(),
        amount: "",
        mode_of_payment: "",
        bank_name: "",
        mobile_money_provider: "",
        purpose: "Payment for Orders",
        order_id: ""
      });
      setShowPaymentForm(false);
    } catch (error) {
      console.error("Error adding payment:", error);
      alert("Error adding payment. Please try again.");
    }
  };

  const updatePayment = async () => {
    if (!editPayment || !editPayment.amount_paid || !editPayment.mode_of_payment) return;

    try {
      const paymentData: any = {
        amount_paid: editPayment.amount_paid,
        mode_of_payment: editPayment.mode_of_payment,
        purpose: editPayment.purpose
      };

      if (editPayment.mode_of_payment === 'Bank') {
        paymentData.bank_name = editPayment.bank_name;
      } else if (editPayment.mode_of_payment === 'Mobile Money') {
        paymentData.mode_of_mobilemoney = editPayment.mode_of_mobilemoney;
      }

      const { error } = await supabase
        .from("finance")
        .update(paymentData)
        .eq("id", editPayment.id);

      if (error) throw error;
      
      if (editPayment.order_id) {
        await fetchPayments(editPayment.order_id);
      }
      if (selectedClient) {
        await fetchClientPayments(selectedClient.id);
        await fetchTransactions(selectedClient.id);
      }
      await fetchOpeningBalances();
      
      setEditPayment(null);
      setShowEditPaymentDialog(false);
    } catch (error) {
      console.error("Error updating payment:", error);
      alert("Error updating payment. Please try again.");
    }
  };

  const addOrder = async () => {
    if (!selectedClient || !newOrder.material || !newOrder.quantity || !newOrder.cost) return;

    try {
      const material = materials.find(m => m.name === newOrder.material);
      if (!material) throw new Error("Material not found");

      const { error: orderError } = await supabase
        .from("order")
        .insert([{
          user: selectedClient.id,
          material: newOrder.material,
          quantity: parseFloat(newOrder.quantity),
          cost: parseFloat(newOrder.cost),
          created_at: formatToEATDateTime(datetimeLocalToISO(newOrder.date)),
          total_amount: parseFloat(newOrder.quantity) * parseFloat(newOrder.cost)
        }]);

      if (orderError) throw orderError;
      
      const { error: entryError } = await supabase
        .from("material_entries")
        .insert([{
          material_id: material.id,
          name: newOrder.material,
          quantity: -parseFloat(newOrder.quantity),
          created_at: newOrder.date,
          date: newOrder.date,
          action: 'Sold to Client',
          created_by: 'Admin',
          transaction: `${selectedClient.name}-Order`
        }]);

      if (entryError) throw entryError;
      
      await fetchOrders(selectedClient.id);
      await fetchTransactions(selectedClient.id);
      setNewOrder({
        date: getCurrentEATDateTime(),
        material: "",
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
    if (!editOrder || !editOrder.material || !editOrder.quantity || !editOrder.cost) return;

    try {
      const { error } = await supabase
        .from("order")
        .update({
          material: editOrder.material,
          quantity: editOrder.quantity,
          cost: editOrder.cost,
          total_amount: editOrder.quantity * editOrder.cost
        })
        .eq("id", editOrder.id);

      if (error) throw error;
      
      if (selectedClient) {
        await fetchOrders(selectedClient.id);
        await fetchTransactions(selectedClient.id);
      }
      
      setEditOrder(null);
      setShowEditOrderDialog(false);
    } catch (error) {
      console.error("Error updating order:", error);
      alert("Error updating order. Please try again.");
    }
  };

  const addExpense = async () => {
    if (!selectedClient || !newExpense.item || !newExpense.amount) return;

    try {
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("name")
        .eq("id", selectedClient.id)
        .single();

      if (clientError) throw clientError;
      if (!clientData) throw new Error("Client not found");

      const { error } = await supabase
        .from("expenses")
        .insert([{
          date: newExpense.date,
          item: newExpense.item,
          amount_spent: parseFloat(newExpense.amount),
          department: clientData.name
        }]);

      if (error) throw error;
      
      await fetchExpenses(selectedClient.id);
      await fetchTransactions(selectedClient.id);
      setNewExpense({
        date: getCurrentEATDateTime(),
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
    if (!editExpense || !editExpense.item || !editExpense.amount_spent) return;

    try {
      const { error } = await supabase
        .from("expenses")
        .update({
          date: editExpense.date,
          item: editExpense.item,
          amount_spent: editExpense.amount_spent
        })
        .eq("id", editExpense.id);

      if (error) throw error;
      
      if (selectedClient) {
        await fetchExpenses(selectedClient.id);
        await fetchTransactions(selectedClient.id);
      }
      
      setEditExpense(null);
      setShowEditExpenseDialog(false);
    } catch (error) {
      console.error("Error updating expense:", error);
      alert("Error updating expense. Please try again.");
    }
  };

  const addOpeningBalance = async () => {
    if (!newOpeningBalance.client_id || !newOpeningBalance.amount) return;

    try {
      const { error } = await supabase
        .from("opening_balances")
        .insert([{
          client_id: newOpeningBalance.client_id,
          amount: parseFloat(newOpeningBalance.amount),
          status: newOpeningBalance.status,
          created_at: newOpeningBalance.date
        }]);

      if (error) throw error;
      
      await fetchOpeningBalances();
      await fetchTransactions(newOpeningBalance.client_id);
      setNewOpeningBalance({
        date: getCurrentEATDateTime(),
        amount: "",
        client_id: "",
        status: "Unpaid"
      });
      setShowOpeningBalanceDialog(false);
    } catch (error) {
      console.error("Error adding opening balance:", error);
      alert("Error adding opening balance. Please try again.");
    }
  };

  const updateOpeningBalance = async () => {
    if (!editOpeningBalance || !editOpeningBalance.amount) return;

    try {
      const { error } = await supabase
        .from("opening_balances")
        .update({
          amount: editOpeningBalance.amount,
          status: editOpeningBalance.status,
          created_at: editOpeningBalance.created_at
        })
        .eq("id", editOpeningBalance.id);

      if (error) throw error;
      
      await fetchOpeningBalances();
      if (editOpeningBalance.client_id) {
        await fetchTransactions(editOpeningBalance.client_id);
      }
      
      setEditOpeningBalance(null);
      setShowEditOpeningBalanceDialog(false);
    } catch (error) {
      console.error("Error updating opening balance:", error);
      alert("Error updating opening balance. Please try again.");
    }
  };

  const addClient = async () => {
    if (!newClient.name || !newClient.contact) return;

    try {
      const { error } = await supabase
        .from("clients")
        .insert([{
          name: newClient.name,
          contact: newClient.contact,
          address: newClient.address
        }]);

      if (error) throw error;
      
      await fetchClients();
      setNewClient({
        name: "",
        contact: "",
        address: ""
      });
      setShowAddClientDialog(false);
    } catch (error) {
      console.error("Error adding client:", error);
      alert("Error adding client. Please try again.");
    }
  };

  const updateClient = async () => {
    if (!editClient || !editClient.name || !editClient.contact) return;

    try {
      const { error } = await supabase
        .from("clients")
        .update({
          name: editClient.name,
          contact: editClient.contact,
          address: editClient.address
        })
        .eq("id", editClient.id);

      if (error) throw error;
      
      await fetchClients();
      setEditClient(null);
      setShowEditClientDialog(false);
    } catch (error) {
      console.error("Error updating client:", error);
      alert("Error updating client. Please try again.");
    }
  };

  const updateOpeningBalanceStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from("opening_balances")
        .update({ status })
        .eq("id", id);

      if (error) throw error;
      
      await fetchOpeningBalances();
      
      if (status === "Pay") {
        const balance = openingBalances.find(b => b.id === id);
        if (balance) {
          setSelectedClient(clients.find(c => c.id === balance.client_id) || null);
          setNewPayment({
            date: getCurrentEATDateTime(),
            amount: balance.amount.toString(),
            mode_of_payment: "",
            bank_name: "",
            mobile_money_provider: "",
            purpose: "Debt Clearance",
            order_id: ""
          });
          setShowPaymentForm(true);
        }
      }
    } catch (error) {
      console.error("Error updating opening balance status:", error);
      alert("Error updating status. Please try again.");
    }
  };

  const deleteItem = async () => {
    const { type, id } = deleteConfirmDialog;
    
    try {
      let error;
      
      switch (type) {
        case "client":
          ({ error } = await supabase
            .from("clients")
            .delete()
            .eq("id", id));
          break;
        case "order":
          ({ error } = await supabase
            .from("order")
            .delete()
            .eq("id", id));
          break;
        case "payment":
          ({ error } = await supabase
            .from("finance")
            .delete()
            .eq("id", id));
          break;
        case "expense":
          ({ error } = await supabase
            .from("expenses")
            .delete()
            .eq("id", id));
          break;
        case "opening_balance":
          ({ error } = await supabase
            .from("opening_balances")
            .delete()
            .eq("id", id));
          break;
        default:
          throw new Error("Unknown item type");
      }

      if (error) throw error;
      
      // Refresh data based on the deleted item type
      switch (type) {
        case "client":
          await fetchClients();
          break;
        case "order":
          if (selectedClient) {
            await fetchOrders(selectedClient.id);
            await fetchTransactions(selectedClient.id);
          }
          break;
        case "payment":
          if (selectedOrder) {
            await fetchPayments(selectedOrder.id);
          }
          if (selectedClient) {
            await fetchClientPayments(selectedClient.id);
            await fetchTransactions(selectedClient.id);
          }
          break;
        case "expense":
          if (selectedClient) {
            await fetchExpenses(selectedClient.id);
            await fetchTransactions(selectedClient.id);
          }
          break;
        case "opening_balance":
          await fetchOpeningBalances();
          if (selectedClient) {
            await fetchTransactions(selectedClient.id);
          }
          break;
      }
      
      setDeleteConfirmDialog({ open: false, type: "", id: "", name: "" });
    } catch (error) {
      console.error(`Error deleting ${type}:`, error);
      alert(`Error deleting ${type}. Please try again.`);
    }
  };

  const downloadLedger = () => {
    if (transactions.length === 0) return;

    const headers = [
      "Date & Time",
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
        new Date(t.date || new Date()).toLocaleString(),
        t.type,
        t.type === 'order' ? 
          `${t.item} (Order #${t.id})` : 
          t.type === 'payment' ?
          `Payment (${t.mode_of_payment})` :
          t.type === 'opening_balance' ?
          `Opening Balance (${t.status})` :
          `Expense: ${t.item}`,
        t.type === 'order' || t.type === 'opening_balance' ? t.quantity : '',
        t.type === 'order' || t.type === 'opening_balance' ? (t.unit_price?.toLocaleString() || '0') : '',
        t.type === 'order' || t.type === 'opening_balance' ? (t.amount?.toLocaleString() || '0') : '',
        t.type === 'payment' ? (t.payment?.toLocaleString() || '0') : '',
        t.type === 'expense' ? (t.expense?.toLocaleString() || '0') : '',
        t.order_balance?.toLocaleString() || '0',
        t.net_balance?.toLocaleString() || '0'
      ].map(v => `"${v}"`).join(","))
    ];

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ledger_${selectedClient?.name}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalPaid = payments.reduce((sum, payment) => sum + (payment.amount_paid || 0), 0);
  const balance = selectedOrder ? (selectedOrder.total_amount || 0) - totalPaid : 0;

  useEffect(() => {
    fetchClients();
    fetchMaterials();
    fetchOpeningBalances();
  }, []);

  const handleViewOrders = (client: Client) => {
    setSelectedClient(client);
    fetchOrders(client.id);
    fetchExpenses(client.id);
    fetchTransactions(client.id);
    fetchClientPayments(client.id);
    setShowOrdersDialog(true);
  };

  const handleViewPayments = (order: Order) => {
    setSelectedOrder(order);
    fetchPayments(order.id);
    setShowPaymentsDialog(true);
  };

  const handleViewLedger = () => {
    setShowLedgerDialog(true);
  };

  const handleEditClient = (client: Client) => {
    setEditClient(client);
    setShowEditClientDialog(true);
  };

  const handleEditOrder = (order: Order) => {
    setEditOrder(order);
    setShowEditOrderDialog(true);
  };

  const handleEditPayment = (payment: Payment) => {
    setEditPayment(payment);
    setShowEditPaymentDialog(true);
  };

  const handleEditExpense = (expense: Expense) => {
    setEditExpense(expense);
    setShowEditExpenseDialog(true);
  };

  const handleEditOpeningBalance = (balance: OpeningBalance) => {
    setEditOpeningBalance(balance);
    setShowEditOpeningBalanceDialog(true);
  };

  const handleDeleteItem = (type: string, id: string, name: string) => {
    setDeleteConfirmDialog({ open: true, type, id, name });
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          Clients Management
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          View and manage clients and their orders
        </p>
      </div>

      <div className="flex space-x-4 mb-6">
        <Button
          variant="outline"
          onClick={() => setShowOpeningBalancesList(true)}
        >
          View Client Balances
        </Button>
      </div>

      {/* Clients Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden mb-8">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="font-semibold text-gray-700">Client Name</TableHead>
              <TableHead className="font-semibold text-gray-700">Contact</TableHead>
              <TableHead className="font-semibold text-gray-700">Number of Orders</TableHead>
              <TableHead className="font-semibold text-gray-700 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : clients.length > 0 ? (
              clients.map((client) => (
                <TableRow key={client.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell>{client.contact}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{client.orderCount}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewOrders(client)}
                      className="mr-2"
                    >
                      <Eye size={16} className="mr-1" /> View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                  No clients found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {/* Client Opening Balances List Dialog */}
      <Dialog open={showOpeningBalancesList} onOpenChange={setShowOpeningBalancesList}>
        <DialogContent className="max-w-4xl rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Client Opening Balances
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="font-semibold">Date & Time</TableHead>
                  <TableHead className="font-semibold">Client</TableHead>
                  <TableHead className="font-semibold text-right">Amount</TableHead>
                  <TableHead className="font-semibold text-right">Paid</TableHead>
                  <TableHead className="font-semibold text-right">Balance</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {openingBalances.map((balance) => {
                  const client = clients.find(c => c.id === balance.client_id);
                  const balanceAmount = parseFloat(balance.amount || "0");
                  const paidAmount = balance.paid_amount || 0;
                  const remainingBalance = balanceAmount - paidAmount;
                  
                  return (
                    <TableRow key={balance.id}>
                      <TableCell>
                        {new Date(balance.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>{client?.name || 'Unknown Client'}</TableCell>
                      <TableCell className="text-right">
                        {balanceAmount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {paidAmount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {remainingBalance.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            balance.status === 'Paid' ? 'default' :
                            balance.status === 'Pending Clearance' ? 'secondary' :
                            'destructive'
                          }
                        >
                          {balance.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {openingBalances.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      No client opening balances recorded
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Form */}
      <Dialog open={showPaymentForm} onOpenChange={setShowPaymentForm}>
        <DialogContent className="max-w-md rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Record Payment for {selectedClient?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date & Time
              </label>
              <Input
                type="datetime-local"
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
      <Dialog open={showEditPaymentDialog} onOpenChange={setShowEditPaymentDialog}>
        <DialogContent className="max-w-md rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Edit Payment
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date & Time
              </label>
              <Input
                type="datetime-local"
                value={editPayment?.created_at ? new Date(editPayment.created_at).toISOString().slice(0, 16) : ""}
                onChange={(e) => setEditPayment(editPayment ? {
                  ...editPayment,
                  created_at: e.target.value
                } : null)}
                disabled={true}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount
              </label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={editPayment?.amount_paid || ""}
                onChange={(e) => setEditPayment(editPayment ? {
                  ...editPayment,
                  amount_paid: parseFloat(e.target.value)
                } : null)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mode of Payment
              </label>
              <Select
                value={editPayment?.mode_of_payment || ""}
                onValueChange={(value) => setEditPayment(editPayment ? {
                  ...editPayment,
                  mode_of_payment: value,
                  bank_name: value !== 'Bank' ? "" : editPayment?.bank_name,
                  mode_of_mobilemoney: value !== 'Mobile Money' ? "" : editPayment?.mode_of_mobilemoney
                } : null)}
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
            {editPayment?.mode_of_payment === 'Bank' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bank Name
                </label>
                <Input
                  type="text"
                  placeholder="Enter bank name"
                  value={editPayment?.bank_name || ""}
                  onChange={(e) => setEditPayment(editPayment ? {
                    ...editPayment,
                    bank_name: e.target.value
                  } : null)}
                />
              </div>
            )}
            {editPayment?.mode_of_payment === 'Mobile Money' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mobile Money Provider
                </label>
                <Select
                  value={editPayment?.mode_of_mobilemoney || ""}
                  onValueChange={(value) => setEditPayment(editPayment ? {
                    ...editPayment,
                    mode_of_mobilemoney: value
                  } : null)}
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
              onClick={updatePayment}
              disabled={
                !editPayment?.amount_paid || 
                !editPayment?.mode_of_payment || 
                (editPayment.mode_of_payment === 'Bank' && !editPayment.bank_name) ||
                (editPayment.mode_of_payment === 'Mobile Money' && !editPayment.mode_of_mobilemoney)
              }
            >
              Update Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Orders Dialog */}
      <Dialog open={showOrdersDialog} onOpenChange={setShowOrdersDialog}>
        <DialogContent className="max-w-6xl rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Orders for {selectedClient?.name}
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
                  <TableHead className="font-semibold">Date & Time</TableHead>
                  <TableHead className="font-semibold">Material</TableHead>
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
                      {new Date(order.created_at || new Date()).toLocaleString()}
                    </TableCell>
                    <TableCell>{order.material}</TableCell>
                    <TableCell>{order.quantity}</TableCell>
                    <TableCell>{(order.cost || 0).toLocaleString()}</TableCell>
                    <TableCell>
                      {((order.quantity || 0) * (order.cost || 0)).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewPayments(order)}
                        >
                          <Eye size={14} className="mr-1" /> Payments
                        </Button>
                        
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {orders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      No orders found for this client
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
              Add New Order for {selectedClient?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date & Time
              </label>
              <Input
                type="datetime-local"
                value={newOrder.date}
                onChange={(e) => setNewOrder({
                  ...newOrder,
                  date: e.target.value
                })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Material
              </label>
              <Select
                value={newOrder.material}
                onValueChange={(value) => setNewOrder({
                  ...newOrder,
                  material: value
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a material" />
                </SelectTrigger>
                <SelectContent>
                  {materials.map((material) => (
                    <SelectItem key={material.name} value={material.name}>
                      {material.name}
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
            <Button onClick={addOrder} disabled={!newOrder.material || !newOrder.quantity || !newOrder.cost}>
              Add Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Order Dialog */}
      <Dialog open={showEditOrderDialog} onOpenChange={setShowEditOrderDialog}>
        <DialogContent className="max-w-md rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Edit Order for {selectedClient?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date & Time
              </label>
              <Input
                type="datetime-local"
                value={editOrder?.created_at ? new Date(editOrder.created_at).toISOString().slice(0, 16) : ""}
                onChange={(e) => setEditOrder(editOrder ? {
                  ...editOrder,
                  created_at: e.target.value
                } : null)}
                disabled={true}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Material
              </label>
              <Select
                value={editOrder?.material || ""}
                onValueChange={(value) => setEditOrder(editOrder ? {
                  ...editOrder,
                  material: value
                } : null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a material" />
                </SelectTrigger>
                <SelectContent>
                  {materials.map((material) => (
                    <SelectItem key={material.name} value={material.name}>
                      {material.name}
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
                value={editOrder?.quantity || ""}
                onChange={(e) => setEditOrder(editOrder ? {
                  ...editOrder,
                  quantity: parseFloat(e.target.value)
                } : null)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit Price
              </label>
              <Input
                type="number"
                placeholder="Enter unit price"
                value={editOrder?.cost || ""}
                onChange={(e) => setEditOrder(editOrder ? {
                  ...editOrder,
                  cost: parseFloat(e.target.value)
                } : null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={updateOrder} disabled={!editOrder?.material || !editOrder?.quantity || !editOrder?.cost}>
              Update Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Expense Dialog */}
      <Dialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog}>
        <DialogContent className="max-w-md rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Record Expense for {selectedClient?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date & Time
              </label>
              <Input
                type="datetime-local"
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
      <Dialog open={showEditExpenseDialog} onOpenChange={setShowEditExpenseDialog}>
        <DialogContent className="max-w-md rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Edit Expense for {selectedClient?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date & Time
              </label>
              <Input
                type="datetime-local"
                value={editExpense?.date ? new Date(editExpense.date).toISOString().slice(0, 16) : ""}
                onChange={(e) => setEditExpense(editExpense ? {
                  ...editExpense,
                  date: e.target.value
                } : null)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Item
              </label>
              <Input
                type="text"
                placeholder="Enter expense item"
                value={editExpense?.item || ""}
                onChange={(e) => setEditExpense(editExpense ? {
                  ...editExpense,
                  item: e.target.value
                } : null)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount
              </label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={editExpense?.amount_spent || ""}
                onChange={(e) => setEditExpense(editExpense ? {
                  ...editExpense,
                  amount_spent: parseFloat(e.target.value)
                } : null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={updateExpense} disabled={!editExpense?.item || !editExpense?.amount_spent}>
              Update Expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* General Ledger Dialog */}
      <Dialog open={showLedgerDialog} onOpenChange={setShowLedgerDialog}>
        <DialogContent className="max-w-6xl rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              General Ledger for {selectedClient?.name}
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
                  <TableHead className="font-semibold">Date & Time</TableHead>
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
                     {new Date(transaction.date || new Date()).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {transaction.type === 'order' ? 
                        `${transaction.item} (Order #${transaction.id})` : 
                        transaction.type === 'payment' ?
                        `Payment (${transaction.mode_of_payment})` :
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
                      {transaction.type === 'order' || transaction.type === 'opening_balance' ? (transaction.unit_price || 0).toLocaleString() : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {transaction.type === 'order' || transaction.type === 'opening_balance' ? (transaction.amount || 0).toLocaleString() : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {transaction.type === 'payment' ? (transaction.payment || 0).toLocaleString() : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {transaction.type === 'expense' ? (transaction.expense || 0).toLocaleString() : '-'}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${
                      (transaction.order_balance || 0) > 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {(transaction.order_balance || 0).toLocaleString()}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${
                      (transaction.net_balance || 0) > 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {(transaction.net_balance || 0).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
                {transactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                      No transactions found for this client
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
                <p className="font-bold">{(selectedOrder?.total_amount || 0).toLocaleString()}</p>
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
                    <TableHead>Date & Time</TableHead>
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
                        {new Date(payment.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>{payment.mode_of_payment}</TableCell>
                      <TableCell>
                        {payment.mode_of_payment === 'Bank' && payment.bank_name}
                        {payment.mode_of_payment === 'Mobile Money' && payment.mode_of_mobilemoney}
                      </TableCell>
                      <TableCell>
                        {(payment.amount_paid || 0).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditPayment(payment)}
                          >
                            <Pencil size={14} />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteItem("payment", payment.id, `Payment of ${payment.amount_paid}`)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {payments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4 text-gray-500">
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmDialog.open} onOpenChange={(open) => setDeleteConfirmDialog({...deleteConfirmDialog, open})}>
        <DialogContent className="max-w-md rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Confirm Deletion
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this {deleteConfirmDialog.type}: {deleteConfirmDialog.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmDialog({ open: false, type: "", id: "", name: "" })}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={deleteItem}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
