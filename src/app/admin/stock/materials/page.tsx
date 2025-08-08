"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Material {
  id: string;
  name: string;
  quantity_available: number;
}

interface MaterialEntry {
  id: string;
  material_id: string;
  quantity: number;
  action: string;
  date: string;
  created_at: string;
}

interface SupplyItem {
  id: string;
  name: string;
  quantity: number;
  created_at: string;
}

interface MaterialTransaction {
  id: string;
  date: string;
  type: "inflow" | "outflow";
  quantity: number;
  action: string;
  material_id: string;
  material_name: string;
}

interface OutflowFormData {
  material_id: string;
  action: "Damaged" | "Sold" | "Used in production";
  quantity: number;
  date: string;
}

const MaterialsPage = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isViewDetailsOpen, setIsViewDetailsOpen] = useState(false);
  const [isOutflowDialogOpen, setIsOutflowDialogOpen] = useState(false);
  const [viewMaterial, setViewMaterial] = useState<Material | null>(null);
  const [allTransactions, setAllTransactions] = useState<MaterialTransaction[]>([]);
  const [materialQuantities, setMaterialQuantities] = useState<Record<string, number>>({});
  const [newMaterial, setNewMaterial] = useState<Omit<Material, "id">>({
    name: "",
    quantity_available: 0,
  });
  const [outflowForm, setOutflowForm] = useState<OutflowFormData>({
    material_id: "",
    action: "Damaged",
    quantity: 0,
    date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    if (viewMaterial) {
      fetchMaterialTransactions(viewMaterial.id);
    }
  }, [viewMaterial]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // Fetch materials
      const { data: materialsData, error: materialsError } = await supabase
        .from("materials")
        .select("id, name, quantity_available")
        .order("name", { ascending: true });

      if (materialsError) throw materialsError;

      // Fetch all supply items (inflows)
      const { data: supplyItems, error: supplyItemsError } = await supabase
        .from("supply_items")
        .select("id, name, quantity, created_at");

      if (supplyItemsError) throw supplyItemsError;

      // Fetch all material entries (outflows)
      const { data: outflows, error: outflowError } = await supabase
        .from("material_entries")
        .select("id, material_id, quantity, action, date, created_at");

      if (outflowError) throw outflowError;

      // Combine all transactions
      const inflowTransactions: MaterialTransaction[] = (supplyItems || []).map((item) => ({
        id: item.id,
        date: new Date(item.created_at).toLocaleDateString(),
        type: "inflow",
        quantity: item.quantity,
        action: "Purchased",
        material_id: materialsData?.find(m => m.name === item.name)?.id || "",
        material_name: item.name,
      }));

      const outflowTransactions: MaterialTransaction[] = (outflows || []).map((entry) => ({
        id: entry.id,
        date: new Date(entry.date).toLocaleDateString(),
        type: "outflow",
        quantity: entry.quantity,
        action: entry.action,
        material_id: entry.material_id,
        material_name: materialsData?.find(m => m.id === entry.material_id)?.name || "",
      }));

      const combinedTransactions = [...inflowTransactions, ...outflowTransactions];
      setAllTransactions(combinedTransactions);

      // Calculate quantities for each material
      const quantities: Record<string, number> = {};
      materialsData?.forEach(material => {
        const materialTransactions = combinedTransactions.filter(
          t => t.material_id === material.id
        );
        const totalInflow = materialTransactions
          .filter(t => t.type === "inflow")
          .reduce((sum, t) => sum + t.quantity, 0);
        const totalOutflow = materialTransactions
          .filter(t => t.type === "outflow")
          .reduce((sum, t) => sum + t.quantity, 0);
        quantities[material.id] = totalInflow - totalOutflow;
      });

      setMaterialQuantities(quantities);
      setMaterials(materialsData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMaterialTransactions = async (materialId: string) => {
    if (!viewMaterial) return;

    const materialTransactions = allTransactions.filter(
      t => t.material_id === materialId
    );

    // Sort by date (newest first)
    const sortedTransactions = [...materialTransactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return sortedTransactions;
  };

  const handleAddMaterial = async () => {
    if (!newMaterial.name) {
      alert("Please enter a material name");
      return;
    }

    const { data, error } = await supabase
      .from("materials")
      .insert([newMaterial])
      .select();

    if (error) {
      console.error("Error adding material:", error);
      alert("Failed to add material");
      return;
    }

    if (data?.[0]) {
      setMaterials([...materials, data[0]]);
      setIsAdding(false);
      setNewMaterial({ name: "", quantity_available: 0 });
      fetchAllData(); // Refresh all data to include the new material
    }
  };

  const handleRecordOutflow = async () => {
    if (!outflowForm.material_id || outflowForm.quantity <= 0) {
      alert("Please fill all required fields");
      return;
    }

    const { error } = await supabase.from("material_entries").insert([
      {
        material_id: outflowForm.material_id,
        quantity: outflowForm.quantity,
        action: outflowForm.action,
        date: outflowForm.date,
      },
    ]);

    if (error) {
      console.error("Error recording outflow:", error);
      alert("Failed to record outflow");
      return;
    }

    // Refresh all data to update quantities
    fetchAllData();
    setIsOutflowDialogOpen(false);
    setOutflowForm({
      material_id: "",
      action: "Damaged",
      quantity: 0,
      date: new Date().toISOString().split("T")[0],
    });
  };

  const handleDeleteMaterial = async (id: string) => {
    if (!confirm("Are you sure you want to delete this material?")) return;

    // First delete related entries
    await supabase.from("material_entries").delete().eq("material_id", id);

    // Then delete the material
    const { error } = await supabase.from("materials").delete().eq("id", id);

    if (error) {
      console.error("Error deleting material:", error);
      alert("Failed to delete material");
      return;
    }

    setMaterials(materials.filter((m) => m.id !== id));
    fetchAllData(); // Refresh data after deletion
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Materials Inventory</h1>

      <div className="mb-6 flex justify-between items-center">
        <div className="text-gray-600">
          Total Materials: {materials.length}
        </div>
        <Button onClick={() => setIsAdding(false)}>All Materials</Button>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading materials...</div>
      ) : (
        <Table className="border rounded-lg">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Quantity Available</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {materials.length > 0 ? (
              materials.map((material) => (
                <TableRow key={material.id}>
                  <TableCell>{material.name}</TableCell>
                  <TableCell className="text-right">
                    {materialQuantities[material.id] || 0}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setViewMaterial(material);
                        setIsViewDetailsOpen(true);
                      }}
                    >
                      Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-4">
                  No materials found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
      {/* Material Details Dialog */}
      <Dialog open={isViewDetailsOpen} onOpenChange={setIsViewDetailsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Transactions for {viewMaterial?.name}
            </DialogTitle>
            <DialogDescription>
              Quantity Available: {materialQuantities[viewMaterial?.id || ""] || 0}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[500px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allTransactions.filter(t => t.material_id === viewMaterial?.id).length > 0 ? (
                  allTransactions
                    .filter(t => t.material_id === viewMaterial?.id)
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>{transaction.date}</TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded ${
                              transaction.type === "inflow"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {transaction.type}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {transaction.quantity}
                        </TableCell>
                        <TableCell>{transaction.action}</TableCell>
                      </TableRow>
                    ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-4">
                      No transactions found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MaterialsPage;
