// app/suppliers/page.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Supplier {
  id: string;
  name: string;
  contact: string;
  address: string;
  created_at: string;
}

interface SupplyItem {
  id: string;
  supplier_id: string;
  name: string;
  quantity: number;
  price: number;
  status: 'prepaid' | 'postpaid';
  created_at: string;
}

interface Delivery {
  id: string;
  supply_item_id: string | null; // This can be null
  quantity: number;
  unit_price: number; // Missing in your reset
  value: number; // Missing in your reset
  delivery_date: string;
  notes?: string;
  notes_type?: string;
  client_id?: string;
  created_at: string;
  material_id: string | null; // This can be null
  supplier_id?: string; // Missing in your reset
  balance_id?: string; // Missing in your reset
  balance_type?: 'money' | 'material'; // Missing in your reset
}

interface Payment {
  id: string;
  supply_item_id: string;
  supplier_id: string;
  amount: number;
  payment_date: string;
  method: string;
  bank_name?: string;
  mode_of_mobilemoney?: string;
  created_at: string;
}

interface Material {
  id: string;
  name: string;
  created_at: string;
}

interface SupplierBalance {
  id: string;
  supplier_id: string;
  opening_balance: number;
  balance_type: 'debit' | 'credit';
  current_balance: number;
  status: 'pending' | 'partially' | 'paid';
  partial_amount: number;
  created_at: string;
  updated_at: string;
}

interface MaterialBalance {
  id: string;
  supplier_id: string;
  material_id: string;
  material_name?: string;
  opening_balance: number;
  current_balance: number;
  balance_type: 'debit' | 'credit';
  status: 'pending' | 'partially' | 'delivered';
  partial_amount: number;
  created_at: string;
  updated_at: string;
}

interface Client {
  id: string;
  name: string;
  created_at: string;
}

interface Order {
  id: string;
  user: string;
  item: string;
  cost: number;
  quantity: number;
  created_at: string;
}

interface FinanceRecord {
  mode_of_payment: string;
  bank_name?: string;
  mode_of_mobilemoney?: string;
}

interface LedgerEntry {
  id: string;
  date: string;
  item: string;
  price: number;
  quantity: number;
  amount: number;
  amount_paid: number;
  balance: number;
  delivered: number;
  undelivered: number;
  type: 'supply' | 'payment' | 'delivery';
  method?: string;
}

// Define helper functions first
let supplierBalances: SupplierBalance[] = [];
let materialBalances: MaterialBalance[] = [];

const getSupplierBalance = (supplierId: string) => {
  return supplierBalances.find(b => b.supplier_id === supplierId);
};

const getMaterialBalance = (supplierId: string, materialId: string) => {
  return materialBalances.find(b => b.supplier_id === supplierId && b.material_id === materialId);
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'UGX'
  }).format(amount);
};

