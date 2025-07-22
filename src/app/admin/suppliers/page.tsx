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
  total_cost: number;
  amount_paid: number;
  balance: number;
  purchase_date?: string;
}

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplyItems, setSupplyItems] = useState<SupplyItem[]>([]);
  const [formData, setFormData] = useState<Omit<Supplier, "id" | "created_at">>({
    name: "",
    contact: "",
    address: "",
  });
  const [itemFormData, setItemFormData] = useState<Omit<SupplyItem, "id" | "total_cost" | "balance">>({
    supplier_id: "",
    name: "",
    quantity: 0,
    price: 0,
    amount_paid: 0,
    purchase_date: new Date().toISOString().split('T')[0],
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [selectedItem, setSelectedItem] = useState<SupplyItem | null>(null);
  const [showSuppliesModal, setShowSuppliesModal] = useState(false);
  const [existingItems, setExistingItems] = useState<string[]>([]);
  const [isNewItem, setIsNewItem] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isItemEditMode, setIsItemEditMode] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const { data: suppliersData, error: suppliersError } = await supabase
          .from('suppliers')
          .select('*')
          .order('created_at', { ascending: false });

        if (suppliersError) throw suppliersError;

        const { data: itemsData, error: itemsError } = await supabase
          .from('supply_items')
          .select('*');

        if (itemsError) throw itemsError;

        setSuppliers(suppliersData || []);
        setSupplyItems(itemsData || []);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (itemFormData.quantity && itemFormData.price) {
      const total = itemFormData.quantity * itemFormData.price;
      const balance = total - (itemFormData.amount_paid || 0);
      setItemFormData(prev => ({ ...prev, total_cost: total, balance }));
    }
  }, [itemFormData.quantity, itemFormData.price, itemFormData.amount_paid]);

  const fetchSupplierItems = async (supplierId: string) => {
    try {
      const { data, error } = await supabase
        .from('supply_items')
        .select('name')
        .eq('supplier_id', supplierId);

      if (error) throw error;

      const uniqueItems = [...new Set(data?.map(item => item.name))];
      setExistingItems(uniqueItems || []);
    } catch (err) {
      console.error('Error fetching supplier items:', err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleItemInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setItemFormData(prev => ({ 
      ...prev, 
      [name]: name === 'quantity' || name === 'price' || name === 'amount_paid' ? Number(value) : value 
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      if (isEditMode && selectedSupplier) {
        const { data, error } = await supabase
          .from('suppliers')
          .update(formData)
          .eq('id', selectedSupplier.id)
          .select();

        if (error) throw error;

        if (data && data[0]) {
          setSuppliers(prev => prev.map(supplier => 
            supplier.id === selectedSupplier.id ? data[0] : supplier
          ));
          resetForm();
        }
      } else {
        const { data, error } = await supabase
          .from('suppliers')
          .insert([formData])
          .select();

        if (error) throw error;

        if (data && data[0]) {
          setSuppliers(prev => [data[0], ...prev]);
          resetForm();
        }
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
      
      const total_cost = itemFormData.quantity * itemFormData.price;
      const balance = total_cost - itemFormData.amount_paid;

      const itemData = {
        ...itemFormData,
        supplier_id: selectedSupplier.id,
        total_cost,
        balance
      };

      if (isItemEditMode && selectedItem) {
        const { data, error } = await supabase
          .from('supply_items')
          .update(itemData)
          .eq('id', selectedItem.id)
          .select();

        if (error) throw error;

        if (data && data[0]) {
          setSupplyItems(prev => prev.map(item => 
            item.id === selectedItem.id ? data[0] : item
          ));
          resetItemForm();
        }
      } else {
        const { data, error } = await supabase
          .from('supply_items')
          .insert([itemData])
          .select();

        if (error) throw error;

        if (data && data[0]) {
          setSupplyItems(prev => [...prev, data[0]]);
          resetItemForm();
        }
      }
    } catch (err) {
      console.error('Error saving supply item:', err);
      setError('Failed to save supply item. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    
    try {
      const { error: itemsError } = await supabase
        .from('supply_items')
        .delete()
        .eq('supplier_id', id);

      if (itemsError) throw itemsError;

      const { error: supplierError } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id);

      if (supplierError) throw supplierError;

      setSuppliers(prev => prev.filter(supplier => supplier.id !== id));
      setSupplyItems(prev => prev.filter(item => item.supplier_id !== id));
    } catch (err) {
      console.error('Error deleting supplier:', err);
      setError('Failed to delete supplier. Please try again.');
    }
  };

  const handleDeleteItem = async (id: string) => {
    setError(null);
    
    try {
      const { error } = await supabase
        .from('supply_items')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSupplyItems(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error('Error deleting supply item:', err);
      setError('Failed to delete supply item. Please try again.');
    }
  };

  const getSupplierItems = (supplierId: string) => {
    return supplyItems.filter(item => item.supplier_id === supplierId);
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

  const openEditSupplierModal = (supplier: Supplier) => {
    setFormData({
      name: supplier.name,
      contact: supplier.contact,
      address: supplier.address
    });
    setSelectedSupplier(supplier);
    setIsEditMode(true);
    setIsDialogOpen(true);
  };

  const openAddSupplierModal = () => {
    resetForm();
    setIsEditMode(false);
    setIsDialogOpen(true);
  };

  const openSuppliesModal = async (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    await fetchSupplierItems(supplier.id);
    setShowSuppliesModal(true);
  };

  const openAddItemModal = () => {
    resetItemForm();
    setIsItemEditMode(false);
    setIsNewItem(true);
    setIsItemDialogOpen(true);
  };

  const openEditItemModal = (item: SupplyItem) => {
    setItemFormData({
      supplier_id: item.supplier_id,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      amount_paid: item.amount_paid,
      purchase_date: item.purchase_date || new Date().toISOString().split('T')[0],
    });
    setSelectedItem(item);
    setIsItemEditMode(true);
    setIsNewItem(false);
    setIsItemDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      contact: "",
      address: ""
    });
    setSelectedSupplier(null);
    setIsDialogOpen(false);
    setIsEditMode(false);
  };

  const resetItemForm = () => {
    setItemFormData({
      supplier_id: "",
      name: "",
      quantity: 0,
      price: 0,
      amount_paid: 0,
      purchase_date: new Date().toISOString().split('T')[0],
    });
    setSelectedItem(null);
    setIsItemDialogOpen(false);
    setIsItemEditMode(false);
  };

  if (isLoading) {
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
            onClick={openAddSupplierModal}
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
              onClick={openAddSupplierModal}
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
                    Action
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
                          onClick={() => openSuppliesModal(supplier)}
                          className="px-3 py-1 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 flex items-center gap-1"
                        >
                          <span>📦</span> View Supplies
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

      {/* Supplier Add/Edit Modal */}
      {isDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {isEditMode ? 'Edit Supplier' : 'Add New Supplier'}
                </h3>
                <button 
                  onClick={resetForm}
                  className="text-gray-400 hover:text-gray-500"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
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
                    value={formData.contact}
                    onChange={handleInputChange}
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
                    value={formData.address}
                    onChange={handleInputChange}
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
                    onClick={resetForm}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    {isEditMode ? 'Update Supplier' : 'Save Supplier'}
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
                    onClick={openAddItemModal}
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
                          Qty
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
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {getSupplierItems(selectedSupplier.id).map((item) => (
                        <tr key={item.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {item.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.quantity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatCurrency(item.price)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatCurrency(item.total_cost)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatCurrency(item.amount_paid)}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                            item.balance > 0 ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {formatCurrency(item.balance)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.purchase_date ? formatDate(item.purchase_date) : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => openEditItemModal(item)}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                Edit
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
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Supply Item Add/Edit Modal */}
      {isItemDialogOpen && selectedSupplier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {isItemEditMode ? 'Edit Item' : 'Add  Item'}
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
                  {!isItemEditMode && (
                    <div className="flex gap-2 mb-2">
                      <button
                        type="button"
                        onClick={() => setIsNewItem(true)}
                        className={`px-3 py-1 text-sm rounded-lg ${isNewItem ? 'bg-blue-100 text-blue-800' : 'bg-gray-100'}`}
                      >
                        New Item
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsNewItem(false)}
                        className={`px-3 py-1 text-sm rounded-lg ${!isNewItem ? 'bg-blue-100 text-blue-800' : 'bg-gray-100'}`}
                      >
                        Existing Item
                      </button>
                    </div>
                  )}
                  
                  {isNewItem || isItemEditMode ? (
                    <input
                      type="text"
                      name="name"
                      value={itemFormData.name}
                      onChange={handleItemInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter item name"
                      disabled={isItemEditMode}
                    />
                  ) : (
                    <select
                      name="name"
                      value={itemFormData.name}
                      onChange={handleItemInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select existing item</option>
                      {existingItems.map(item => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      name="quantity"
                      value={itemFormData.quantity}
                      onChange={handleItemInputChange}
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
                      value={itemFormData.price}
                      onChange={handleItemInputChange}
                      required
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">Total Cost:</span>
                    <span className="font-medium">
                      {formatCurrency((itemFormData.quantity || 0) * (itemFormData.price || 0))}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount Paid (UGX)
                  </label>
                  <input
                    type="number"
                    name="amount_paid"
                    value={itemFormData.amount_paid}
                    onChange={handleItemInputChange}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="bg-gray-100 p-3 rounded-lg">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Balance:</span>
                    <span className={`font-medium ${
                      ((itemFormData.quantity || 0) * (itemFormData.price || 0) - (itemFormData.amount_paid || 0)) > 0 
                        ? 'text-red-600' 
                        : 'text-green-600'
                    }`}>
                      {formatCurrency(
                        (itemFormData.quantity || 0) * (itemFormData.price || 0) - (itemFormData.amount_paid || 0)
                      )}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Purchase Date
                  </label>
                  <input
                    type="date"
                    name="purchase_date"
                    value={itemFormData.purchase_date}
                    onChange={handleItemInputChange}
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
                    onClick={resetItemForm}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    {isItemEditMode ? 'Update Item' : 'Save Item'}
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
