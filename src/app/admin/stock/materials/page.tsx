"use client";

import { useState, useEffect } from "react";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { createClient } from "@supabase/supabase-js";
import { ChevronDown, ChevronRight } from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Material {
  id: string;
  name: string;
  quantity_available: number;
  category: string;
}

type TransactionType = "inflow" | "outflow" | "opening_stock";

interface MaterialTransaction {
  id: string;
  date: string;
  type: TransactionType;
  quantity: number;
  action: string;
  material_id: string;
  material_name: string;
}

interface OpeningStockRecord {
  id: string;
  material_id: string;
  date: string;
  quantity: number;
}

interface OutflowFormData {
  material_id: string;
  action: "Damaged" | "Sold" | "Used in production";
  quantity: number;
  date: string;
}

interface OpeningStockFormData {
  material_id: string;
  quantity: number;
  date: string;
}

const CATEGORIES = ["Labels", "Bottles", "Spirit", "Boxes", "Flavor"];

const MaterialsPage = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isViewDetailsOpen, setIsViewDetailsOpen] = useState(false);
  const [isOutflowDialogOpen, setIsOutflowDialogOpen] = useState(false);
  const [isOpeningStockDialogOpen, setIsOpeningStockDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [viewMaterial, setViewMaterial] = useState<Material | null>(null);
  const [allTransactions, setAllTransactions] = useState<MaterialTransaction[]>([]);
  const [openingStocks, setOpeningStocks] = useState<OpeningStockRecord[]>([]);
  const [materialQuantities, setMaterialQuantities] = useState<Record<string, number>>({});
  const [newMaterial, setNewMaterial] = useState<Omit<Material, "id">>({
    name: "",
    quantity_available: 0,
    category: "Labels",
  });
  const [outflowForm, setOutflowForm] = useState<OutflowFormData>({
    material_id: "",
    action: "Damaged",
    quantity: 0,
    date: new Date().toISOString().split("T")[0],
  });
  const [openingStockForm, setOpeningStockForm] = useState<OpeningStockFormData>({
    material_id: "",
    quantity: 0,
    date: new Date().toISOString().split("T")[0],
  });
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [selectedHistoryDate, setSelectedHistoryDate] = useState<Date>(new Date());

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // Fetch materials
      const { data: materialsData = [], error: materialsError } = await supabase
        .from("materials")
        .select("id, name, quantity_available, category")
        .order("name", { ascending: true });
      if (materialsError) throw materialsError;

      // Fetch deliveries (inflows)
      const { data: deliveriesData = [], error: deliveriesError } = await supabase
        .from("deliveries")
        .select("id, supply_item_id, quantity, delivery_date");
      if (deliveriesError) throw deliveriesError;

      // Fetch supply items
      const { data: supplyItemsData = [], error: supplyItemsError } = await supabase
        .from("supply_items")
        .select("id, name");
      if (supplyItemsError) throw supplyItemsError;

      // Fetch outflows
      const { data: outflows = [], error: outflowError } = await supabase
        .from("material_entries")
        .select("id, material_id, quantity, action, date");
      if (outflowError) throw outflowError;

      // Fetch opening stocks
      const { data: openingStocksData = [], error: openingStocksError } = await supabase
        .from("opening_stocks")
        .select("id, material_id, quantity, date")
        .order("date", { ascending: false });
      if (openingStocksError) throw openingStocksError;

      setOpeningStocks(openingStocksData);

      // Process transactions
      const inflowTransactions: MaterialTransaction[] = deliveriesData
        .map(delivery => {
          const supplyItem = supplyItemsData.find(si => si.id === delivery.supply_item_id);
          const material = materialsData.find(m => m.name === supplyItem?.name);
          if (!material) return null;
          return {
            id: delivery.id,
            date: new Date(delivery.delivery_date).toISOString().split("T")[0],
            type: "inflow",
            quantity: delivery.quantity ?? 0,
            action: "Delivered",
            material_id: material.id,
            material_name: material.name,
          };
        })
        .filter((t): t is MaterialTransaction => t !== null);

      const outflowTransactions: MaterialTransaction[] = outflows.map(entry => ({
        id: entry.id,
        date: new Date(entry.date).toISOString().split("T")[0],
        type: "outflow",
        quantity: entry.quantity ?? 0,
        action: entry.action ?? "",
        material_id: entry.material_id,
        material_name: materialsData.find(m => m.id === entry.material_id)?.name || "",
      }));

      const openingStockTransactions: MaterialTransaction[] = openingStocksData.map(record => ({
        id: record.id,
        date: record.date,
        type: "opening_stock",
        quantity: record.quantity,
        action: "Opening Stock",
        material_id: record.material_id,
        material_name: materialsData.find(m => m.id === record.material_id)?.name || "",
      }));

      const combinedTransactions = [...openingStockTransactions, ...inflowTransactions, ...outflowTransactions];
      setAllTransactions(combinedTransactions);

      // Calculate current quantities
      const quantities: Record<string, number> = {};
      const latestOpeningStocks: Record<string, number> = {};

      // Get the most recent opening stock for each material
      openingStocksData.forEach(record => {
        const recordDate = new Date(record.date);
        if (!latestOpeningStocks[record.material_id] || 
            new Date(latestOpeningStocks[record.material_id]) < recordDate) {
          latestOpeningStocks[record.material_id] = record.quantity;
        }
      });

      materialsData.forEach(material => {
        const materialTransactions = combinedTransactions.filter(t => t.material_id === material.id);
        
        // Find the most recent opening stock
        const openingStock = latestOpeningStocks[material.id] || 0;
        
        const totalInflow = materialTransactions
          .filter(t => t.type === "inflow")
          .reduce((sum, t) => sum + (t.quantity || 0), 0);
        
        const totalOutflow = materialTransactions
          .filter(t => t.type === "outflow")
          .reduce((sum, t) => sum + (t.quantity || 0), 0);
        
        quantities[material.id] = openingStock + totalInflow - totalOutflow;
      });

      setMaterialQuantities(quantities);
      setMaterials(materialsData);

      // Initialize expanded categories
      const expanded: Record<string, boolean> = {};
      CATEGORIES.forEach(c => (expanded[c] = true));
      setExpandedCategories(expanded);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMaterial = async () => {
    if (!newMaterial.name) return alert("Please enter a material name");
    const { error } = await supabase.from("materials").insert([newMaterial]);
    if (error) return alert("Failed to add material");
    setIsAdding(false);
    setNewMaterial({ name: "", quantity_available: 0, category: "Labels" });
    fetchAllData();
  };

  const handleRecordOutflow = async () => {
    if (!outflowForm.material_id || outflowForm.quantity <= 0) {
      return alert("Please fill all required fields");
    }
    const { error } = await supabase.from("material_entries").insert([outflowForm]);
    if (error) return alert("Failed to record outflow");
    setIsOutflowDialogOpen(false);
    setOutflowForm({
      material_id: "",
      action: "Damaged",
      quantity: 0,
      date: new Date().toISOString().split("T")[0],
    });
    fetchAllData();
  };

  const handleRecordOpeningStock = async () => {
    if (!openingStockForm.material_id || openingStockForm.quantity < 0) {
      return alert("Please fill all required fields");
    }

    // Check if opening stock already exists for this material and date
    const { data: existingRecord, error: checkError } = await supabase
      .from("opening_stocks")
      .select("*")
      .eq("material_id", openingStockForm.material_id)
      .eq("date", openingStockForm.date)
      .maybeSingle();

    if (checkError) return alert("Error checking existing records");
    if (existingRecord) return alert("Opening stock already recorded for this material on selected date");

    const { error } = await supabase.from("opening_stocks").insert([openingStockForm]);
    if (error) return alert("Failed to record opening stock");
    setIsOpeningStockDialogOpen(false);
    setOpeningStockForm({
      material_id: "",
      quantity: 0,
      date: new Date().toISOString().split("T")[0],
    });
    fetchAllData();
  };

  const handleDeleteMaterial = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    await supabase.from("material_entries").delete().eq("material_id", id);
    await supabase.from("opening_stocks").delete().eq("material_id", id);
    await supabase.from("materials").delete().eq("id", id);
    fetchAllData();
  };

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const getMaterialsByCategory = (cat: string) =>
    materials.filter(m => m.category === cat);

  const getMaterialTransactions = (materialId: string) => {
    return allTransactions.filter(t => t.material_id === materialId);
  };

  const getCategoryTransactions = (category: string) => {
    const categoryMaterials = materials.filter(m => m.category === category);
    return allTransactions.filter(t => 
      categoryMaterials.some(m => m.id === t.material_id)
    );
  };

  const calculateOpeningStock = (materialId: string, date: string) => {
    // Find the most recent opening stock before the given date
    const previousOpeningStocks = openingStocks
      .filter(record => record.material_id === materialId && record.date < date)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    const mostRecentOpeningStock = previousOpeningStocks[0]?.quantity || 0;
    const mostRecentOpeningStockDate = previousOpeningStocks[0]?.date || "";

    // Get all transactions between the most recent opening stock date and the target date
    const relevantTransactions = allTransactions.filter(t => 
      t.material_id === materialId && 
      t.date >= mostRecentOpeningStockDate && 
      t.date < date
    );

    const totalInflow = relevantTransactions
      .filter(t => t.type === "inflow")
      .reduce((sum, t) => sum + (t.quantity || 0), 0);
    
    const totalOutflow = relevantTransactions
      .filter(t => t.type === "outflow")
      .reduce((sum, t) => sum + (t.quantity || 0), 0);

    return mostRecentOpeningStock + totalInflow - totalOutflow;
  };

  const viewHistoryForDate = async () => {
    setIsHistoryDialogOpen(true);
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Materials Inventory</h1>

      <div className="mb-6 flex justify-between items-center">
        <span>Total Materials: {materials.length}</span>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => viewHistoryForDate()}>
            View Opening Stock History
          </Button>
        </div>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {CATEGORIES.map(cat => {
              const catMats = getMaterialsByCategory(cat);
              if (!catMats.length) return null;
              return (
                <>
                  <TableRow key={`${cat}-header`} onClick={() => toggleCategory(cat)} className="cursor-pointer">
                    <TableCell className="font-bold flex items-center">
                      {expandedCategories[cat] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      {cat}
                    </TableCell>
                    <TableCell className="text-right">
                      {catMats.reduce((sum, m) => sum + (materialQuantities[m.id] || 0), 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={e => {
                          e.stopPropagation();
                          setViewMaterial({ id: cat, name: cat, category: cat, quantity_available: 0 });
                          setIsViewDetailsOpen(true);
                        }}
                      >
                        View All
                      </Button>
                    </TableCell>
                  </TableRow>
                  {expandedCategories[cat] &&
                    catMats.map(mat => (
                      <TableRow key={mat.id} className="bg-gray-50">
                        <TableCell className="pl-8">{mat.name}</TableCell>
                        <TableCell className="text-right">{materialQuantities[mat.id] || 0}</TableCell>
                        <TableCell className="text-right flex justify-end gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewMaterial(mat);
                              setIsViewDetailsOpen(true);
                            }}
                          >
                            Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                </>
              );
            })}
          </TableBody>
        </Table>
      )}

      {/* Add Material Dialog */}
      <Dialog open={isAdding} onOpenChange={setIsAdding}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Material</DialogTitle></DialogHeader>
          <Input placeholder="Material Name" value={newMaterial.name} onChange={e => setNewMaterial({ ...newMaterial, name: e.target.value })} />
          <Select value={newMaterial.category} onValueChange={v => setNewMaterial({ ...newMaterial, category: v as Material["category"] })}>
            <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAdding(false)}>Cancel</Button>
            <Button onClick={handleAddMaterial}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={isViewDetailsOpen} onOpenChange={setIsViewDetailsOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {viewMaterial?.id === viewMaterial?.category ? 
                `All ${viewMaterial?.category} Transactions` : 
                `${viewMaterial?.name} Details`}
            </DialogTitle>
            <DialogDescription>
              {viewMaterial?.id === viewMaterial?.category ? 
                `Showing all transactions for ${viewMaterial?.category} category` : 
                `Showing details for ${viewMaterial?.name}`}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Transaction</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(viewMaterial?.id === viewMaterial?.category ? 
                  getCategoryTransactions(viewMaterial?.category || "") : 
                  getMaterialTransactions(viewMaterial?.id || ""))
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
                      <TableCell className="capitalize">{transaction.type.replace("_", " ")}</TableCell>
                      <TableCell>{transaction.quantity}</TableCell>
                      <TableCell>{transaction.action}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
          <DialogFooter className="gap-2">
            <Button onClick={() => setIsViewDetailsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Opening Stock Dialog */}
      <Dialog open={isOpeningStockDialogOpen} onOpenChange={setIsOpeningStockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Opening Stock</DialogTitle>
            <DialogDescription>
              Record the opening stock quantity for a material on a specific date
            </DialogDescription>
          </DialogHeader>
          <Select 
            value={openingStockForm.material_id}
            onValueChange={v => setOpeningStockForm({ ...openingStockForm, material_id: v })}
            disabled={!!viewMaterial?.id && viewMaterial.id !== viewMaterial.category}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Material" />
            </SelectTrigger>
            <SelectContent>
              {materials.map(material => (
                <SelectItem key={material.id} value={material.id}>{material.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input 
            type="number" 
            placeholder="Quantity" 
            value={openingStockForm.quantity} 
            onChange={e => setOpeningStockForm({ ...openingStockForm, quantity: Number(e.target.value) })} 
          />
          <Input 
            type="date" 
            value={openingStockForm.date} 
            onChange={e => setOpeningStockForm({ ...openingStockForm, date: e.target.value })} 
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpeningStockDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleRecordOpeningStock}>Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Outflow Dialog */}
      <Dialog open={isOutflowDialogOpen} onOpenChange={setIsOutflowDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Outflow</DialogTitle></DialogHeader>
          <Select 
            value={outflowForm.material_id}
            onValueChange={v => setOutflowForm({ ...outflowForm, material_id: v })}
            disabled={!!viewMaterial?.id && viewMaterial.id !== viewMaterial.category}
          >
            <SelectTrigger><SelectValue placeholder="Select Material" /></SelectTrigger>
            <SelectContent>
              {materials.map(material => (
                <SelectItem key={material.id} value={material.id}>{material.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={outflowForm.action} onValueChange={v => setOutflowForm({ ...outflowForm, action: v as OutflowFormData["action"] })}>
            <SelectTrigger><SelectValue placeholder="Action" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Damaged">Damaged</SelectItem>
              <SelectItem value="Used in production">Used in production</SelectItem>
            </SelectContent>
          </Select>
          <Input 
            type="number" 
            placeholder="Quantity" 
            value={outflowForm.quantity} 
            onChange={e => setOutflowForm({ ...outflowForm, quantity: Number(e.target.value) })} 
          />
          <Input 
            type="date" 
            value={outflowForm.date} 
            onChange={e => setOutflowForm({ ...outflowForm, date: e.target.value })} 
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOutflowDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleRecordOutflow}>Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Opening Stock History Dialog */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Opening Stock History</DialogTitle>
            <DialogDescription>
              View opening stock records by date
            </DialogDescription>
          </DialogHeader>
          <div className="mb-4">
            <Input 
              type="date" 
              value={selectedHistoryDate.toISOString().split('T')[0]}
              onChange={e => setSelectedHistoryDate(new Date(e.target.value))}
            />
            <Button 
              className="mt-2"
              onClick={() => viewHistoryForDate()}
            >
              View Records
            </Button>
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Opening Stock</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materials.map(material => {
                  const dateKey = selectedHistoryDate.toISOString().split("T")[0];
                  const record = openingStocks.find(
                    r => r.material_id === material.id && r.date === dateKey
                  );
                  const calculatedStock = calculateOpeningStock(material.id, dateKey);
                  
                  return (
                    <TableRow key={material.id}>
                      <TableCell>{material.name}</TableCell>
                      <TableCell>{material.category}</TableCell>
                      <TableCell className="text-right">
                        {record ? record.quantity : calculatedStock}
                        {!record && " (calculated)"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsHistoryDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MaterialsPage;