type Transaction = {
  id: string;
  type: 'delivery' | 'payment';
  date: string;
  quantity?: number;
  amount?: number;
  value?: number;
  method?: string;
  bank_name?: string;
  mode_of_mobilemoney?: string;
  notes?: string;
  client_id?: string;
};

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplyItems, setSupplyItems] = useState<SupplyItem[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [localSupplierBalances, setLocalSupplierBalances] = useState<SupplierBalance[]>([]);
  const [localMaterialBalances, setLocalMaterialBalances] = useState<MaterialBalance[]>([]);
  const [ledgerData, setLedgerData] = useState<LedgerEntry[]>([]);
   // Added new state for balance delivery visualization
  const [balanceDeliveryHistory, setBalanceDeliveryHistory] = useState<Delivery[]>([]);
  const [showBalanceHistoryModal, setShowBalanceHistoryModal] = useState(false);
  // Update the global balance variables when local states change
  useEffect(() => {
    supplierBalances = localSupplierBalances;
    materialBalances = localMaterialBalances;
  }, [localSupplierBalances, localMaterialBalances]);

  const [clients, setClients] = useState<Client[]>([]);
  const [financeRecords, setFinanceRecords] = useState<FinanceRecord[]>([]);
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [deliveryNoteType, setDeliveryNoteType] = useState('');
  const [deliveryUnitPrice, setDeliveryUnitPrice] = useState(0);
  const [balanceType, setBalanceType] = useState<'money' | 'material'>('money');
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [balanceStatus, setBalanceStatus] = useState<'pending' | 'partially' | 'paid' | 'delivered'>('pending');
  const [partialAmount, setPartialAmount] = useState(0);

  // Add function to fetch delivery history for a balance
  const fetchBalanceDeliveryHistory = async (balanceId: string, balanceType: 'money' | 'material') => {
    try {
      const { data, error } = await supabase
        .from('deliveries')
        .select('*')
        .eq('balance_id', balanceId)
        .eq('balance_type', balanceType)
        .order('delivery_date', { ascending: false });

      if (error) throw error;
      setBalanceDeliveryHistory(data || []);
      setShowBalanceHistoryModal(true);
    } catch (err) {
      console.error('Error fetching balance delivery history:', err);
      setError('Failed to load delivery history');
    }
  };
  
  const getEastAfricanDateTime = () => {
    const now = new Date();
    const offset = 3 * 60 * 60 * 1000; // East Africa Time (UTC+3)
    const eastAfricanTime = new Date(now.getTime() + offset);
    
    // Format as YYYY-MM-DDTHH:MM for datetime-local input
    const year = eastAfricanTime.getFullYear();
    const month = String(eastAfricanTime.getMonth() + 1).padStart(2, '0');
    const day = String(eastAfricanTime.getDate()).padStart(2, '0');
    const hours = String(eastAfricanTime.getHours()).padStart(2, '0');
    const minutes = String(eastAfricanTime.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };
  
  const [supplierForm, setSupplierForm] = useState<Omit<Supplier, "id" | "created_at">>({
    name: "",
    contact: "",
    address: "",
  });
  
  const [itemForm, setItemForm] = useState<Omit<SupplyItem, "id" | "created_at">>({
    supplier_id: "",
    name: "",
    quantity: 0,
    price: 0,
    status: 'postpaid',
  });
  
  const [deliveryForm, setDeliveryForm] = useState<Omit<Delivery, "id" | "created_at">>({    
  supply_item_id: null,    
  quantity: 0,
  unit_price: 0,
  value: 0,
  delivery_date: getEastAfricanDateTime(),
  notes: "",
  client_id: "",
  notes_type: "",
  material_id: null,
  supplier_id: "",
  balance_id: "",
  balance_type: undefined
});

  const [selectedClient, setSelectedClient] = useState('');
  
  const [paymentForm, setPaymentForm] = useState<Omit<Payment, "id" | "created_at">>({    
    supply_item_id: "",    
    supplier_id: "",    
    amount: 0,    
    payment_date: getEastAfricanDateTime(),    
    method: "cash",    
    bank_name: "",    
    mode_of_mobilemoney: "",  
  });

  const [balanceForm, setBalanceForm] = useState({
    supplier_id: "",
    opening_balance: 0,
    balance_type: "credit" as 'credit' | 'debit',
    status: 'pending' as 'pending' | 'partially' | 'paid' | 'delivered',
    partial_amount: 0,
    material_id: "",
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [selectedItem, setSelectedItem] = useState<SupplyItem | null>(null);
  const [showSuppliesModal, setShowSuppliesModal] = useState(false);
  const [showItemForm, setShowItemForm] = useState(false);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [showDeliveryForm, setShowDeliveryForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showTransactionsModal, setShowTransactionsModal] = useState(false);
  const [showBalanceForm, setShowBalanceForm] = useState(false);
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [showBalancesModal, setShowBalancesModal] = useState(false);
  const [selectedBalance, setSelectedBalance] = useState<SupplierBalance | MaterialBalance | null>(null);
  const [isBalanceDeliveryForm, setIsBalanceDeliveryForm] = useState(false);
  const [balanceDeliveryForm, setBalanceDeliveryForm] = useState<Omit<Delivery, "id" | "created_at">>({
    supply_item_id: null,
    quantity: 0,
    unit_price: 0,
    value: 0,
    delivery_date: getEastAfricanDateTime(),
    notes: "",
    client_id: "",
    material_id: null,
    supplier_id: "",
    balance_id: "",
    balance_type: undefined
  });
  
  // Helper function to calculate new balance after delivery
  const calculateNewBalance = () => {
    if (!selectedBalance) return 0;
    
    const isSupplierBalance = 'supplier_id' in selectedBalance && 
                            'current_balance' in selectedBalance &&
                            'id' in selectedBalance;
    
    const isMaterialBalance = 'material_id' in selectedBalance && 
                            'current_balance' in selectedBalance &&
                            'id' in selectedBalance;
    
    if (isSupplierBalance) {
      // For money balance (SupplierBalance)
      const supplierBalance = selectedBalance as SupplierBalance;
      // Convert quantity to monetary value by multiplying with unit price
      const deliveryValue = balanceDeliveryForm.quantity * balanceDeliveryForm.unit_price;
      const newBalance = supplierBalance.current_balance - deliveryValue;
      return Math.max(0, newBalance); // Ensure balance doesn't go negative
    } else if (isMaterialBalance) {
      // For material balance (MaterialBalance)
      const materialBalance = selectedBalance as MaterialBalance;
      // Reduce material balance directly by quantity
      const newBalance = materialBalance.current_balance - balanceDeliveryForm.quantity;
      return Math.max(0, newBalance); // Ensure balance doesn't go negative
    }
    return 0; // Default fallback
  };

  // Handle delivery against balance
 const handleBalanceDeliverySubmit = async () => {
  // Add this validation at the beginning of handleBalanceDeliverySubmit
if (!('material_id' in selectedBalance) && !balanceDeliveryForm.material_id) {
  setError('Please select a material for money balance delivery');
  return;
}
  if (!selectedBalance || !selectedSupplier) return;
  
  setError(null);
  
  try {
    // Calculate delivery value based on quantity and unit price
    const isSupplierBalance = 'supplier_id' in selectedBalance && 
                            'current_balance' in selectedBalance && 
                            'opening_balance' in selectedBalance && 
                            'status' in selectedBalance && 
                            'id' in selectedBalance;
    
    const deliveryValue = balanceDeliveryForm.quantity * balanceDeliveryForm.unit_price;
    
    // Get material ID - prioritize from selectedBalance if it's a material balance
    // Otherwise use the material_id from the form
    let materialId = null;
    if ('material_id' in selectedBalance && selectedBalance.material_id) {
      materialId = selectedBalance.material_id;
    } else if (balanceDeliveryForm.material_id) {
      materialId = balanceDeliveryForm.material_id;
    }
    
    // Handle client order if applicable
    let notes = balanceDeliveryForm.notes || '';
    let clientId = null;
    
    // Format notes type with proper capitalization
    let notesType = balanceDeliveryForm.notes_type;
    if (notesType) {
      notesType = notesType.charAt(0).toUpperCase() + notesType.slice(1).toLowerCase();
    }
    
    if (notesType === 'Client' && balanceDeliveryForm.client_id) {
      const clientName = clients.find(c => c.id === balanceDeliveryForm.client_id)?.name || '';
      notes = `${notes ? notes + ' | ' : ''}Client: ${clientName}`;
      clientId = balanceDeliveryForm.client_id;
      
      // Create a client order record
      const { error: orderError } = await supabase
        .from('order')
        .insert([{
          client_id: balanceDeliveryForm.client_id,
          user: balanceDeliveryForm.client_id,
          item: materialId ? materials.find(m => m.id === materialId)?.name || 'Material' : 'Money Balance',
          material: materialId ? materials.find(m => m.id === materialId)?.name || 'Material' : 'Money Balance',
          cost: balanceDeliveryForm.unit_price,
          quantity: balanceDeliveryForm.quantity,
          total_amount: deliveryValue,
          created_at: new Date().toISOString()
        }]);

      if (orderError) {
        console.error('Order creation error details:', {
          error: orderError,
          balanceData: {
            type: isSupplierBalance ? 'money' : 'material',
            price: balanceDeliveryForm.unit_price,
            quantity: balanceDeliveryForm.quantity
          }
        });
        throw orderError;
      }
    } else if (notesType === 'Stock') {
      notes = 'Stock' + (notes ? ` | ${notes}` : '');
    }
    
    // Create a record of the delivery in the deliveries table
    const deliveryData = {
      supplier_id: selectedSupplier.id,
      quantity: balanceDeliveryForm.quantity,
      unit_price: balanceDeliveryForm.unit_price,
      value: deliveryValue,
      delivery_date: balanceDeliveryForm.delivery_date,
      notes: notes,
      material_id: materialId, // Ensure material_id is included for both money and material balances
      supply_item_id: null, // Use null for supply_item_id since this is a balance delivery
      client_id: clientId,
      notes_type: notesType,
      // Store balance information in additional fields
      balance_id: selectedBalance.id,
      balance_type: isSupplierBalance ? 'money' : 'material'
    };
    
    const { data: deliveryRecord, error: deliveryError } = await supabase
      .from('deliveries')
      .insert([deliveryData])
      .select();
    
    if (deliveryError) throw deliveryError;
    
    // Add the new delivery to local state
    if (deliveryRecord?.[0]) {
      setDeliveries(prev => [...prev, deliveryRecord[0]]);
    }
    
    // Update the balance
    if (isSupplierBalance) {
      // Money balance (SupplierBalance)
      const supplierBalance = selectedBalance as SupplierBalance;
      const newBalance = Math.max(0, supplierBalance.current_balance - deliveryValue);
      
      // Determine new status
      let newStatus = supplierBalance.status;
      if (newBalance === 0) {
        newStatus = 'paid';
      } else if (newBalance < supplierBalance.opening_balance) {
        newStatus = 'partially';
      }
      
      const { error: updateError } = await supabase
        .from('supplier_balances')
        .update({
          current_balance: newBalance,
          status: newStatus,
          partial_amount: newStatus === 'partially' ? supplierBalance.opening_balance - newBalance : 0
        })
        .eq('id', supplierBalance.id);
      
      if (updateError) throw updateError;
      
      // Update local state
      setLocalSupplierBalances(prev => 
        prev.map(b => 
          b.id === supplierBalance.id 
            ? {
                ...b,
                current_balance: newBalance,
                status: newStatus,
                partial_amount: newStatus === 'partially' ? supplierBalance.opening_balance - newBalance : 0
              }
            : b
        )
      );
    } else if ('material_id' in selectedBalance && 'current_balance' in selectedBalance && 'opening_balance' in selectedBalance && 'status' in selectedBalance && 'id' in selectedBalance) {
      // Material balance (MaterialBalance)
      const materialBalance = selectedBalance as MaterialBalance;
      // Reduce material balance directly by quantity delivered
      const newBalance = Math.max(0, materialBalance.current_balance - balanceDeliveryForm.quantity);
      
      // Determine new status
      let newStatus = materialBalance.status;
      if (newBalance === 0) {
        newStatus = 'delivered';
      } else if (newBalance < materialBalance.opening_balance) {
        newStatus = 'partially';
      }
      
      const { error: updateError } = await supabase
        .from('material_balances')
        .update({
          current_balance: newBalance,
          status: newStatus,
          partial_amount: newStatus === 'partially' ? materialBalance.opening_balance - newBalance : 0
        })
        .eq('id', materialBalance.id);
      
      if (updateError) throw updateError;
      
      // Update local state
      setLocalMaterialBalances(prev => 
        prev.map(b => 
          b.id === materialBalance.id 
            ? {
                ...b,
                current_balance: newBalance,
                status: newStatus,
                partial_amount: newStatus === 'partially' ? materialBalance.opening_balance - newBalance : 0
              }
            : b
        )
      );
    }
    
    // Reset form and close modal
    setIsBalanceDeliveryForm(false);
    setSelectedBalance(null);
    setBalanceDeliveryForm({
      supply_item_id: null,
      quantity: 0,
      unit_price: 0,
      value: 0,
      delivery_date: getEastAfricanDateTime(),
      notes: "",
      notes_type: "",
      client_id: "",
      material_id: null,
      supplier_id: "",
      balance_id: "",
      balance_type: undefined
    });
  } catch (err) {
    console.error('Error recording delivery against balance:', err);
    setError(err instanceof Error ? err.message : 'Failed to record delivery. Please try again.');
  }
};
  
  // Get unique payment methods from finance records
  const getUniquePaymentMethods = () => {
      const methods = new Set<string>();
      financeRecords.forEach(record => {
        if (record.mode_of_payment) {
          const normalizedMethod = record.mode_of_payment.toLowerCase()
            .replace(/\s+/g, '_')
            .replace('mobile_money', 'mobile_money')
            .replace('mobile money', 'mobile_money')
            .replace('bank', 'bank')
            .replace('cash', 'cash');

          methods.add(normalizedMethod);
        }
      });
    
    methods.add('cash');
    methods.add('bank');
    methods.add('mobile_money');
    
    return Array.from(methods);
  };

  // Get unique bank names for Bank payment method
  const getUniqueBankNames = () => {
      const banks = new Set<string>();
      financeRecords.forEach(record => {
        const isBank = record.mode_of_payment && 
          (record.mode_of_payment.toLowerCase() === 'bank' ||
           record.mode_of_payment.toLowerCase() === 'bank transfer');

        if (isBank && record.bank_name) {
          banks.add(record.bank_name);
        }
      });
      return Array.from(banks);
  };

  // Get unique mobile money modes for Mobile Money payment method
  const getUniqueMobileMoneyModes = () => {
      const modes = new Set<string>();
      financeRecords.forEach(record => {
        const isMobileMoney = record.mode_of_payment &&
          (record.mode_of_payment.toLowerCase().includes('mobile') ||
           record.mode_of_payment.toLowerCase().includes('mtn') ||
           record.mode_of_payment.toLowerCase().includes('airtel'));

        if (isMobileMoney && record.mode_of_mobilemoney) {
          modes.add(record.mode_of_mobilemoney);
        }
      });
    
    return Array.from(modes);
  };

  const getSupplierItems = (supplierId: string) => {
    return supplyItems.filter(item => item.supplier_id === supplierId);
  };

  const getItemDeliveries = (itemId: string) => {
    return deliveries.filter(d => d.supply_item_id === itemId)
                    .sort((a, b) => new Date(b.delivery_date).getTime() - new Date(a.delivery_date).getTime());
  };

  const getItemPayments = (itemId: string) => {
    return payments.filter(p => p.supply_item_id === itemId)
                  .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());
  };

  const getCombinedTransactions = (itemId: string): Transaction[] => {
    const itemDeliveries = getItemDeliveries(itemId).map(d => ({
      id: d.id,
      type: 'delivery' as const,
      date: d.delivery_date,
      quantity: d.quantity,
      value: d.value,
      notes: d.notes,
      client_id: d.client_id || undefined,
    }));

    const itemPayments = getItemPayments(itemId).map(p => ({
      id: p.id,
      type: 'payment' as const,
      date: p.payment_date,
      amount: p.amount,
      method: p.method,
      bank_name: p.bank_name,
      mode_of_mobilemoney: p.mode_of_mobilemoney,
    }));

    return [...itemDeliveries, ...itemPayments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const getClientName = (clientId: string | undefined) => {
    if (!clientId) return null;
    const client = clients.find(c => c.id === clientId);
    return client ? client.name : null;
  };

  const getTotalDeliveredValue = (itemId: string) => {
    return getItemDeliveries(itemId).reduce((sum, d) => sum + d.value, 0);
  };

  const getTotalDeliveredQuantity = (itemId: string) => {
    return getItemDeliveries(itemId).reduce((sum, d) => sum + d.quantity, 0);
  };

  const getTotalPaid = (itemId: string) => {
    return getItemPayments(itemId).reduce((sum, p) => sum + p.amount, 0);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'Africa/Nairobi',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return date.toLocaleString('en-US', options);
  };

  const formatPaymentMethod = (method: string) => {
    switch (method) {
      case 'cash': return 'Cash';
      case 'bank': return 'Bank';
      case 'mobile_money': return 'Mobile Money';
      default: return method.charAt(0).toUpperCase() + method.slice(1);
    }
  };

  const formatPaymentStatus = (status: 'prepaid' | 'postpaid') => {
    switch (status) {
      case 'prepaid': return 'Prepaid';
      case 'postpaid': return 'Postpaid';
      default: return status;
    }
  };

  const formatBalanceStatus = (status: string, type: 'money' | 'material') => {
    if (type === 'money') {
      switch (status) {
        case 'pending': return 'Pending Payment';
        case 'partially': return 'Partially Paid';
        case 'paid': return 'Paid';
        default: return status;
      }
    } else {
      switch (status) {
        case 'pending': return 'Pending Delivery';
        case 'partially': return 'Partially Delivered';
        case 'delivered': return 'Delivered';
        default: return status;
      }
    }
  };

  const SupplierBalanceDisplay = ({ 
    supplierId,
    balanceOverride 
  }: { 
    supplierId: string;
    balanceOverride?: SupplierBalance;
  }) => {
    const balance = balanceOverride || getSupplierBalance(supplierId);
    
    if (!balance) return <span className="text-gray-500">Not set</span>;

    const amount = formatCurrency(Math.abs(balance.current_balance));
    const isCredit = balance.balance_type === 'credit';
    const isPositive = balance.current_balance > 0;

    if (balance.current_balance === 0) {
      return <span className="text-green-600">Settled (0)</span>;
    }

    return (
      <div className="flex items-center gap-2">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          isPositive 
            ? isCredit ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
            : 'bg-green-100 text-green-800'
        }`}>
          {isPositive ? '+' : ''}{amount}
        </span>
        <span className="text-sm text-gray-600">
          {isPositive
            ? isCredit 
              ? "(Supplier owes company)"
              : "(Company owes supplier)"
            : isCredit
              ? "(Company overpaid)"
              : "(Supplier overpaid)"}
        </span>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          balance.status === 'paid' ? 'bg-green-100 text-green-800' :
          balance.status === 'partially' ? 'bg-yellow-100 text-yellow-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {formatBalanceStatus(balance.status, 'money')}
        </span>
      </div>
    );
  };

  const MaterialBalanceDisplay = ({ 
    supplierId,
    materialId
  }: { 
    supplierId: string;
    materialId: string;
  }) => {
    const balance = getMaterialBalance(supplierId, materialId);
    const material = materials.find(m => m.id === materialId);
    
    if (!balance) return <span className="text-gray-500">Not set</span>;

    const amount = Math.abs(balance.current_balance);
    const isCredit = balance.balance_type === 'credit';
    const isPositive = balance.current_balance > 0;

    if (balance.current_balance === 0) {
      return <span className="text-green-600">Settled (0)</span>;
    }

    return (
      <div className="flex items-center gap-2">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          isPositive 
            ? isCredit ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
            : 'bg-green-100 text-green-800'
        }`}>
          {isPositive ? '+' : ''}{amount} {material?.name || 'units'}
        </span>
        <span className="text-sm text-gray-600">
          {isPositive
            ? isCredit 
              ? "(Supplier owes company)"
              : "(Company owes supplier)"
            : isCredit
              ? "(Company over-received)"
              : "(Supplier over-delivered)"}
        </span>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          balance.status === 'delivered' ? 'bg-green-100 text-green-800' :
          balance.status === 'partially' ? 'bg-yellow-100 text-yellow-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {formatBalanceStatus(balance.status, 'material')}
        </span>
      </div>
    );
  };

  const fetchLedgerData = async (supplierId: string) => {
    try {
      // Get all supply items for this supplier
      const supplierItems = supplyItems.filter(item => item.supplier_id === supplierId);
      
      const ledgerEntries: LedgerEntry[] = [];
      
      // Process each supply item
      for (const item of supplierItems) {
        const totalDelivered = getTotalDeliveredQuantity(item.id);
        const totalPaid = getTotalPaid(item.id);
        const totalValue = item.quantity * item.price;
        const balance = totalValue - totalPaid;
        const undelivered = item.quantity - totalDelivered;
        
        // Add supply item entry
        ledgerEntries.push({
          id: item.id,
          date: item.created_at,
          item: item.name,
          price: item.price,
          quantity: item.quantity,
          amount: totalValue,
          amount_paid: totalPaid,
          balance: balance,
          delivered: totalDelivered,
          undelivered: undelivered,
          type: 'supply'
        });
        
        // Add delivery entries
        const itemDeliveries = getItemDeliveries(item.id);
        for (const delivery of itemDeliveries) {
          ledgerEntries.push({
            id: delivery.id,
            date: delivery.delivery_date,
            item: `Delivery - ${item.name}`,
            price: delivery.value / delivery.quantity,
            quantity: delivery.quantity,
            amount: delivery.value,
            amount_paid: 0,
            balance: balance,
            delivered: delivery.quantity,
            undelivered: undelivered,
            type: 'delivery'
          });
        }
        
        // Add payment entries
        const itemPayments = getItemPayments(item.id);
        for (const payment of itemPayments) {
          const paymentMethod = payment.method === 'bank' && payment.bank_name 
            ? `Bank (${payment.bank_name})` 
            : payment.method === 'mobile_money' && payment.mode_of_mobilemoney
            ? `Mobile Money (${payment.mode_of_mobilemoney})`
            : formatPaymentMethod(payment.method);
            
          ledgerEntries.push({
            id: payment.id,
            date: payment.payment_date,
            item: `Payment - ${paymentMethod}`,
            price: 0,
            quantity: 0,
            amount: payment.amount,
            amount_paid: payment.amount,
            balance: balance,
            delivered: totalDelivered,
            undelivered: undelivered,
            type: 'payment',
            method: paymentMethod
          });
        }
      }
      
      // Sort by date
      ledgerEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setLedgerData(ledgerEntries);
    } catch (err) {
      console.error('Error fetching ledger data:', err);
      setError('Failed to load ledger data');
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const [
          { data: suppliersData, error: suppliersError },
          { data: itemsData, error: itemsError },
          { data: deliveriesData, error: deliveriesError },
          { data: paymentsData, error: paymentsError },
          { data: materialsData, error: materialsError },
          { data: supplierBalancesData, error: supplierBalancesError },
          { data: materialBalancesData, error: materialBalancesError },
          { data: clientsData, error: clientsError },
          { data: financeData, error: financeError }
        ] = await Promise.all([
          supabase.from('suppliers').select('*').order('created_at', { ascending: false }),
          supabase.from('supply_items').select('*'),
          supabase.from('deliveries').select('*'),
          supabase.from('payments').select('*'),
          supabase.from('materials').select('*').order('name', { ascending: true }),
          supabase.from('supplier_balances').select('*'),
          supabase.from('material_balances').select('*'),
          supabase.from('clients').select('id, name, created_at').order('name', { ascending: true }),
          supabase.from('finance').select('mode_of_payment, bank_name, mode_of_mobilemoney')
        ]);

        if (suppliersError) throw suppliersError;
        if (itemsError) throw itemsError;
        if (deliveriesError) throw deliveriesError;
        if (paymentsError) throw paymentsError;
        if (materialsError) throw materialsError;
        if (supplierBalancesError) throw supplierBalancesError;
        if (materialBalancesError) throw materialBalancesError;
        if (clientsError) throw clientsError;
        if (financeError) throw financeError;

        setSuppliers(suppliersData || []);
        setSupplyItems(itemsData || []);
        setDeliveries(deliveriesData || []);
        setPayments(paymentsData || []);
        setMaterials(materialsData || []);
        setLocalSupplierBalances(supplierBalancesData || []);
        
        // Enhance material balances with material names
        const enhancedMaterialBalances = (materialBalancesData || []).map(balance => ({
          ...balance,
          material_name: materialsData?.find(m => m.id === balance.material_id)?.name
        }));
        setLocalMaterialBalances(enhancedMaterialBalances);
        
        setClients(clientsData || []);
        setFinanceRecords(financeData || []);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .insert([supplierForm])
        .select();

      if (error) throw error;

      if (data?.[0]) {
        setSuppliers(prev => [data[0], ...prev]);
        resetSupplierForm();
      }
    } catch (err) {
      console.error('Error saving supplier:', err);
        setError('Failed to save supplier. Please try again.');
    }
  };

  const handleBalanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      if (!selectedSupplier) return;
      
      if (balanceType === 'money') {
        // Handle monetary balance
        const { data, error } = await supabase
          .from('supplier_balances')
          .upsert([{ 
            supplier_id: selectedSupplier.id,
            opening_balance: balanceForm.opening_balance,
            balance_type: balanceForm.balance_type,
            current_balance: balanceForm.opening_balance,
            status: balanceForm.status,
            partial_amount: balanceForm.partial_amount
          }])
          .select();

        if (error) throw error;

        if (data?.[0]) {
          setLocalSupplierBalances(prev => {
            const existing = prev.find(b => b.supplier_id === selectedSupplier.id);
            if (existing) {
              return prev.map(b => b.supplier_id === selectedSupplier.id ? data[0] : b);
            }
            return [...prev, data[0]];
          });
        }
      } else {
        // Handle material balance
        if (!selectedMaterial) {
          throw new Error('Please select a material');
        }
        
        const { data, error } = await supabase
          .from('material_balances')
          .upsert([{ 
            supplier_id: selectedSupplier.id,
            material_id: selectedMaterial,
            opening_balance: balanceForm.opening_balance,
            balance_type: balanceForm.balance_type,
            current_balance: balanceForm.opening_balance,
            status: balanceForm.status,
            partial_amount: balanceForm.partial_amount
          }])
          .select();

        if (error) throw error;

        if (data?.[0]) {
          // Enhance with material name
          const enhancedBalance = {
            ...data[0],
            material_name: materials.find(m => m.id === selectedMaterial)?.name
          };
          
          setLocalMaterialBalances(prev => {
            const existing = prev.find(b => 
              b.supplier_id === selectedSupplier.id && b.material_id === selectedMaterial
            );
            if (existing) {
              return prev.map(b => 
                b.supplier_id === selectedSupplier.id && b.material_id === selectedMaterial 
                  ? enhancedBalance 
                  : b
              );
            }
            return [...prev, enhancedBalance];
          });
        }
      }
      
      setShowBalanceForm(false);
    } catch (err) {
      console.error('Error saving balance:', err);
      setError('Failed to save balance. Please try again.');
    }
  };

  const handleItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      if (!selectedSupplier) return;
      
      let materialId = null;
      if (itemForm.name && !showOtherInput) {
        const material = materials.find(m => m.name === itemForm.name);
        if (material) {
          materialId = material.id;
        }
      }
      
      const { data, error } = await supabase
        .from('supply_items')
        .insert([{ 
          ...itemForm, 
          supplier_id: selectedSupplier.id,
          material_id: materialId
        }])
        .select();

      if (error) throw error;

      if (data?.[0]) {
        setSupplyItems(prev => [...prev, data[0]]);
        resetItemForm();
      }
    } catch (err) {
      console.error('Error saving supply item:', err);
      setError('Failed to save supply item. Please try again.');
    }
  };

  const handleDeliverySubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError(null);
  
  try {
    if (!selectedItem) return;
    
    const { data: freshItem, error: itemError } = await supabase
      .from('supply_items')
      .select('*')
      .eq('id', selectedItem.id)
      .single();

    if (itemError) throw itemError;
    if (!freshItem) throw new Error('Item not found');

    const unitPrice = deliveryNoteType === 'client' ? deliveryUnitPrice : freshItem.price;
    const deliveryValue = deliveryForm.quantity * unitPrice;
    
    let notes = deliveryForm.notes;
    let clientId = null;
    
    if (deliveryNoteType === 'client' && selectedClient) {
      const clientName = clients.find(c => c.id === selectedClient)?.name || '';
      notes = `Client: ${clientName}`;
      clientId = selectedClient;
      
      const { error: orderError } = await supabase
        .from('order')
        .insert([{
          client_id: selectedClient,
          user: selectedClient,
          item: freshItem.name,
          material: freshItem.name,
          cost: unitPrice,
          quantity: deliveryForm.quantity,
          total_amount: unitPrice * deliveryForm.quantity,
          created_at: new Date().toISOString()
        }]);

      if (orderError) {
        console.error('Order creation error details:', {
          error: orderError,
          itemData: {
            name: freshItem.name,
            price: unitPrice,
            quantity: deliveryForm.quantity
          }
        });
        throw orderError;
      }
    } else if (deliveryNoteType === 'stock') {
      notes = 'Stock';
    } else if (deliveryNoteType === 'client' && !selectedClient) {
      throw new Error('Please select a client');
    }
    
    let materialId = null;
    const material = materials.find(m => m.name === freshItem.name);
    if (material) {
      materialId = material.id;
    }
    
    const deliveryData = {
      ...deliveryForm,
      supply_item_id: selectedItem.id,
      material_id: materialId,
      value: deliveryValue,
      notes,
      client_id: clientId
    };

    const { data, error } = await supabase
      .from('deliveries')
      .insert([deliveryData])
      .select();

    if (error) {
      console.error('Delivery creation error:', error);
      throw error;
    }

    if (data?.[0]) {
      setDeliveries(prev => [...prev, data[0]]);
      
      // Update material balance if applicable
      if (materialId) {
        const materialBalance = getMaterialBalance(selectedItem.supplier_id, materialId);
        if (materialBalance) {
          let newBalance = materialBalance.current_balance;
          
          if (materialBalance.balance_type === 'credit') {
            newBalance = materialBalance.current_balance - deliveryForm.quantity;
          } else {
            newBalance = materialBalance.current_balance + deliveryForm.quantity;
          }
          
          // Update status based on new balance
          let newStatus = materialBalance.status;
          if (newBalance === 0) {
            newStatus = 'delivered';
          } else if (newBalance < materialBalance.opening_balance) {
            newStatus = 'partially';
          }
          
          const { data: updatedBalance } = await supabase
            .from('material_balances')
            .update({ 
              current_balance: newBalance,
              status: newStatus
            })
            .eq('supplier_id', selectedItem.supplier_id)
            .eq('material_id', materialId)
            .select()
            .single();

          if (updatedBalance) {
            setLocalMaterialBalances(prev => prev.map(b => 
              b.supplier_id === selectedItem.supplier_id && b.material_id === materialId
                ? { ...b, current_balance: newBalance, status: newStatus }
                : b
            ));
          }
        }
      }
      
      setLocalSupplierBalances(prev => {
          return prev.map(balance => {
            if (balance.supplier_id === selectedItem.supplier_id) {
            let newBalance = balance.current_balance;
            
            if (balance.balance_type === 'credit') {
              newBalance = balance.current_balance - deliveryValue;
            } else {
              newBalance = balance.current_balance + deliveryValue;
            }
            
            // Update status based on new balance
            let newStatus = balance.status;
            if (newBalance === 0) {
              newStatus = 'paid';
            } else if (newBalance < balance.opening_balance) {
              newStatus = 'partially';
            }
            
            supabase
              .from('supplier_balances')
              .update({ 
                current_balance: newBalance,
                status: newStatus
              })
              .eq('supplier_id', selectedItem.supplier_id)
              .then(({ error }) => {
                if (error) console.error('Balance update error:', error);
              });

            return { ...balance, current_balance: newBalance, status: newStatus };
          }
          return balance;
        });
      });

      resetDeliveryForm();
      setShowDeliveryForm(false);
      setDeliveryNoteType('');
      setSelectedClient('');
      setDeliveryUnitPrice(0);
    }
  } catch (err) {
    console.error('Error saving delivery:', err);
    setError(err instanceof Error ? err.message : 'Failed to save delivery. Please try again.');
  }
};

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      if (!selectedItem) return;
      
      const paymentData: any = {
        supply_item_id: selectedItem.id,
        supplier_id: selectedItem.supplier_id,
        amount: paymentForm.amount,
        payment_date: paymentForm.payment_date,
        method: paymentForm.method
      };
      
      if (paymentForm.method === 'bank') {
        paymentData.bank_name = paymentForm.bank_name;
      } else if (paymentForm.method === 'mobile_money') {
        paymentData.mode_of_mobilemoney = paymentForm.mode_of_mobilemoney;
      }
      
      const { data: paymentResponse, error: paymentError } = await supabase
        .from('payments')
        .insert([paymentData])
        .select();

      if (paymentError) throw paymentError;

      if (paymentResponse?.[0]) {
        setPayments(prev => [...prev, paymentResponse[0]]);
        
        setLocalSupplierBalances(prev => {
            return prev.map(balance => {
              if (balance.supplier_id === selectedItem.supplier_id) {
              let newBalance = balance.current_balance;
              
              if (balance.balance_type === 'debit') {
                newBalance = balance.current_balance - paymentForm.amount;
              } else {
                newBalance = balance.current_balance + paymentForm.amount;
              }
              
              // Update status based on new balance
              let newStatus = balance.status;
              if (newBalance === 0) {
                newStatus = 'paid';
              } else if (newBalance < balance.opening_balance) {
                newStatus = 'partially';
              }
              
              supabase
                .from('supplier_balances')
                .update({ 
                  current_balance: newBalance,
                  status: newStatus
                })
                .eq('supplier_id', selectedItem.supplier_id)
                .then(({ error }) => {
                  if (error) console.error('Balance update error:', error);
                });

              return { ...balance, current_balance: newBalance, status: newStatus };
            }
            return balance;
          });
        });

        const supplier = suppliers.find(s => s.id === selectedItem.supplier_id);
        const item = supplyItems.find(i => i.id === selectedItem.id);
        
        const expenseData = {
          item: 'Payment To Supplier',
          amount_spent: paymentForm.amount,
          date: paymentForm.payment_date,
          department: `${supplier?.name || 'Unknown Supplier'} | ${item?.name || 'Unknown Item'}`,
          account: paymentForm.method === 'mobile_money' 
            ? paymentForm.mode_of_mobilemoney || 'Mobile Money'
            : paymentForm.method === 'bank' 
            ? paymentForm.bank_name || 'Bank'
            : 'Cash',
          mode_of_payment: formatPaymentMethod(paymentForm.method),
          submittedby: 'Admin'
        };

        const { error: expenseError } = await supabase
          .from('expenses')
          .insert([expenseData]);

        if (expenseError) {
          console.error('Error saving expense record:', expenseError);
        }

        resetPaymentForm();
        setShowPaymentForm(false);
        setPaymentMethod('cash');
      }
    } catch (err) {
      console.error('Error saving payment:', err);
      setError('Failed to save payment. Please try again.');
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    setError(null);
    
    try {
      const { data: items, error: itemsError } = await supabase
        .from('supply_items')
        .select('id')
        .eq('supplier_id', id);

      if (itemsError) throw itemsError;

      if (items && items.length > 0) {
        const itemIds = items.map(item => item.id);
        
        await supabase
          .from('deliveries')
          .delete()
          .in('supply_item_id', itemIds);

        await supabase
          .from('payments')
          .delete()
          .in('supply_item_id', itemIds);

        await supabase
          .from('supply_items')
          .delete()
          .in('id', itemIds);
      }

      await supabase
        .from('supplier_balances')
        .delete()
        .eq('supplier_id', id);

      await supabase
        .from('material_balances')
        .delete()
        .eq('supplier_id', id);

      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSuppliers(prev => prev.filter(s => s.id !== id));
      setLocalSupplierBalances(prev => prev.filter(b => b.supplier_id !== id));
      setLocalMaterialBalances(prev => prev.filter(b => b.supplier_id !== id));
    } catch (err) {
      console.error('Error deleting supplier:', err);
      setError('Failed to delete supplier. Please try again.');
    }
  };

  const handleDeleteItem = async (id: string) => {
    setError(null);
    
    try {
      await supabase
        .from('deliveries')
        .delete()
        .eq('supply_item_id', id);

      await supabase
        .from('payments')
        .delete()
        .eq('supply_item_id', id);

      const { error } = await supabase
        .from('supply_items')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSupplyItems(prev => prev.filter(i => i.id !== id));
    } catch (err) {
      console.error('Error deleting item:', err);
      setError('Failed to delete item. Please try again.');
    }
  };

  const resetSupplierForm = () => {
    setSupplierForm({
      name: "",
      contact: "",
      address: ""
    });
    setShowSupplierForm(false);
  };

  const resetItemForm = () => {
    setItemForm({
      supplier_id: "",
      name: "",
      quantity: 0,
      price: 0,
      status: 'postpaid',
    });
    setShowItemForm(false);
    setShowOtherInput(false);
  };

 const resetDeliveryForm = () => {
  setDeliveryForm({
    supply_item_id: null, // Changed from "" to null
    quantity: 0,
    unit_price: 0, // Added missing field
    value: 0, // Added missing field
    delivery_date: getEastAfricanDateTime(),
    notes: "",
    notes_type: "",
    client_id: "", // Keep as string but ensure it matches the interface
    material_id: null, // Changed from "" to null
    supplier_id: "", // Added missing field
    balance_id: "", // Added missing field
    balance_type: undefined // Added missing field
  });
  setShowDeliveryForm(false);
  setDeliveryNoteType('');
  setSelectedClient('');
  setDeliveryUnitPrice(0);
};

  const resetPaymentForm = () => {
    setPaymentForm({
      supply_item_id: "",
      supplier_id: "",
      amount: 0,
      payment_date: getEastAfricanDateTime(),
      method: "cash",
      bank_name: "",
      mode_of_mobilemoney: "",
    });
    setShowPaymentForm(false);
    setPaymentMethod('cash');
  };

  const resetBalanceForm = () => {
    setBalanceForm({
      supplier_id: "",
      opening_balance: 0,
      balance_type: "credit",
      status: "pending",
      partial_amount: 0,
      material_id: ""
    });
    setBalanceType('money');
    setSelectedMaterial('');
    setBalanceStatus('pending');
    setPartialAmount(0);
    setShowBalanceForm(false);
  };

  const handleMaterialChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;
    if (selectedValue === "other") {
      setShowOtherInput(true);
      setItemForm({...itemForm, name: ""});
    } else {
      setShowOtherInput(false);
      setItemForm({...itemForm, name: selectedValue});
    }
  };

  const handlePaymentMethodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const method = e.target.value;
    setPaymentMethod(method);
    setPaymentForm({
      ...paymentForm,
      method,
      bank_name: method === 'bank' ? paymentForm.bank_name : '',
      mode_of_mobilemoney: method === 'mobile_money' ? paymentForm.mode_of_mobilemoney : ''
    });
  };

  const handleDeliveryNoteTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const noteType = e.target.value;
    setDeliveryNoteType(noteType);
    
    if (noteType !== 'client') {
      setSelectedClient('');
    }
    
    if (selectedItem) {
      setDeliveryUnitPrice(noteType === 'client' ? selectedItem.price : 0);
    }
  };

  const handleBalanceTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const type = e.target.value as 'money' | 'material';
    setBalanceType(type);
    setBalanceForm({
      ...balanceForm,
      opening_balance: 0,
      status: type === 'money' ? 'pending' : 'pending',
      partial_amount: 0
    });
    setBalanceStatus(type === 'money' ? 'pending' : 'pending');
    setPartialAmount(0);
  };

  const handleBalanceStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const status = e.target.value as 'pending' | 'partially' | 'paid' | 'delivered';
    setBalanceStatus(status);
    setBalanceForm({
      ...balanceForm,
      status,
      partial_amount: status === 'partially' ? partialAmount : 0
    });
  };

  useEffect(() => {
    if (selectedItem && showDeliveryForm) {
      setDeliveryUnitPrice(selectedItem.price);
    }
  }, [selectedItem, showDeliveryForm]);

  if (loading) {
    return (
      <div className="min-h-screen p-6 bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p>Loading service providers...</p>
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
              <span className="text-blue-500">📦</span> Suppliers
            </h1>
            <p className="text-gray-600">View your service providers and their supplies</p>
          </div>
        </div>
      </header>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-300 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
        {suppliers.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">📭</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No data yet</h3>
            <p className="text-gray-500 mb-4">Get started by adding your first supplier</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Provider
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Balance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Supplies
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {suppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{supplier.name}</div>
                      <div className="text-sm text-gray-500">{supplier.address}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {supplier.contact}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <SupplierBalanceDisplay supplierId={supplier.id} />
                      {localMaterialBalances
                        .filter(b => b.supplier_id === supplier.id)
                        .map(balance => (
                          <div key={balance.id} className="mt-2">
                            <MaterialBalanceDisplay 
                              supplierId={supplier.id} 
                              materialId={balance.material_id} 
                            />
                          </div>
                        ))
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {getSupplierItems(supplier.id).length} items
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => {
                            setSelectedSupplier(supplier);
                            setShowSuppliesModal(true);
                          }}
                          className="px-3 py-1 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 flex items-center gap-1"
                        >
                          <span>📦</span> View Supplies
                        </button>
                        <button
                          onClick={() => {
                            setSelectedSupplier(supplier);
                            fetchLedgerData(supplier.id);
                            setShowLedgerModal(true);
                          }}
                          className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 flex items-center gap-1"
                        >
                          <span>📊</span> View Ledger
                        </button>
                        <button
                          onClick={() => {
                            setSelectedSupplier(supplier);
                            setShowBalancesModal(true);
                          }}
                          className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 flex items-center gap-1"
                        >
                          <span>💼</span> View Balances
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
          </div>
        )}
      </div>

      {/* Supplier Form Modal */}
      {showSupplierForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Add New Supplier
                </h3>
                <button 
                  onClick={resetSupplierForm}
                  className="text-gray-400 hover:text-gray-500"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleSupplierSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={supplierForm.name}
                    onChange={(e) => setSupplierForm({...supplierForm, name: e.target.value})}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact
                  </label>
                  <input
                    type="text"
                    name="contact"
                    value={supplierForm.contact}
                    onChange={(e) => setSupplierForm({...supplierForm, contact: e.target.value})}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={supplierForm.address}
                    onChange={(e) => setSupplierForm({...supplierForm, address: e.target.value})}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                {error && (
                  <div className="p-2 bg-red-100 text-red-700 text-sm rounded-lg">
                    {error}
                  </div>
                )}
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={resetSupplierForm}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Save Supplier
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Balance Form Modal */}
      {showBalanceForm && selectedSupplier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Set Balance for {selectedSupplier.name}
                </h3>
                <button 
                  onClick={resetBalanceForm}
                  className="text-gray-400 hover:text-gray-500"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleBalanceSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Balance Type
                  </label>
                  <select
                    value={balanceType}
                    onChange={handleBalanceTypeChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="money">Money Balance</option>
                    <option value="material">Material Balance</option>
                  </select>
                </div>

                {balanceType === 'material' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Material
                    </label>
                    <select
                      value={selectedMaterial}
                      onChange={(e) => setSelectedMaterial(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required={balanceType === 'material'}
                    >
                      <option value="">Select Material</option>
                      {materials.map(material => (
                        <option key={material.id} value={material.id}>
                          {material.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Balance Type
                  </label>
                  <select
                    value={balanceForm.balance_type}
                    onChange={(e) => setBalanceForm({
                      ...balanceForm,
                      balance_type: e.target.value as 'credit' | 'debit'
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="credit">Supplier owes company</option>
                    <option value="debit">Company owes supplier</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={balanceStatus}
                    onChange={handleBalanceStatusChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="pending">
                      {balanceType === 'money' ? 'Pending Payment' : 'Pending Delivery'}
                    </option>
                    <option value="partially">
                      {balanceType === 'money' ? 'Partially Paid' : 'Partially Delivered'}
                    </option>
                    <option value={balanceType === 'money' ? 'paid' : 'delivered'}>
                      {balanceType === 'money' ? 'Paid' : 'Delivered'}
                    </option>
                  </select>
                </div>

                {balanceStatus === 'partially' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {balanceType === 'money' ? 'Amount Paid' : 'Quantity Delivered'}
                    </label>
                    <input
                      type="number"
                      value={partialAmount}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        setPartialAmount(value);
                        setBalanceForm({
                          ...balanceForm,
                          partial_amount: value,
                          opening_balance: balanceType === 'money' ? value : balanceForm.opening_balance
                        });
                      }}
                      required={balanceStatus === 'partially'}
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {balanceType === 'money' ? 'Amount (UGX)' : 'Quantity'}
                  </label>
                  <input
                    type="number"
                    name="opening_balance"
                    value={balanceForm.opening_balance}
                    onChange={(e) => setBalanceForm({
                      ...balanceForm,
                      opening_balance: Number(e.target.value)
                    })}
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {error && (
                  <div className="p-2 bg-red-100 text-red-700 text-sm rounded-lg">
                    {error}
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={resetBalanceForm}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Save Balance
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Balances Modal */}
          {showBalancesModal && selectedSupplier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
            <div className="p-6 flex-shrink-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Balances for {selectedSupplier.name}
                </h3>
                <button 
                  onClick={() => {
                    setShowBalancesModal(false);
                    setSelectedBalance(null);
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  ✕
                </button>
              </div>
              
              <div className="mb-4">
                <h4 className="text-md font-medium text-gray-800 mb-2">Money Balance</h4>
                <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Opening Balance</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Current Balance</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Partial Amount</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {localSupplierBalances.filter(b => b.supplier_id === selectedSupplier.id).length > 0 ? (
                        localSupplierBalances
                          .filter(b => b.supplier_id === selectedSupplier.id)
                          .map(balance => (
                            <tr key={balance.id} className="hover:bg-gray-50">
                              <td className="px-4 py-4 whitespace-nowrap">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${balance.balance_type === 'credit' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                                  {balance.balance_type === 'credit' ? 'Supplier owes company' : 'Company owes supplier'}
                                </span>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                {formatCurrency(balance.opening_balance)}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                {formatCurrency(balance.current_balance)}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${balance.status === 'paid' ? 'bg-green-100 text-green-800' : balance.status === 'partially' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                                  {formatBalanceStatus(balance.status, 'money')}
                                </span>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                {formatCurrency(balance.partial_amount)}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <div className="flex justify-end space-x-2">
                                  <button 
                                    onClick={() => fetchBalanceDeliveryHistory(balance.id, 'money')}
                                    className="px-3 py-1 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 flex items-center gap-1"
                                  >
                                    <span>📋</span> History
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                            No money balance set for this supplier
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div>
                <h4 className="text-md font-medium text-gray-800 mb-2">Material Balances</h4>
                <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Material</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Opening Quantity</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Current Quantity</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Partial Amount</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {localMaterialBalances.filter(b => b.supplier_id === selectedSupplier.id).length > 0 ? (
                        localMaterialBalances
                          .filter(b => b.supplier_id === selectedSupplier.id)
                          .map(balance => {
                            const material = materials.find(m => m.id === balance.material_id);
                            return (
                              <tr key={balance.id} className="hover:bg-gray-50">
                                <td className="px-4 py-4 whitespace-nowrap">
                                  {material?.name || 'Unknown Material'}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${balance.balance_type === 'credit' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                                    {balance.balance_type === 'credit' ? 'Supplier owes company' : 'Company owes supplier'}
                                </span>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap">
                                  {balance.opening_balance} units
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap">
                                  {balance.current_balance} units
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${balance.status === 'delivered' ? 'bg-green-100 text-green-800' : balance.status === 'partially' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                                    {formatBalanceStatus(balance.status, 'material')}
                                  </span>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap">
                                  {balance.partial_amount} units
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                                  <div className="flex justify-end space-x-2">
                                    <button 
                                      onClick={() => fetchBalanceDeliveryHistory(balance.id, 'material')}
                                      className="px-3 py-1 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 flex items-center gap-1"
                                    >
                                      <span>📋</span> History
                                    </button>
                                   </div>
                                </td>
                              </tr>
                            );
                          })
                      ) : (
                        <tr>
                          <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                            No material balances set for this supplier
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end">
            </div>
          </div>
        </div>
      )}

      {/* Balance Delivery Form Modal - UPDATED WITH MATERIAL SELECTION AND NOTES TYPE */}
      {isBalanceDeliveryForm && selectedBalance && selectedSupplier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-medium text-gray-900">
                  Record Delivery Against Balance
                </h3>
                <button 
                  onClick={() => {
                    setIsBalanceDeliveryForm(false);
                    setSelectedBalance(null);
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                handleBalanceDeliverySubmit();
              }} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Balance Type
                    </label>
                    <input
                      type="text"
                      value={'supplier_id' in selectedBalance ? 'Money Balance' : 'Material Balance'}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm bg-gray-50 text-sm"
                    />
                  </div>

                  {'material_id' in selectedBalance ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Material
                      </label>
                      <input
                        type="text"
                        value={materials.find(m => m.id === selectedBalance.material_id)?.name || 'Unknown Material'}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm bg-gray-50 text-sm"
                      />
                      <input
                        type="hidden"
                        value={selectedBalance.material_id}
                        onChange={(e) => setBalanceDeliveryForm({
                          ...balanceDeliveryForm,
                          material_id: e.target.value
                        })}
                      />
                    </div>
                  ) : (
                    // Add material selection for money balance deliveries
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Material
                      </label>
                      <select
                        value={balanceDeliveryForm.material_id || ''}
                        onChange={(e) => setBalanceDeliveryForm({
                          ...balanceDeliveryForm,
                          material_id: e.target.value
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                        required={!('material_id' in selectedBalance)} 
                      >
                        <option value="">-- Select Material --</option>
                        {materials.map(material => (
                          <option key={material.id} value={material.id}>
                            {material.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {'material_id' in selectedBalance && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Current Balance
                    </label>
                    <input
                      type="text"
                      value={(() => {
                        if (!selectedBalance) return '0';
                        
                        const isMaterialBalance = 'material_id' in selectedBalance && 
                                                'current_balance' in selectedBalance &&
                                                'id' in selectedBalance;
                        
                        if (isMaterialBalance) {
                          return `${(selectedBalance as MaterialBalance).current_balance} units`;
                        }
                        
                        return '0';
                      })()}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm bg-gray-50 text-sm"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity to Deliver {('material_id' in selectedBalance) ? '(Units)' : ''}
                    </label>
                    <input
                      type="number"
                      value={balanceDeliveryForm.quantity}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        const newValue = value * balanceDeliveryForm.unit_price;
                        setBalanceDeliveryForm({
                          ...balanceDeliveryForm,
                          quantity: value,
                          value: newValue
                        });
                      }}
                      min="0"
                      step="0.01"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unit Price (UGX)
                    </label>
                    <input
                      type="number"
                      value={balanceDeliveryForm.unit_price}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        const newValue = balanceDeliveryForm.quantity * value;
                        setBalanceDeliveryForm({
                          ...balanceDeliveryForm,
                          unit_price: value,
                          value: newValue
                        });
                      }}
                      min="0"
                      step="0.01"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Delivery Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={balanceDeliveryForm.delivery_date}
                      onChange={(e) => setBalanceDeliveryForm({
                        ...balanceDeliveryForm,
                        delivery_date: e.target.value
                      })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Delivery Value {('supplier_id' in selectedBalance) ? '(UGX)' : '(Info only)'}
                    </label>
                    <input
                      type="text"
                      value={formatCurrency(balanceDeliveryForm.quantity * balanceDeliveryForm.unit_price)}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm bg-gray-50 text-sm"
                    />
                  </div>
                </div>

                {/* Add notes type selection (Stock/Client) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes Type
                  </label>
                  <select
                    value={balanceDeliveryForm.notes_type}
                    onChange={(e) => setBalanceDeliveryForm({
                      ...balanceDeliveryForm,
                      notes_type: e.target.value,
                      client_id: e.target.value === 'Client' ? balanceDeliveryForm.client_id : ''
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    <option value="">-- Select Notes Type --</option>
                    <option value="Stock">Stock</option>
                    <option value="Client">Client</option>
                  </select>
                </div>

                {balanceDeliveryForm.notes_type === 'Client' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Select Client
                    </label>
                    <select
                      value={balanceDeliveryForm.client_id}
                      onChange={(e) => setBalanceDeliveryForm({
                        ...balanceDeliveryForm,
                        client_id: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                      required
                    >
                      <option value="">-- Select Client --</option>
                      {clients.map(client => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-sm font-medium text-gray-700">Current Balance:</span>
                      <span className="text-sm font-medium text-gray-900 ml-2">
                        {(() => {
                          if (!selectedBalance) return '0';
                          
                          const isSupplierBalance = 'supplier_id' in selectedBalance && 
                                                  'current_balance' in selectedBalance &&
                                                  'id' in selectedBalance;
                          
                          const isMaterialBalance = 'material_id' in selectedBalance && 
                                                  'current_balance' in selectedBalance &&
                                                  'id' in selectedBalance;
                          
                          if (isSupplierBalance) {
                            return formatCurrency((selectedBalance as SupplierBalance).current_balance);
                          } else if (isMaterialBalance) {
                            return `${(selectedBalance as MaterialBalance).current_balance} units`;
                          }
                          
                          return '0';
                        })()}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-700">New Balance:</span>
                      <span className="text-sm font-medium text-gray-900 ml-2">
                        {(() => {
                          if (!selectedBalance) return '0';
                          
                          const isSupplierBalance = 'supplier_id' in selectedBalance && 
                                                  'id' in selectedBalance;
                          
                          const isMaterialBalance = 'material_id' in selectedBalance && 
                                                  'id' in selectedBalance;
                          
                          if (isSupplierBalance) {
                            return formatCurrency(calculateNewBalance());
                          } else if (isMaterialBalance) {
                            return `${calculateNewBalance()} units`;
                          }
                          
                          return '0';
                        })()}
                      </span>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="p-2 bg-red-100 text-red-700 text-sm rounded-lg">
                    {error}
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsBalanceDeliveryForm(false);
                      setSelectedBalance(null);
                    }}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Record Delivery
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Balance Delivery History Modal */}
      {showBalanceHistoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="p-6 flex-shrink-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Delivery History
                </h3>
                <button 
                  onClick={() => setShowBalanceHistoryModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  ✕
                </button>
              </div>
              
              <div className="overflow-y-auto max-h-[70vh]">
                {balanceDeliveryHistory.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No delivery history found for this balance.
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quantity
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Unit Price
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Value
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Notes
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Client
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {balanceDeliveryHistory.map((delivery) => (
                        <tr key={delivery.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(delivery.delivery_date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {delivery.quantity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatCurrency(delivery.unit_price)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatCurrency(delivery.value)}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {delivery.notes}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {delivery.client_id ? getClientName(delivery.client_id) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Ledger Modal */}
      {showLedgerModal && selectedSupplier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
            <div className="p-6 flex-shrink-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  General Ledger for {selectedSupplier.name}
                </h3>
                <button 
                  onClick={() => setShowLedgerModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  ✕
                </button>
              </div>
              
              <div className="overflow-y-auto max-h-[70vh]">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Item
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount Paid
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Balance
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Delivered
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Undelivered
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {ledgerData.map((entry) => (
                      <tr key={`${entry.type}-${entry.id}`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(entry.date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {entry.item}
                          {entry.method && (
                            <div className="text-xs text-gray-500">{entry.method}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {entry.price > 0 ? formatCurrency(entry.price) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {entry.quantity > 0 ? entry.quantity : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {entry.amount > 0 ? formatCurrency(entry.amount) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {entry.amount_paid > 0 ? formatCurrency(entry.amount_paid) : '-'}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                          entry.balance > 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {formatCurrency(Math.abs(entry.balance))}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {entry.delivered > 0 ? entry.delivered : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {entry.undelivered > 0 ? entry.undelivered : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Supplies Table Modal */}
      {showSuppliesModal && selectedSupplier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
            <div className="p-6 flex-shrink-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Services from {selectedSupplier.name}
                </h3>
                <div className="flex items-center gap-2">
                 
                  <button 
                    onClick={() => setShowSuppliesModal(false)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    ✕
                  </button>
                </div>
              </div>
              
              <div className="overflow-y-auto max-h-[60vh]">
                {getSupplierItems(selectedSupplier.id).length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No items found for this service provider.
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Item
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Unit Price
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Payment Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Delivered
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Paid
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Balance
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {getSupplierItems(selectedSupplier.id).map((item) => {
                        const totalDelivered = getTotalDeliveredValue(item.id);
                        const totalPaid = getTotalPaid(item.id);
                        const balance = totalDelivered - totalPaid;

                        return (
                          <tr key={item.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {item.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatCurrency(item.price)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                item.status === 'prepaid' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {formatPaymentStatus(item.status)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatCurrency(totalDelivered)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatCurrency(totalPaid)}
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                              balance > 0 ? 'text-blue-600' : 'text-green-600'
                            }`}>
                              {formatCurrency(Math.abs(balance))}
                              {balance > 0 ? ' (Company owes)' : ' (Supplier owes)'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex justify-end space-x-2">
                                <button
                                  onClick={() => {
                                    setSelectedItem(item);
                                    setShowTransactionsModal(true);
                                  }}
                                  className="text-purple-600 hover:text-purple-900"
                                >
                                  View Details
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transactions History Modal */}
      {showTransactionsModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="p-6 flex-shrink-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Transaction History for {selectedItem.name}
                </h3>
                <button 
                  onClick={() => setShowTransactionsModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  ✕
                </button>
              </div>
              
              <div className="overflow-y-auto max-h-[70vh]">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Value                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Details
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getCombinedTransactions(selectedItem.id).map((txn) => (
                      <tr key={`${txn.type}-${txn.id}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            txn.type === 'delivery' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {txn.type === 'delivery' ? 'Delivery' : 'Payment'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(txn.date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {txn.type === 'delivery' ? txn.quantity : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {txn.type === 'delivery' 
                            ? formatCurrency(txn.value || 0)
                            : formatCurrency(txn.amount || 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {txn.type === 'payment' ? (
                            <div>
                              <div className="font-medium">{formatPaymentMethod(txn.method || '')}</div>
                              {txn.method === 'bank' && txn.bank_name && (
                                <div className="text-xs">Bank: {txn.bank_name}</div>
                              )}
                              {txn.method === 'mobile_money' && txn.mode_of_mobilemoney && (
                                <div className="text-xs">Mobile Money: {txn.mode_of_mobilemoney}</div>
                              )}
                            </div>
                          ) : (
                            <div>
                              {txn.client_id ? (
                                <div>
                                  <div className="font-medium">Client Delivery</div>
                                  <div className="text-xs">Client: {getClientName(txn.client_id) || 'Unknown Client'}</div>
                                  {txn.notes && <div className="text-xs">Notes: {txn.notes}</div>}
                                </div>
                              ) : (
                                txn.notes || '-'
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Item Form Modal */}
      {showItemForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Add New Item
                </h3>
                <button 
                  onClick={resetItemForm}
                  className="text-gray-400 hover:text-gray-500"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleItemSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Item Name
                    </label>
                  <select
                    onChange={handleMaterialChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    defaultValue=""
                  >
                    <option value="" disabled>Select item</option>
                    {materials.map((material) => (
                      <option key={material.id} value={material.name}>
                        {material.name}
                      </option>
                    ))}
                    <option value="other">Other (specify below)</option>
                  </select>
                  
                  {showOtherInput && (
                    <input
                      type="text"
                      name="name"
                      value={itemForm.name}
                      onChange={(e) => setItemForm({...itemForm, name: e.target.value})}
                      required
                      placeholder="Enter supply item name"
                      className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity Ordered
                    </label>
                    <input
                      type="number"
                      name="quantity"
                      value={itemForm.quantity}
                      onChange={(e) => setItemForm({...itemForm, quantity: Number(e.target.value)})}
                      required
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unit Price (UGX)
                    </label>
                    <input
                      type="number"
                      name="price"
                      value={itemForm.price}
                      onChange={(e) => setItemForm({...itemForm, price: Number(e.target.value)})}
                      required
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Status
                  </label>
                  <select
                    value={itemForm.status}
                    onChange={(e) => setItemForm({...itemForm, status: e.target.value as 'prepaid' | 'postpaid'})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="postpaid">Postpaid (Pay later)</option>
                    <option value="prepaid">Prepaid (Already paid)</option>
                  </select>
                </div>

                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Total Cost:</span>
                    <span className="font-medium">
                      {formatCurrency((itemForm.quantity || 0) * (itemForm.price || 0))}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    Status: {formatPaymentStatus(itemForm.status)}
                    {itemForm.status === 'prepaid' && ' - This item has already been paid for'}
                  </div>
                </div>

                {error && (
                  <div className="p-2 bg-red-100 text-red-700 text-sm rounded-lg">
                    {error}
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={resetItemForm}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Save Item
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delivery Form Modal */}
      {showDeliveryForm && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Record Delivery for {selectedItem.name}
                </h3>
                <button 
                  onClick={resetDeliveryForm}
                  className="text-gray-400 hover:text-gray-500"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleDeliverySubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity Delivered
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    value={deliveryForm.quantity}
                    onChange={(e) => setDeliveryForm({...deliveryForm, quantity: Number(e.target.value)})}
                    required
                    min="0.01"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit Price (UGX)
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={deliveryNoteType === 'client' ? deliveryUnitPrice : selectedItem.price}
                    onChange={(e) => {
                      if (deliveryNoteType === 'client') {
                        setDeliveryUnitPrice(Number(e.target.value));
                      }
                    }}
                    readOnly={deliveryNoteType !== 'client'}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                      deliveryNoteType !== 'client' ? 'bg-gray-100' : ''
                    }`}
                  />
                  {deliveryNoteType === 'client' && (
                    <p className="text-xs text-gray-500 mt-1">
                      Adjustable for client deliveries
                    </p>
                  )}
                  {deliveryNoteType !== 'client' && deliveryNoteType !== '' && (
                    <p className="text-xs text-gray-500 mt-1">
                      Fixed price for stock deliveries
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Delivery Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    name="delivery_date"
                    value={deliveryForm.delivery_date}
                    onChange={(e) => setDeliveryForm({...deliveryForm, delivery_date: e.target.value})}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes Type
                  </label>
                  <select
                    value={deliveryNoteType}
                    onChange={handleDeliveryNoteTypeChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required={deliveryForm.notes !== ''}
                  >
                    <option value="">Select type</option>
                    <option value="stock">Stock</option>
                    <option value="client">Client</option>
                  </select>
                </div>

                {deliveryNoteType === 'client' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Select Client
                    </label>
                    <select
                      value={selectedClient}
                      onChange={(e) => setSelectedClient(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Select client</option>
                      {clients.map(client => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {deliveryNoteType !== 'client' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      name="notes"
                      value={deliveryForm.notes}
                      onChange={(e) => setDeliveryForm({...deliveryForm, notes: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      rows={2}
                    />
                  </div>
                )}

                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 mb-2">
                    <div>
                      <span className="text-sm font-medium">Unit Price:</span>
                      <div className="font-medium">
                        {formatCurrency(deliveryNoteType === 'client' ? deliveryUnitPrice : selectedItem.price)}
                      </div>
                    </div>
                    <div>
                      <span className="text-sm font-medium">Delivery Value:</span>
                      <div className="font-medium">
                        {formatCurrency(deliveryForm.quantity * (deliveryNoteType === 'client' ? deliveryUnitPrice : selectedItem.price))}
                      </div>
                    </div>
                  </div>
                  
                  {getSupplierBalance(selectedItem.supplier_id) && (
                    <div className="mt-2">
                      <span className="text-sm font-medium">Current Balance:</span>
                      <div className="font-medium">
                        <SupplierBalanceDisplay supplierId={selectedItem.supplier_id} />
                      </div>
                      
                      <span className="text-sm font-medium">New Balance:</span>
                      <div className="font-medium">
                        <SupplierBalanceDisplay 
                          supplierId={selectedItem.supplier_id}
                          balanceOverride={{
                            ...getSupplierBalance(selectedItem.supplier_id)!,
                            current_balance: getSupplierBalance(selectedItem.supplier_id)!.balance_type === 'credit'
                              ? getSupplierBalance(selectedItem.supplier_id)!.current_balance - (deliveryForm.quantity * (deliveryNoteType === 'client' ? deliveryUnitPrice : selectedItem.price))
                              : getSupplierBalance(selectedItem.supplier_id)!.current_balance + (deliveryForm.quantity * (deliveryNoteType === 'client' ? deliveryUnitPrice : selectedItem.price))
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="p-2 bg-red-100 text-red-700 text-sm rounded-lg">
                    {error}
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={resetDeliveryForm}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Record Delivery
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Payment Form Modal */}
      {showPaymentForm && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Record Payment for {selectedItem.name}
                </h3>
                <button 
                  onClick={resetPaymentForm}
                  className="text-gray-400 hover:text-gray-500"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handlePaymentSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount (UGX)
                  </label>
                  <input
                    type="number"
                    name="amount"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({...paymentForm, amount: Number(e.target.value)})}
                    required
                    min="0.01"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    name="payment_date"
                    value={paymentForm.payment_date}
                    onChange={(e) => setPaymentForm({...paymentForm, payment_date: e.target.value})}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Method
                  </label>
                  <select
                    name="method"
                    value={paymentForm.method}
                    onChange={handlePaymentMethodChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="cash">Cash</option>
                    {getUniquePaymentMethods().map(method => (
                      <option key={method} value={method}>
                        {formatPaymentMethod(method)}
                      </option>
                    ))}
                  </select>
                </div>
                
                {paymentForm.method === 'bank' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bank Name
                    </label>
                    <select
                      name="bank_name"
                      value={paymentForm.bank_name || ''}
                      onChange={(e) => setPaymentForm({...paymentForm, bank_name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Select bank</option>
                      {getUniqueBankNames().map(bank => (
                        <option key={bank} value={bank}>
                          {bank}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                {paymentForm.method === 'mobile_money' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mobile Money Account
                    </label>
                    <select
                      name="mode_of_mobilemoney"
                      value={paymentForm.mode_of_mobilemoney || ''}
                      onChange={(e) => setPaymentForm({...paymentForm, mode_of_mobilemoney: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Select account</option>
                      {getUniqueMobileMoneyModes().map(mode => (
                        <option key={mode} value={mode}>
                          {mode}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="bg-blue-50 p-3 rounded-lg">
                  {getSupplierBalance(selectedItem.supplier_id) && (
                    <div>
                      <span className="text-sm font-medium">Current Balance:</span>
                      <div className="font-medium">
                        <SupplierBalanceDisplay supplierId={selectedItem.supplier_id} />
                      </div>
                      
                      <span className="text-sm font-medium">New Balance:</span>
                      <div className="font-medium">
                        <SupplierBalanceDisplay 
                          supplierId={selectedItem.supplier_id}
                          balanceOverride={{
                            ...getSupplierBalance(selectedItem.supplier_id)!,
                            current_balance: getSupplierBalance(selectedItem.supplier_id)!.balance_type === 'debit'
                              ? getSupplierBalance(selectedItem.supplier_id)!.current_balance - paymentForm.amount
                              : getSupplierBalance(selectedItem.supplier_id)!.current_balance + paymentForm.amount
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="p-2 bg-red-100 text-red-700 text-sm rounded-lg">
                    {error}
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={resetPaymentForm}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Record Payment
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
