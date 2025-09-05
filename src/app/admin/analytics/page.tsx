"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface MaterialAsset {
  id: string;
  name: string;
  available: number;
  total: number;
  unit_cost?: number;
  total_value: number;
}

interface ProductAsset {
  id: string;
  title: string;
  available: number;
  unit_cost?: number;
  total_value: number;
}

interface CashAssets {
  available: number;
  accountsReceivable: number;
  total: number;
}

interface OrderBalance {
  order_id: string;
  total_amount: number;
  amount_paid: number;
  balance: number;
  customer_name: string;
  customer_id: string;
  customer_type: 'client' | 'marketer' | 'supplier' | 'unknown';
}

interface InventoryCost {
  id: string;
  item_type: 'material' | 'product';
  item_id: string;
  item_name: string;
  unit_cost: number;
}

interface CostFormData {
  item_type: 'material' | 'product';
  item_id: string;
  unit_cost: string;
}

interface OpeningBalanceOwner {
  id: string;
  type: 'marketer' | 'client' | 'supplier';
  name: string;
  amount: number;
}

interface GroupedReceivable {
  customer_id: string;
  customer_name: string;
  customer_type: string;
  total_balance: number;
}

export default function CurrentAssetsPage() {
  const [materialAssets, setMaterialAssets] = useState<MaterialAsset[]>([]);
  const [productAssets, setProductAssets] = useState<ProductAsset[]>([]);
  const [cashAssets, setCashAssets] = useState<CashAssets>({
    available: 0,
    accountsReceivable: 0,
    total: 0
  });
  const [loading, setLoading] = useState(true);
  const [orderBalances, setOrderBalances] = useState<OrderBalance[]>([]);
  const [groupedReceivables, setGroupedReceivables] = useState<GroupedReceivable[]>([]);
  const [inventoryCosts, setInventoryCosts] = useState<InventoryCost[]>([]);
  const [showCostForm, setShowCostForm] = useState(false);
  const [editingCost, setEditingCost] = useState<InventoryCost | null>(null);
  const [costFormData, setCostFormData] = useState<CostFormData>({
    item_type: 'material',
    item_id: '',
    unit_cost: ''
  });
  const [openingBalanceOwners, setOpeningBalanceOwners] = useState<OpeningBalanceOwner[]>([]);
  const [prepaidValue, setPrepaidValue] = useState<number>(0);

  // Fetch inventory costs
  const fetchInventoryCosts = async () => {
    try {
      const { data, error } = await supabase
        .from("inventory_costs")
        .select("*")
        .order("item_name");

      if (error) throw error;
      setInventoryCosts(data || []);
      return data || [];
    } catch (error) {
      console.error("Error fetching inventory costs:", error);
      return [];
    }
  };

  // Add or update inventory cost
  const saveInventoryCost = async () => {
    try {
      if (!costFormData.item_id || !costFormData.unit_cost) return;

      const costData = {
        item_type: costFormData.item_type,
        item_id: costFormData.item_id,
        item_name: costFormData.item_type === 'material' 
          ? materialAssets.find(m => m.id === costFormData.item_id)?.name || ''
          : productAssets.find(p => p.id === costFormData.item_id)?.title || '',
        unit_cost: parseFloat(costFormData.unit_cost)
      };

      if (editingCost) {
        const { error } = await supabase
          .from("inventory_costs")
          .update(costData)
          .eq("id", editingCost.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("inventory_costs")
          .insert([costData]);

        if (error) throw error;
      }

      await fetchInventoryCosts();
      setCostFormData({ item_type: 'material', item_id: '', unit_cost: '' });
      setEditingCost(null);
      setShowCostForm(false);
    } catch (error) {
      console.error("Error saving inventory cost:", error);
    }
  };

  // Edit existing cost
  const editCost = (cost: InventoryCost) => {
    setEditingCost(cost);
    setCostFormData({
      item_type: cost.item_type,
      item_id: cost.item_id,
      unit_cost: cost.unit_cost.toString()
    });
    setShowCostForm(true);
  };

  // Delete inventory cost
  const deleteCost = async (id: string) => {
    try {
      const { error } = await supabase
        .from("inventory_costs")
        .delete()
        .eq("id", id);

      if (error) throw error;
      await fetchInventoryCosts();
    } catch (error) {
      console.error("Error deleting inventory cost:", error);
    }
  };

  // Function to get customer name from either clients or users table
  const getCustomerName = async (userId: string): Promise<{name: string, type: 'client' | 'marketer'}> => {
    try {
      // First check in clients table
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("id, name")
        .eq("id", userId)
        .single();

      if (!clientError && clientData) {
        return { name: clientData.name, type: 'client' };
      }

      // If not found in clients, check in users table (marketers)
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id, name")
        .eq("id", userId)
        .single();

      if (!userError && userData) {
        return { name: userData.name, type: 'marketer' };
      }

      return { name: "Unknown Customer", type: 'unknown' as 'marketer' };
    } catch (error) {
      console.error("Error fetching customer name:", error);
      return { name: "Unknown Customer", type: 'unknown' as 'marketer' };
    }
  };

  // Helper function to safely parse numeric values from different data types
  const safeParseNumber = (value: any): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  const fetchMaterialAssets = async (costs: InventoryCost[]) => {
    try {
      const { data: materials, error: materialsError } = await supabase
        .from("materials")
        .select("id, name");

      if (materialsError) throw materialsError;

      const materialAssetsData: MaterialAsset[] = [];

      for (const material of materials || []) {
        // Get opening stocks for this material
        const { data: openingStocks, error: openingStocksError } = await supabase
          .from("opening_stocks")
          .select("quantity")
          .eq("material_id", material.id);

        if (openingStocksError) throw openingStocksError;

        // Get all stock deliveries for this material (both from supply_items and direct deliveries)
        const { data: stockDeliveries, error: deliveriesError } = await supabase
          .from("deliveries")
          .select("quantity")
          .eq("notes", "Stock")
          .eq("material_id", material.id);

        if (deliveriesError) throw deliveriesError;

        // Get material entries (outflow) for this material
        const { data: materialEntries, error: entriesError } = await supabase
          .from("material_entries")
          .select("quantity")
          .eq("material_id", material.id);

        if (entriesError) throw entriesError;

        // Calculate available quantity
        const openingStocksTotal = openingStocks?.reduce((sum, item) => sum + safeParseNumber(item.quantity), 0) || 0;
        const stockDeliveriesTotal = stockDeliveries?.reduce((sum, item) => sum + safeParseNumber(item.quantity), 0) || 0;
        const materialEntriesTotal = materialEntries?.reduce((sum, item) => sum + Math.abs(safeParseNumber(item.quantity)), 0) || 0;
        
        // Available quantity = (Opening stock + All stock deliveries) - Material entries
        const availableQuantity = (openingStocksTotal + stockDeliveriesTotal) - materialEntriesTotal;

        // Get unit cost from inventory costs
        const materialCost = costs.find(cost => cost.item_type === 'material' && cost.item_id === material.id);
        const unit_cost = materialCost?.unit_cost || 0;

        // Calculate total value
        const total_value = availableQuantity * unit_cost;

        materialAssetsData.push({
          id: material.id,
          name: material.name,
          available: availableQuantity,
          total: availableQuantity,
          unit_cost,
          total_value
        });
      }

      setMaterialAssets(materialAssetsData);
    } catch (error) {
      console.error("Error fetching material assets:", error);
    }
  };

  // Fetch prepaid value from the three tables using the formula: (S1 × SP) - (SQ × SP) + CB
  const fetchPrepaidValue = async () => {
    try {
      const [
        { data: materialBalancesData, error: materialBalancesError },
        { data: deliveriesData, error: deliveriesError },
        { data: supplierBalancesData, error: supplierBalancesError }
      ] = await Promise.all([
        supabase.from("material_balances").select("opening_balance"),
        supabase.from("deliveries").select("quantity, unit_price"),
        supabase.from("supplier_balances").select("current_balance")
      ]);

      if (materialBalancesError) throw materialBalancesError;
      if (deliveriesError) throw deliveriesError;
      if (supplierBalancesError) throw supplierBalancesError;

      // Calculate S1 (sum of opening_balance from material_balances)
      const S1 = materialBalancesData?.reduce((sum, item) => 
        sum + safeParseNumber(item.opening_balance), 0) || 0;

      // Calculate SQ (sum of quantity from deliveries)
      const SQ = deliveriesData?.reduce((sum, item) => 
        sum + safeParseNumber(item.quantity), 0) || 0;

      // Calculate SP (sum of unit_price from deliveries)
      const SP = deliveriesData?.reduce((sum, item) => 
        sum + safeParseNumber(item.unit_price), 0) || 0;

      // Calculate CB (sum of current_balance from supplier_balances)
      const CB = supplierBalancesData?.reduce((sum, item) => 
        sum + safeParseNumber(item.current_balance), 0) || 0;

      // Calculate prepaid value using the formula: (S1 × SP) - (SQ × SP) + CB
      const prepaidValue = (S1 * SP) - (SQ * SP) + CB;
      setPrepaidValue(prepaidValue);
    } catch (error) {
      console.error("Error fetching prepaid value:", error);
      setPrepaidValue(0);
    }
  };

  const fetchProductAssets = async (costs: InventoryCost[]) => {
    try {
      // Fetch all products
      const { data: products, error: productsError } = await supabase
        .from("product")
        .select("id, title");

      if (productsError) throw productsError;

      const productAssetsData: ProductAsset[] = [];

      for (const product of products || []) {
        // --- Opening stock ---
        const { data: openingStocks, error: openingStocksError } = await supabase
          .from("opening_stocks")
          .select("quantity")
          .eq("product_id", product.id);

        if (openingStocksError) throw openingStocksError;

        const openingStocksTotal =
          openingStocks?.reduce((sum, item) => sum + safeParseNumber(item.quantity), 0) || 0;

        // --- Inflows: Return, Production, Stamped ---
        const { data: productInflows, error: inflowsError } = await supabase
          .from("product_entries")
          .select("quantity")
          .eq("product_id", product.id)
          .in("transaction", ["Return", 'Production', 'Stamped']);

        if (inflowsError) throw inflowsError;

        const productInflowsTotal =
          productInflows?.reduce((sum, item) => sum + safeParseNumber(item.quantity), 0) || 0;

        // --- Outflows: anything not in [Return, Production, Stamped] ---
        const { data: productOutflows, error: outflowsError } = await supabase
          .from("product_entries")
          .select("quantity")
          .eq("product_id", product.id)
          .not("transaction", "in", "('Return','Production','Stamped')");

        if (outflowsError) throw outflowsError;

        const productOutflowsTotal =
          productOutflows?.reduce((sum, item) => sum + safeParseNumber(item.quantity), 0) || 0;

        // --- Final calculations ---
        const inflowTotal = openingStocksTotal + productInflowsTotal;
        const outflowTotal = productOutflowsTotal;

        const available = inflowTotal - outflowTotal;

        // Get unit cost from inventory costs
         const productCost = costs.find(
          (cost) => cost.item_type === "product" && cost.item_id === product.id
        );
        const unit_cost = productCost?.unit_cost || 0;

        // Total value = available * unit cost
        const total_value = available * unit_cost;

        productAssetsData.push({
          id: product.id,
          title: product.title,
          available,
          unit_cost,
          total_value,
        });
      }

      setProductAssets(productAssetsData);
    } catch (error) {
      console.error("Error fetching product assets:", error);
    }
  };

const fetchCashAssets = async () => {
  try {
    const { data: financeData, error: financeError } = await supabase
      .from("finance")
      .select("amount_paid");

    if (financeError) throw financeError;

    const { data: expensesData, error: expensesError } = await supabase
      .from("expenses")
      .select("amount_spent");

    if (expensesError) throw expensesError;

    const totalPayments = financeData?.reduce((sum, item) => sum + safeParseNumber(item.amount_paid), 0) || 0;
    const totalExpenses = expensesData?.reduce((sum, item) => sum + safeParseNumber(item.amount_spent), 0) || 0;
    const availableCash = totalPayments - totalExpenses;

    // Fetch opening balances with status 'Unpaid' and owner information
    const { data: openingBalancesData, error: openingBalancesError } = await supabase
      .from("opening_balances")
      .select("id, amount, marketer_id, client_id, supplier_id")
      .eq("status", "Unpaid");

    if (openingBalancesError) throw openingBalancesError;

    let totalOpeningBalances = 0;
    const ownersMap = new Map<string, OpeningBalanceOwner>();

    if (openingBalancesData && openingBalancesData.length > 0) {
      // First, collect all unique owner IDs that we need to fetch names for
      const marketerIds = new Set<string>();
      const clientIds = new Set<string>();
      const supplierIds = new Set<string>();

      for (const balance of openingBalancesData) {
        const amount = safeParseNumber(balance.amount);
        totalOpeningBalances += amount;

        // Determine the owner type and ID
        let ownerId: string | null = null;
        let ownerType: 'marketer' | 'client' | 'supplier' | null = null;

        if (balance.marketer_id) {
          ownerId = balance.marketer_id;
          ownerType = 'marketer';
          marketerIds.add(ownerId);
        } else if (balance.client_id) {
          ownerId = balance.client_id;
          ownerType = 'client';
          clientIds.add(ownerId);
        } else if (balance.supplier_id) {
          ownerId = balance.supplier_id;
          ownerType = 'supplier';
          supplierIds.add(ownerId);
        }

        if (ownerId && ownerType) {
          const key = `${ownerType}_${ownerId}`;
          
          if (ownersMap.has(key)) {
            // Update existing owner entry
            const existingOwner = ownersMap.get(key)!;
            existingOwner.amount += amount;
            ownersMap.set(key, existingOwner);
          } else {
            // Create new owner entry (name will be fetched later)
            ownersMap.set(key, {
              id: ownerId,
              type: ownerType,
              name: 'Loading...', // Temporary placeholder
              amount: amount
            });
          }
        } else {
          // Handle cases where no owner is specified
          const key = `unknown_${balance.id}`;
          ownersMap.set(key, {
            id: balance.id,
            type: 'client', // Default type
            name: 'Unknown Owner',
            amount: amount
          });
        }
      }

      // Fetch names for marketers
      if (marketerIds.size > 0) {
        const { data: marketersData, error: marketersError } = await supabase
          .from("users")
          .select("id, name")
          .in("id", Array.from(marketerIds));

        if (!marketersError && marketersData) {
          marketersData.forEach(marketer => {
            const key = `marketer_${marketer.id}`;
            if (ownersMap.has(key)) {
              const owner = ownersMap.get(key)!;
              owner.name = marketer.name;
              ownersMap.set(key, owner);
            }
          });
        }
      }

      // Fetch names for clients
      if (clientIds.size > 0) {
        const { data: clientsData, error: clientsError } = await supabase
          .from("clients")
          .select("id, name")
          .in("id", Array.from(clientIds));

        if (!clientsError && clientsData) {
          clientsData.forEach(client => {
            const key = `client_${client.id}`;
            if (ownersMap.has(key)) {
              const owner = ownersMap.get(key)!;
              owner.name = client.name;
              ownersMap.set(key, owner);
            }
          });
        }
      }

      // Fetch names for suppliers
      if (supplierIds.size > 0) {
        const { data: suppliersData, error: suppliersError } = await supabase
          .from("suppliers")
          .select("id, name")
          .in("id", Array.from(supplierIds));

        if (!suppliersError && suppliersData) {
          suppliersData.forEach(supplier => {
            const key = `supplier_${supplier.id}`;
            if (ownersMap.has(key)) {
              const owner = ownersMap.get(key)!;
              owner.name = supplier.name;
              ownersMap.set(key, owner);
            }
          });
        }
      }

      // Update any remaining owners that we couldn't find names for
      ownersMap.forEach((owner, key) => {
        if (owner.name === 'Loading...') {
          owner.name = `Unknown ${owner.type}`;
          ownersMap.set(key, owner);
        }
      });

      setOpeningBalanceOwners(Array.from(ownersMap.values()));
    }

    const { data: orders, error: ordersError } = await supabase
      .from("order")
      .select("id, total_amount, user");

    if (ordersError) throw ordersError;

    let totalAccountsReceivable = totalOpeningBalances;
    const balances: OrderBalance[] = [];
    const receivablesMap = new Map<string, GroupedReceivable>();

    // Add opening balances to the accounts receivable list (grouped by owner)
    if (openingBalancesData && openingBalancesData.length > 0) {
      const ownersArray = Array.from(ownersMap.values());
      for (const owner of ownersArray) {
        balances.push({
          order_id: `${owner.type}_${owner.id}`,
          total_amount: owner.amount,
          amount_paid: 0,
          balance: owner.amount,
          customer_name: `${owner.name} (${owner.type} - Opening Balance)`,
          customer_id: owner.id,
          customer_type: owner.type
        });

        // Add to grouped receivables
        const key = `${owner.type}_${owner.id}`;
        receivablesMap.set(key, {
          customer_id: owner.id,
          customer_name: owner.name,
          customer_type: owner.type,
          total_balance: owner.amount
        });
      }
    }

    for (const order of orders || []) {
      const { data: orderPayments, error: paymentsError } = await supabase
        .from("finance")
        .select("amount_paid")
        .eq("order_id", order.id)
        .not("order_id", "is", null);

      if (paymentsError) throw paymentsError;

      const totalPaid = orderPayments?.reduce((sum, payment) => sum + safeParseNumber(payment.amount_paid), 0) || 0;
      const balance = safeParseNumber(order.total_amount) - totalPaid;

      if (balance > 0) {
        const customerInfo = await getCustomerName(order.user);
        
        totalAccountsReceivable += balance;
        balances.push({
          order_id: order.id,
          total_amount: safeParseNumber(order.total_amount),
          amount_paid: totalPaid,
          balance,
          customer_name: customerInfo.name,
          customer_id: order.user,
          customer_type: customerInfo.type
        });

        // Add to grouped receivables
        const key = `${customerInfo.type}_${order.user}`;
        if (receivablesMap.has(key)) {
          const existing = receivablesMap.get(key)!;
          existing.total_balance += balance;
          receivablesMap.set(key, existing);
        } else {
          receivablesMap.set(key, {
            customer_id: order.user,
            customer_name: customerInfo.name,
            customer_type: customerInfo.type,
            total_balance: balance
          });
        }
      }
    }

    // Convert the map to an array for easier rendering
    setGroupedReceivables(Array.from(receivablesMap.values()));

    setCashAssets({
      available: availableCash,
      accountsReceivable: totalAccountsReceivable,
      total: availableCash + totalAccountsReceivable
    });

    setOrderBalances(balances);
  } catch (error) {
    console.error("Error fetching cash assets:", error);
  }
};

  const fetchAllAssets = async () => {
    setLoading(true);
    try {
      const costs = await fetchInventoryCosts();
      await Promise.all([
        fetchMaterialAssets(costs),
        fetchProductAssets(costs),
        fetchCashAssets(),
        fetchPrepaidValue()
      ]);
      
      // Show cost form if no costs are set
      if (costs.length === 0) {
        setShowCostForm(true);
      }
    } catch (error) {
      console.error("Error fetching assets:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllAssets();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'UGX'
    }).format(amount);
  };

  // Calculate total inventory value
  const totalInventoryValue = materialAssets.reduce((sum, item) => sum + item.total_value, 0) +
                            productAssets.reduce((sum, item) => sum + item.total_value, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 p-6">
        <div className="w-full max-w-2xl text-center">
          <h1 className="text-4xl font-extrabold mb-4 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent animate-pulse">
            Current Assets
          </h1>
          <p className="text-gray-700 mb-8">Loading assets data...</p>
          <div className="grid gap-6">
            <div className="h-40 w-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-2xl animate-pulse"></div>
            <div className="h-40 w-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-2xl animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Cost Management Dialog */}
      <Dialog open={showCostForm} onOpenChange={setShowCostForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCost ? "Edit Inventory Cost" : "Set Inventory Costs"}
            </DialogTitle>
            <DialogDescription>
              Set the unit cost for materials and products to calculate inventory values.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Item Type</Label>
              <Select
                value={costFormData.item_type}
                onValueChange={(value: 'material' | 'product') => 
                  setCostFormData({ ...costFormData, item_type: value, item_id: '' })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select item type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="material">Material</SelectItem>
                  <SelectItem value="product">Product</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Item</Label>
              <Select
                value={costFormData.item_id}
                onValueChange={(value) => 
                  setCostFormData({ ...costFormData, item_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={`Select ${costFormData.item_type}`} />
                </SelectTrigger>
                <SelectContent>
                  {costFormData.item_type === 'material' ? (
                    materialAssets.map(material => (
                      <SelectItem key={material.id} value={material.id}>
                        {material.name}
                      </SelectItem>
                    ))
                  ) : (
                    productAssets.map(product => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.title}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Unit Cost (UGX)</Label>
              <Input
                type="number"
                placeholder="Enter unit cost"
                value={costFormData.unit_cost}
                onChange={(e) => 
                  setCostFormData({ ...costFormData, unit_cost: e.target.value })
                }
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => {
              setShowCostForm(false);
              setEditingCost(null);
              setCostFormData({ item_type: 'material', item_id: '', unit_cost: '' });
            }}>
              Cancel
            </Button>
            <Button onClick={saveInventoryCost} disabled={!costFormData.item_id || !costFormData.unit_cost}>
              {editingCost ? "Update Cost" : "Save Cost"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Current Assets
          </h1>
          <p className="text-gray-600">Overview of company's current assets including materials, products, and cash</p>
        </div>
        
        {/* Dialog with trigger button inside */}
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              Manage Inventory Costs
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Manage Inventory Costs</DialogTitle>
              <DialogDescription>
                View, edit, or delete existing inventory costs
              </DialogDescription>
            </DialogHeader>
            
            {inventoryCosts.length > 0 ? (
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item Type</TableHead>
                      <TableHead>Item Name</TableHead>
                      <TableHead>Unit Cost</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventoryCosts.map((cost) => (
                      <TableRow key={cost.id}>
                        <TableCell className="capitalize">{cost.item_type}</TableCell>
                        <TableCell className="font-medium">{cost.item_name}</TableCell>
                        <TableCell>{formatCurrency(cost.unit_cost)}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" onClick={() => {
                              editCost(cost);
                              setShowCostForm(true);
                            }}>
                              Edit
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => deleteCost(cost.id)}>
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-gray-500 mb-4">No inventory costs set yet.</p>
                <Button onClick={() => setShowCostForm(true)}>
                  Set First Cost
                </Button>
              </div>
            )}
            
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setShowCostForm(true)}>
                Add New Cost
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Inventory Costs Management */}
      
      <div className="grid gap-6 mb-8">
        {/* Cash Assets Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-green-600">💰</span>
              Cash & Cash Equivalents
            </CardTitle>
            <CardDescription>Liquid assets available to the company</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="border rounded-lg p-4 bg-green-50">
                <div className="text-sm text-green-600 mb-1">Available Cash</div>
                <div className="text-2xl font-bold text-green-700">
                  {formatCurrency(cashAssets.available)}
                </div>
              </div>
              
              <div className="border rounded-lg p-4 bg-blue-50">
                <div className="text-sm text-blue-600 mb-1">Accounts Receivable</div>
                <div className="text-2xl font-bold text-blue-700">
                  {formatCurrency(cashAssets.accountsReceivable)}
                </div>
              </div>
              
              <div className="border rounded-lg p-4 bg-purple-50">
                <div className="text-sm text-purple-600 mb-1">Total Cash Assets</div>
                <div className="text-2xl font-bold text-purple-700">
                  {formatCurrency(cashAssets.total)}
                </div>
              </div>
            </div>

            {groupedReceivables.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Accounts Receivable Details</h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Client/Marketer</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groupedReceivables.map((receivable) => (
                        <TableRow key={`${receivable.customer_type}_${receivable.customer_id}`}>
                          <TableCell className="font-medium">{receivable.customer_name}</TableCell>
                          <TableCell className="capitalize">{receivable.customer_type}</TableCell>
                          <TableCell className="text-right font-semibold text-red-600">
                            {formatCurrency(receivable.total_balance)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Material Assets Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-blue-600">📦</span>
              Material Assets
            </CardTitle>
            <CardDescription>Raw materials inventory value</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="border rounded-lg p-4 bg-blue-50">
                <div className="text-sm text-blue-600 mb-1">Available Inventory Value</div>
                <div className="text-2xl font-bold text-blue-700">
                  {formatCurrency(materialAssets.reduce((sum, item) => sum + item.total_value, 0))}
                </div>
              </div>
              
              <div className="border rounded-lg p-4 bg-orange-50">
                <div className="text-sm text-orange-600 mb-1">Prepaid Materials Value</div>
                <div className="text-2xl font-bold text-orange-700">
                  {formatCurrency(prepaidValue)}
                </div>
              </div>
              
              <div className="border rounded-lg p-4 bg-purple-50">
                <div className="text-sm text-purple-600 mb-1">Total Material Assets</div>
                <div className="text-2xl font-bold text-purple-700">
                  {formatCurrency(materialAssets.reduce((sum, item) => sum + item.total_value, 0) + prepaidValue)}
                </div>
              </div>

              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="text-sm text-gray-600 mb-1">Number of Materials</div>
                <div className="text-2xl font-bold text-gray-700">
                  {materialAssets.length} types
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Material Details</h3>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead className="text-right">Available Qty</TableHead>
                      <TableHead className="text-right">Total Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {materialAssets.map((material) => (
                      <TableRow key={material.id}>
                        <TableCell className="font-medium">{material.name}</TableCell>
                        <TableCell className="text-right">{material.available}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(material.total_value)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Product Assets Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-green-600">🥤</span>
              Product Assets
            </CardTitle>
            <CardDescription>Finished products inventory value</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="border rounded-lg p-4 bg-green-50">
                <div className="text-sm text-green-600 mb-1">Total Products Value</div>
                <div className="text-2xl font-bold text-green-700">
                  {formatCurrency(productAssets.reduce((sum, item) => sum + item.total_value, 0))}
                </div>
              </div>
              
              <div className="border rounded-lg p-4 bg-blue-50">
                <div className="text-sm text-blue-600 mb-1">Number of Products</div>
                <div className="text-2xl font-bold text-blue-700">
                  {productAssets.length} types
                </div>
              </div>
              
              <div className="border rounded-lg p-4 bg-purple-50">
                <div className="text-sm text-purple-600 mb-1">Average Unit Cost</div>
                <div className="text-2xl font-bold text-purple-700">
                  {formatCurrency(
                    productAssets.reduce((sum, item) => sum + (item.unit_cost || 0), 0) / 
                    (productAssets.length || 1)
                  )}
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Product Details</h3>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Available Qty</TableHead>
                      <TableHead className="text-right">Total Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productAssets.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.title}</TableCell>
                        <TableCell className="text-right">{product.available}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(product.total_value)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Assets Summary */}
        <Card className="bg-gradient-to-r from-indigo-50 to-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-indigo-600">📊</span>
              Total Current Assets Summary
            </CardTitle>
            <CardDescription>Complete overview of all current assets</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="space-y-4">
                <h4 className="font-semibold text-indigo-700">Cash Assets</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Available Cash:</span>
                    <span className="font-semibold">{formatCurrency(cashAssets.available)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Accounts Receivable:</span>
                    <span className="font-semibold">{formatCurrency(cashAssets.accountsReceivable)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-semibold">Total Cash:</span>
                    <span className="font-semibold text-indigo-600">{formatCurrency(cashAssets.total)}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-semibold text-indigo-700">Material Assets</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Available Value:</span>
                    <span className="font-semibold">
                      {formatCurrency(materialAssets.reduce((sum, item) => sum + item.total_value, 0))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Prepaid Value:</span>
                    <span className="font-semibold">
                      {formatCurrency(prepaidValue)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-semibold">Total Materials:</span>
                    <span className="font-semibold text-indigo-600">
                      {formatCurrency(materialAssets.reduce((sum, item) => sum + item.total_value, 0) + prepaidValue)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-indigo-700">Product Assets</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Available Value:</span>
                    <span className="font-semibold">
                      {formatCurrency(productAssets.reduce((sum, item) => sum + item.total_value, 0))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Product Varieties:</span>
                    <span className="font-semibold">
                      {productAssets.length} types
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-semibold">Total Products:</span>
                    <span className="font-semibold text-indigo-600">
                      {formatCurrency(productAssets.reduce((sum, item) => sum + item.total_value, 0))}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-indigo-100 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-lg font-semibold text-indigo-800">Total Inventory Value:</span>
                <span className="text-2xl font-bold text-indigo-900">
                  {formatCurrency(totalInventoryValue + prepaidValue)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-indigo-800">Grand Total Current Assets:</span>
                <span className="text-2xl font-bold text-indigo-900">
                  {formatCurrency(cashAssets.total + totalInventoryValue + prepaidValue)}
                </span>
              </div>
              <p className="text-sm text-indigo-600 mt-2">
                Represents the total value of all liquid and convertible assets
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
