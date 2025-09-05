"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  
  const [newPayment, setNewPayment] = useState({
    date: getCurrentEATDateTime(),
    amount: "",
    mode_of_payment: "",
    bank_name: "",
    mobile_money_provider: "",
    purpose: "Order Payment",
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
  
  const [showOrdersDialog, setShowOrdersDialog] = useState(false);
  const [showPaymentsDialog, setShowPaymentsDialog] = useState(false);
  const [showAddOrderDialog, setShowAddOrderDialog] = useState(false);
  const [showLedgerDialog, setShowLedgerDialog] = useState(false);
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [showOpeningBalanceDialog, setShowOpeningBalanceDialog] = useState(false);
  const [showOpeningBalancesList, setShowOpeningBalancesList] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showAddClientDialog, setShowAddClientDialog] = useState(false);

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
      setOpeningBalances(data || []);
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
        .order("created_at", { ascending: false });

      if (ordersError) throw ordersError;

      const { data: paymentsData, error: paymentsError } = await supabase
        .from("finance")
        .select("*")
        .eq("user_id", clientId)
        .order("created_at", { ascending: false });

      if (paymentsError) throw paymentsError;

      const { data: expensesData, error: expensesError } = await supabase
        .from("expenses")
        .select("*")
        .eq("department", clientData.name)
        .order("date", { ascending: false });

      if (expensesError) throw expensesError;

      const { data: openingBalancesData, error: openingBalancesError } = await supabase
        .from("opening_balances")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });

      if (openingBalancesError) throw openingBalancesError;

      const allTransactions = [
        ...(openingBalancesData?.map(balance => ({
          type: 'opening_balance',
          id: balance.id,
          date: balance.created_at,
          item: `Opening Balance`,
          amount: parseFloat(balance.amount || "0"),
          quantity: 1,
          unit_price: parseFloat(balance.amount || "0"),
          payment: 0,
          expense: 0,
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
          amount: order.quantity * order.cost,
          payment: 0,
          expense: 0,
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
          payment: payment.amount_paid,
          expense: 0,
          item: `Payment (${payment.mode_of_payment})`,
          mode_of_payment: payment.mode_of_payment,
          bank_name: payment.bank_name,
          mobile_money_provider: payment.mode_of_mobilemoney,
          purpose: payment.purpose || '',
          status: '',
          quantity: 0,
          unit_price: 0
        })) || []),
        ...((expensesData || []).map(expense => ({
          type: 'expense',
          id: expense.id,
          date: expense.date,
          item: expense.item,
          amount: 0,
          payment: 0,
          expense: expense.amount_spent,
          description: `Expense: ${expense.item}`,
          purpose: '',
          status: '',
          mode_of_payment: '',
          bank_name: '',
          mobile_money_provider: '',
          quantity: 0,
          unit_price: 0
        })) || [])
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      let orderBalance = 0;
      let netBalance = 0;
      const transactionsWithBalance = allTransactions.map(transaction => {
        if (transaction.type === 'opening_balance') {
          netBalance += transaction.amount;
        } else if (transaction.type === 'order') {
          orderBalance += transaction.amount;
          netBalance += transaction.amount;
        } else if (transaction.type === 'payment') {
          if (transaction.purpose === 'Debt Clearance') {
            netBalance -= transaction.payment;
          } else {
            orderBalance -= transaction.payment;
            netBalance -= transaction.payment;
          }
        } else if (transaction.type === 'expense') {
          netBalance -= transaction.expense;
        }
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
    if (!selectedClient || !newPayment.amount || !newPayment.mode_of_payment) return;

    try {
      const paymentData: any = {
        amount_paid: parseFloat(newPayment.amount),
        created_at: newPayment.date,
        user_id: selectedClient.id,
        mode_of_payment: newPayment.mode_of_payment,
        payment_reference: `PAY-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        purpose: newPayment.purpose
      };

      if (newPayment.purpose === "Order Payment" && newPayment.order_id) {
        paymentData.order_id = newPayment.order_id;
      }

      if (newPayment.mode_of_payment === 'Bank') {
        paymentData.bank_name = newPayment.bank_name;
      } else if (newPayment.mode_of_payment === 'Mobile Money') {
        paymentData.mode_of_mobilemoney = newPayment.mobile_money_provider;
      }

      const { error } = await supabase
        .from("finance")
        .insert([paymentData]);

      if (error) throw error;
      
      if (newPayment.purpose === "Debt Clearance") {
        const { data: balances, error: balanceError } = await supabase
          .from("opening_balances")
          .select("*")
          .eq("client_id", selectedClient.id)
          .order("created_at", { ascending: false })
          .limit(1);

        if (balanceError) throw balanceError;
        
        if (balances && balances.length > 0) {
          const balance = balances[0];
          const newAmount = parseFloat(balance.amount) - parseFloat(newPayment.amount);
          
          const { error: updateError } = await supabase
            .from("opening_balances")
            .update({ 
              amount: newAmount.toString(),
              status: newAmount <= 0 ? "Paid" : "Pending Clearance"
            })
            .eq("id", balance.id);

          if (updateError) throw updateError;
        }
      }

      if (newPayment.order_id) {
        await fetchPayments(newPayment.order_id);
      }
      await fetchTransactions(selectedClient.id);
      await fetchOpeningBalances();
      
      setNewPayment({
        date: getCurrentEATDateTime(),
        amount: "",
        mode_of_payment: "",
        bank_name: "",
        mobile_money_provider: "",
        purpose: "Order Payment",
        order_id: ""
      });
      setShowPaymentForm(false);
    } catch (error) {
      console.error("Error adding payment:", error);
      alert("Error adding payment. Please try again.");
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
                      View Orders
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

      {/* Add Client Dialog */}
      <Dialog open={showAddClientDialog} onOpenChange={setShowAddClientDialog}>
        <DialogContent className="max-w-md rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Add New Client
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <Input
                type="text"
                placeholder="Client name"
                value={newClient.name}
                onChange={(e) => setNewClient({
                  ...newClient,
                  name: e.target.value
                })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact
              </label>
              <Input
                type="text"
                placeholder="Phone number"
                value={newClient.contact}
                onChange={(e) => setNewClient({
                  ...newClient,
                  contact: e.target.value
                })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <Input
                type="text"
                placeholder="Physical address"
                value={newClient.address}
                onChange={(e) => setNewClient({
                  ...newClient,
                  address: e.target.value
                })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={addClient} disabled={!newClient.name || !newClient.contact}>
              Add Client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Opening Balance Dialog */}
      <Dialog open={showOpeningBalanceDialog} onOpenChange={setShowOpeningBalanceDialog}>
        <DialogContent className="max-w-md rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Record Client Opening Balance
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date & Time
              </label>
              <Input
                type="datetime-local"
                value={newOpeningBalance.date}
                onChange={(e) => setNewOpeningBalance({
                  ...newOpeningBalance,
                  date: e.target.value
                })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client
              </label>
              <Select
                value={newOpeningBalance.client_id}
                onValueChange={(value) => setNewOpeningBalance({
                  ...newOpeningBalance,
                  client_id: value
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount
              </label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={newOpeningBalance.amount}
                onChange={(e) => setNewOpeningBalance({
                  ...newOpeningBalance,
                  amount: e.target.value
                })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <Select
                value={newOpeningBalance.status}
                onValueChange={(value) => setNewOpeningBalance({
                  ...newOpeningBalance,
                  status: value
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Unpaid">Unpaid</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Pending Clearance">Pending Clearance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={addOpeningBalance} disabled={!newOpeningBalance.client_id || !newOpeningBalance.amount}>
              Record Opening Balance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {openingBalances.map((balance) => {
                  const client = clients.find(c => c.id === balance.client_id);
                  return (
                    <TableRow key={balance.id}>
                      <TableCell>
                        {new Date(balance.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>{client?.name || 'Unknown Client'}</TableCell>
                      <TableCell className="text-right">
                        {parseFloat(balance.amount || "0").toLocaleString()}
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
                      <TableCell className="text-right">
                        <Select
                          value={balance.status}
                          onValueChange={(value) => updateOpeningBalanceStatus(balance.id, value)}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Change Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Unpaid">Unpaid</SelectItem>
                            <SelectItem value="Pay">Pay</SelectItem>
                            <SelectItem value="Paid">Paid</SelectItem>
                            <SelectItem value="Pending Clearance">Pending Clearance</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {openingBalances.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
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
              {newPayment.purpose === "Debt Clearance" 
                ? "Record Payment for Debt Clearance" 
                : "Record Payment for Order"}
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
            
            {newPayment.purpose === "Order Payment" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Order
                </label>
                <Select
                  value={newPayment.order_id}
                  onValueChange={(value) => setNewPayment({
                    ...newPayment,
                    order_id: value
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select order" />
                  </SelectTrigger>
                  <SelectContent>
                    {orders.map((order) => (
                      <SelectItem key={order.id} value={order.id}>
                        {order.material} (Qty: {order.quantity}) - {(order.total_amount || 0).toLocaleString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
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
                (newPayment.mode_of_payment === 'Mobile Money' && !newPayment.mobile_money_provider) ||
                (newPayment.purpose === "Order Payment" && !newPayment.order_id)
              }
            >
              Record Payment
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
                    </TableRow>
                  ))}
                  {payments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4 text-gray-500">
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
