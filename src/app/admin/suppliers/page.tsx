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
  purchase_date: string;
  created_at: string;
}

interface Delivery {
  id: string;
  supply_item_id: string;
  quantity: number;
  delivery_date: string;
  notes?: string;
  created_at: string;
}

interface Payment {
  id: string;
  supply_item_id: string;
  amount: number;
  payment_date: string;
  method: string;
  reference?: string;
  created_at: string;
}

type Transaction = {
  id: string;
  type: 'delivery' | 'payment';
  date: string;
  quantity?: number;
  amount?: number;
  method?: string;
  reference?: string;
  notes?: string;
};

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplyItems, setSupplyItems] = useState<SupplyItem[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  
  // Form states
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
    purchase_date: new Date().toISOString().split('T')[0],
  });
  
  const [deliveryForm, setDeliveryForm] = useState<Omit<Delivery, "id" | "created_at">>({
    supply_item_id: "",
    quantity: 0,
    delivery_date: new Date().toISOString().split('T')[0],
    notes: "",
  });
  
  const [paymentForm, setPaymentForm] = useState<Omit<Payment, "id" | "created_at">>({
    supply_item_id: "",
    amount: 0,
    payment_date: new Date().toISOString().split('T')[0],
    method: "cash",
    reference: "",
  });

  // UI states
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

  // Helper functions
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
    const deliveries = getItemDeliveries(itemId).map(d => ({
      id: d.id,
      type: 'delivery' as const,
      date: d.delivery_date,
      quantity: d.quantity,
      notes: d.notes,
    }));

    const payments = getItemPayments(itemId).map(p => ({
      id: p.id,
      type: 'payment' as const,
      date: p.payment_date,
      amount: p.amount,
      method: p.method,
      reference: p.reference,
    }));

    return [...deliveries, ...payments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const getTotalDelivered = (itemId: string) => {
    return getItemDeliveries(itemId).reduce((sum, d) => sum + d.quantity, 0);
  };

  const getTotalPaid = (itemId: string) => {
    return getItemPayments(itemId).reduce((sum, p) => sum + p.amount, 0);
  };

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

  // Data fetching
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const [
          { data: suppliersData, error: suppliersError },
          { data: itemsData, error: itemsError },
          { data: deliveriesData, error: deliveriesError },
          { data: paymentsData, error: paymentsError }
        ] = await Promise.all([
          supabase.from('suppliers').select('*').order('created_at', { ascending: false }),
          supabase.from('supply_items').select('*'),
          supabase.from('deliveries').select('*'),
          supabase.from('payments').select('*')
        ]);

        if (suppliersError) throw suppliersError;
        if (itemsError) throw itemsError;
        if (deliveriesError) throw deliveriesError;
        if (paymentsError) throw paymentsError;

        setSuppliers(suppliersData || []);
        setSupplyItems(itemsData || []);
        setDeliveries(deliveriesData || []);
        setPayments(paymentsData || []);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // CRUD Operations
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

  const handleItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      if (!selectedSupplier) return;
      
      const { data, error } = await supabase
        .from('supply_items')
        .insert([{ 
          ...itemForm, 
          supplier_id: selectedSupplier.id,
          purchase_date: itemForm.purchase_date || new Date().toISOString().split('T')[0]
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
      
      const { data, error } = await supabase
        .from('deliveries')
        .insert([{ ...deliveryForm, supply_item_id: selectedItem.id }])
        .select();

      if (error) throw error;

      if (data?.[0]) {
        setDeliveries(prev => [...prev, data[0]]);
        resetDeliveryForm();
      }
    } catch (err) {
      console.error('Error saving delivery:', err);
      setError('Failed to save delivery. Please try again.');
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      if (!selectedItem) return;
      
      const { data, error } = await supabase
        .from('payments')
        .insert([{ ...paymentForm, supply_item_id: selectedItem.id }])
        .select();

      if (error) throw error;

      if (data?.[0]) {
        setPayments(prev => [...prev, data[0]]);
        resetPaymentForm();
      }
    } catch (err) {
      console.error('Error saving payment:', err);
      setError('Failed to save payment. Please try again.');
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    setError(null);
    
    try {
      // First delete all items and their related records
      const { data: items, error: itemsError } = await supabase
        .from('supply_items')
        .select('id')
        .eq('supplier_id', id);

      if (itemsError) throw itemsError;

      if (items && items.length > 0) {
        const itemIds = items.map(item => item.id);
        
        // Delete deliveries
        await supabase
          .from('deliveries')
          .delete()
          .in('supply_item_id', itemIds);

        // Delete payments
        await supabase
          .from('payments')
          .delete()
          .in('supply_item_id', itemIds);

        // Delete items
        await supabase
          .from('supply_items')
          .delete()
          .in('id', itemIds);
      }

      // Finally delete the supplier
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSuppliers(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error('Error deleting supplier:', err);
      setError('Failed to delete supplier. Please try again.');
    }
  };

  const handleDeleteItem = async (id: string) => {
    setError(null);
    
    try {
      // First delete related records
      await supabase
        .from('deliveries')
        .delete()
        .eq('supply_item_id', id);

      await supabase
        .from('payments')
        .delete()
        .eq('supply_item_id', id);

      // Then delete the item
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

  // Form resets
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
      purchase_date: new Date().toISOString().split('T')[0],
    });
    setShowItemForm(false);
  };

  const resetDeliveryForm = () => {
    setDeliveryForm({
      supply_item_id: "",
      quantity: 0,
      delivery_date: new Date().toISOString().split('T')[0],
      notes: "",
    });
    setShowDeliveryForm(false);
  };

  const resetPaymentForm = () => {
    setPaymentForm({
      supply_item_id: "",
      amount: 0,
      payment_date: new Date().toISOString().split('T')[0],
      method: "cash",
      reference: "",
    });
    setShowPaymentForm(false);
  };

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
              <span className="text-blue-500">📦</span> Service providers
            </h1>
            <p className="text-gray-600">Manage your service providers and their supplies</p>
          </div>
          <button
            onClick={() => setShowSupplierForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
          >
            <span>+</span> Add new
          </button>
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
            <p className="text-gray-500 mb-4">Get started by adding your first service provider</p>
            <button
              onClick={() => setShowSupplierForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              Add new
            </button>
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
                    Supplies
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Added
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
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {getSupplierItems(supplier.id).length} items
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(supplier.created_at)}
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
                          onClick={() => handleDeleteSupplier(supplier.id)}
                          className="px-3 py-1 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 flex items-center gap-1"
                        >
                          <span>🗑️</span> Delete
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
                    onClick={() => {
                      setItemForm({
                        ...itemForm,
                        supplier_id: selectedSupplier.id,
                        purchase_date: new Date().toISOString().split('T')[0]
                      });
                      setShowItemForm(true);
                    }}
                    className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center gap-1"
                  >
                    <span>+</span> Add Item
                  </button>
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
                          Qty Ordered
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Qty Delivered
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Qty Pending
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Unit Price
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Cost
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount Paid
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
                        const totalDelivered = getTotalDelivered(item.id);
                        const totalPaid = getTotalPaid(item.id);
                        const pending = item.quantity - totalDelivered;
                        const totalCost = item.quantity * item.price;
                        const balance = totalCost - totalPaid;

                        return (
                          <tr key={item.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {item.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {item.quantity}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {totalDelivered}
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                              pending > 0 ? 'text-yellow-600' : 'text-green-600'
                            }`}>
                              {pending}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatCurrency(item.price)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatCurrency(totalCost)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatCurrency(totalPaid)}
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                              balance > 0 ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {formatCurrency(balance)}
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
                                <button
                                  onClick={() => {
                                    setSelectedItem(item);
                                    setShowDeliveryForm(true);
                                  }}
                                  className="text-green-600 hover:text-green-900"
                                >
                                  Record Delivery
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedItem(item);
                                    setPaymentForm({
                                      ...paymentForm,
                                      supply_item_id: item.id,
                                      amount: Math.min(item.price * item.quantity - totalPaid, item.price * item.quantity)
                                    });
                                    setShowPaymentForm(true);
                                  }}
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  Record Payment
                                </button>
                                <button
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  Delete
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
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Method/Notes
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
                          {txn.type === 'payment' ? formatCurrency(txn.amount || 0) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {txn.type === 'payment' ? (
                            <div>
                              <div className="font-medium">{txn.method}</div>
                              {txn.reference && <div className="text-xs">Ref: {txn.reference}</div>}
                            </div>
                          ) : (
                            txn.notes || '-'
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
                  <input
                    type="text"
                    name="name"
                    value={itemForm.name}
                    onChange={(e) => setItemForm({...itemForm, name: e.target.value})}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Purchase Date
                  </label>
                  <input
                    type="date"
                    name="purchase_date"
                    value={itemForm.purchase_date}
                    onChange={(e) => setItemForm({...itemForm, purchase_date: e.target.value})}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
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

                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Total Cost:</span>
                    <span className="font-medium">
                      {formatCurrency((itemForm.quantity || 0) * (itemForm.price || 0))}
                    </span>
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
                    min="1"
                    max={selectedItem.quantity - getTotalDelivered(selectedItem.id)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Delivery Date
                  </label>
                  <input
                    type="date"
                    name="delivery_date"
                    value={deliveryForm.delivery_date}
                    onChange={(e) => setDeliveryForm({...deliveryForm, delivery_date: e.target.value})}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (Optional)
                  </label>
                  <input
                    type="text"
                    name="notes"
                    value={deliveryForm.notes || ''}
                    onChange={(e) => setDeliveryForm({...deliveryForm, notes: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm font-medium">Previously Delivered:</span>
                      <div className="font-medium">
                        {getTotalDelivered(selectedItem.id)}
                      </div>
                    </div>
                    <div>
                      <span className="text-sm font-medium">Pending After This:</span>
                      <div className={`font-medium ${
                        (selectedItem.quantity - getTotalDelivered(selectedItem.id) - deliveryForm.quantity) > 0 
                          ? 'text-yellow-600' 
                          : 'text-green-600'
                      }`}>
                        {selectedItem.quantity - getTotalDelivered(selectedItem.id) - deliveryForm.quantity}
                      </div>
                    </div>
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
                    min="0"
                    step="0.01"
                    max={selectedItem.quantity * selectedItem.price - getTotalPaid(selectedItem.id)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Date
                  </label>
                  <input
                    type="date"
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
                    onChange={(e) => setPaymentForm({...paymentForm, method: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank">Bank Transfer</option>
                    <option value="mobile_money">Mobile Money</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reference (Optional)
                  </label>
                  <input
                    type="text"
                    name="reference"
                    value={paymentForm.reference || ''}
                    onChange={(e) => setPaymentForm({...paymentForm, reference: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm font-medium">Total Cost:</span>
                      <div className="font-medium">
                        {formatCurrency(selectedItem.quantity * selectedItem.price)}
                      </div>
                    </div>
                    <div>
                      <span className="text-sm font-medium">Previously Paid:</span>
                      <div className="font-medium">
                        {formatCurrency(getTotalPaid(selectedItem.id))}
                      </div>
                    </div>
                    <div>
                      <span className="text-sm font-medium">Balance After This:</span>
                      <div className={`font-medium ${
                        (selectedItem.quantity * selectedItem.price - getTotalPaid(selectedItem.id) - paymentForm.amount) > 0 
                          ? 'text-red-600' 
                          : 'text-green-600'
                      }`}>
                        {formatCurrency(
                          selectedItem.quantity * selectedItem.price - getTotalPaid(selectedItem.id) - paymentForm.amount
                        )}
                      </div>
                    </div>
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
