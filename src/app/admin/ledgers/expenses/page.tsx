'use client';
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { sub } from "date-fns";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Define types
type Expense = {
  id: string;
  item: string;
  amount_spent: number;
  department: string;
  mode_of_payment: string;
  account: string | null;
  submittedby: string;
  date: string;
};

type GroupedExpenses = Record<string, Expense[]>;

type ItemTotal = {
  item: string;
  total: number;
  entries: Expense[];
};

type FormData = {
  item: string;
  customItem: string;
  amount_spent: number;
  department: string;
  mode_of_payment: string;
  account: string;
};

const EXPENSE_CATEGORIES = [
  "Vehicle",
  "Machinery",
  "Transport",
  "Allowance",
  "Field",
  "Construction",
  "Drawings",
  "Food",
  "Hires"
];

export default function ExpensesLedgerPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [balanceForward, setBalanceForward] = useState(0);
  const [filter, setFilter] = useState<"daily" | "monthly" | "yearly" | "all" | "custom">("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [formData, setFormData] = useState<FormData>({
    item: "",
    customItem: "",
    amount_spent: 0,
    department: "",
    mode_of_payment: "",
    account: "",
  });
  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [modes, setModes] = useState<string[]>([]);
  const [subModes, setSubModes] = useState<string[]>([]);
  const [existingItems, setExistingItems] = useState<string[]>([]);
  const [showNotice, setShowNotice] = useState(true);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [selectedItemDetails, setSelectedItemDetails] = useState<Expense[] | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    fetchExpenses(filter);
    fetchTotalIncome();
    fetchModes();
    fetchBalanceForward();
    fetchExistingItems();
  }, [filter, customStartDate, customEndDate]);

  const fetchExistingItems = async () => {
    const { data, error } = await supabase
      .from("expenses")
      .select("item");
    
    if (error) {
      console.error("Error fetching existing items:", error);
      return;
    }
    
    if (data) {
      const uniqueItems = Array.from(new Set(data.map((item: { item: string }) => item.item)));
      setExistingItems(uniqueItems);
    }
  };

  const fetchBalanceForward = async () => {
    const { data: financeData, error: financeError } = await supabase
      .from("finance")
      .select("amount_available");

    if (financeError) {
      alert("Error fetching finance data: " + financeError.message);
      return;
    }

    const totalAmountAvailable = financeData?.reduce((sum: number, entry: { amount_available: number }) => 
      sum + (entry.amount_available || 0), 0) || 0;

    const { data: expensesData, error: expensesError } = await supabase
      .from("expenses")
      .select("amount_spent");

    if (expensesError) {
      alert("Error fetching expenses: " + expensesError.message);
      return;
    }

    const totalExpenses = expensesData?.reduce((sum: number, entry: { amount_spent: number }) => 
      sum + (entry.amount_spent || 0), 0) || 0;

    const balance = totalAmountAvailable - totalExpenses;
    setBalanceForward(balance);
  };

  const fetchModes = async () => {
    const { data, error } = await supabase
      .from("finance")
      .select("mode_of_payment");

    if (error) {
      alert("Error fetching modes of payment: " + error.message);
      return;
    }

    if (data) {
      const uniqueModes = Array.from(new Set(data.map((entry: { mode_of_payment: string }) => entry.mode_of_payment)));
      setModes(uniqueModes);
    }
  };

  const fetchSubModes = async (mode: string) => {
    if (mode === "cash") {
      setSubModes([]);
      return;
    }

    const column = mode === "Bank" ? "bank_name" : "mode_of_mobilemoney";
    const { data, error } = await supabase
      .from("finance")
      .select(column)
      .eq("mode_of_payment", mode);

    if (error) {
      alert("Error fetching submodes: " + error.message);
      return;
    }

    if (data) {
      const uniqueSubModes = Array.from(
        new Set(data.map((entry: any) => entry[column]))
      ).filter((subMode): subMode is string => !!subMode);
      setSubModes(uniqueSubModes);
    }
  };

  const fetchExpenses = async (filterType: "daily" | "monthly" | "yearly" | "all" | "custom") => {
    setLoading(true);
    const now = new Date();
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    switch (filterType) {
      case "daily":
        startDate = new Date(now.setHours(0, 0, 0, 0));
        endDate = new Date(now.setHours(23, 59, 59, 999));
        break;
      case "monthly":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      case "yearly":
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        break;
      case "custom":
        if (customStartDate && customEndDate) {
          startDate = new Date(customStartDate);
          endDate = new Date(customEndDate);
          endDate.setHours(23, 59, 59, 999); // Include the entire end day
        }
        break;
      default: // "all"
        break;
    }

    let query = supabase.from("expenses").select("*").order('date', {ascending: false});

    if (startDate && endDate) {
      query = query.gte("date", startDate.toISOString()).lte("date", endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      alert("Error fetching expenses: " + error.message);
      setLoading(false);
      return;
    }

    setExpenses(data as Expense[] || []);
    calculateTotalExpenses(data as Expense[] || []);
    setLoading(false);
  };

  const fetchTotalIncome = async () => {
    const { data, error } = await supabase
      .from("finance")
      .select("amount_paid");

    if (error) {
      alert("Error fetching total income: " + error.message);
      return;
    }

    const total = data?.reduce((sum: number, entry: { amount_paid: number }) => 
      sum + (entry.amount_paid || 0), 0) || 0;
    setTotalIncome(total);
  };

  const calculateTotalExpenses = (data: Expense[]) => {
    const total = data.reduce((sum, entry) => sum + (entry.amount_spent || 0), 0);
    setTotalExpenses(total);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === "mode_of_payment") {
      fetchSubModes(value);
      setFormData(prev => ({ ...prev, account: "" }));
    }

    if (name === "item") {
      setShowCustomInput(value === "Other");
    }
  };

  const submitExpense = async () => {
    const finalItem = formData.item === "Other" ? formData.customItem : formData.item;
    
    if (!finalItem || !formData.amount_spent || !formData.department || !formData.mode_of_payment) {
      alert("Please fill in all required fields.");
      return;
    }

    const expenseData = {
      item: finalItem,
      amount_spent: formData.amount_spent,
      department: formData.department,
      mode_of_payment: formData.mode_of_payment,
      account: formData.account,
      submittedby: "You",
    };

    const { error } = editExpense
      ? await supabase
          .from("expenses")
          .update(expenseData)
          .eq("id", editExpense.id)
      : await supabase.from("expenses").insert([expenseData]);

    if (error) {
      alert("Error submitting expense: " + error.message);
      return;
    }

    alert("Expense successfully submitted!");
    fetchExpenses(filter);
    fetchBalanceForward();
    fetchExistingItems();
    setFormData({ 
      item: "", 
      customItem: "", 
      amount_spent: 0, 
      department: "", 
      mode_of_payment: "", 
      account: "" 
    });
    setEditExpense(null);
    setShowCustomInput(false);
  };

  const handleEdit = (expense: Expense) => {
    setEditExpense(expense);
    const isExistingItem = existingItems.includes(expense.item) || EXPENSE_CATEGORIES.includes(expense.item);
    setFormData({
      item: isExistingItem ? expense.item : "Other",
      customItem: isExistingItem ? "" : expense.item,
      amount_spent: expense.amount_spent,
      department: expense.department,
      mode_of_payment: expense.mode_of_payment,
      account: expense.account || "",
    });
    setShowCustomInput(!isExistingItem);
    fetchSubModes(expense.mode_of_payment);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this expense?")) {
      const { error } = await supabase.from("expenses").delete().eq("id", id);

      if (error) {
        alert("Error deleting expense: " + error.message);
        return;
      }

      alert("Expense successfully deleted!");
      fetchExpenses(filter);
      fetchBalanceForward();
      fetchExistingItems();
    }
  };

  const exportToCSV = () => {
    const csvData = expenses.map((expense) => ({
      Item: expense.item,
      "Amount Spent": expense.amount_spent,
      Department: expense.department,
      "Mode of Payment": expense.mode_of_payment,
      Account: expense.account,
      Createdby: expense.submittedby,
      Date: new Date(expense.date).toLocaleDateString(),
    }));

    const csvHeaders = Object.keys(csvData[0]).join(",") + "\n";
    const csvRows = csvData
      .map((row) => Object.values(row).join(","))
      .join("\n");

    const csvBlob = new Blob([csvHeaders + csvRows], { type: "text/csv;charset=utf-8" });
    
    const link = document.createElement("a");
    link.href = URL.createObjectURL(csvBlob);
    link.download = `expenses_${filter}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const groupedExpenses = expenses.reduce((acc: GroupedExpenses, expense) => {
    if (!acc[expense.item]) {
      acc[expense.item] = [];
    }
    acc[expense.item].push(expense);
    return acc;
  }, {});

  const itemTotals: ItemTotal[] = Object.entries(groupedExpenses).map(([item, entries]) => ({
    item,
    total: entries.reduce((sum, entry) => sum + (entry.amount_spent || 0), 0),
    entries
  }));

  const showItemDetails = (entries: Expense[]) => {
    setSelectedItemDetails(entries);
    setShowDetailsModal(true);
  };

  const handleApplyCustomDate = () => {
    if (!customStartDate || !customEndDate) {
      alert("Please select both start and end dates");
      return;
    }
    if (new Date(customStartDate) > new Date(customEndDate)) {
      alert("End date must be after start date");
      return;
    }
    fetchExpenses("custom");
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Modern header with gradient */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-red-600 to-orange-500 bg-clip-text text-transparent">
          Expenses Ledger
        </h1>
        <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Track and manage all company expenditures
        </p>
      </div>

      {/* Financial summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 shadow-md text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Total Income</h2>
              <p className="text-2xl font-bold">UGX {totalIncome.toLocaleString()}</p>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg p-4 shadow-md text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Total Expenses</h2>
              <p className="text-2xl font-bold">UGX {totalExpenses.toLocaleString()}</p>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
            </svg>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 shadow-md text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Balance Forward</h2>
              <p className="text-2xl font-bold">UGX {balanceForward.toLocaleString()}</p>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Filters and Export Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === "all" 
                ? "bg-blue-600 text-white shadow-md" 
                : "bg-gray-100 hover:bg-gray-200 text-gray-700"
            }`}
          >
            All Expenses
          </button>
          <button
            onClick={() => setFilter("daily")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === "daily" 
                ? "bg-blue-600 text-white shadow-md" 
                : "bg-gray-100 hover:bg-gray-200 text-gray-700"
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setFilter("monthly")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === "monthly" 
                ? "bg-blue-600 text-white shadow-md" 
                : "bg-gray-100 hover:bg-gray-200 text-gray-700"
            }`}
          >
            This Month
          </button>
          <button
            onClick={() => setFilter("yearly")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === "yearly" 
                ? "bg-blue-600 text-white shadow-md" 
                : "bg-gray-100 hover:bg-gray-200 text-gray-700"
            }`}
          >
            This Year
          </button>
          <button
            onClick={() => setFilter("custom")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === "custom" 
                ? "bg-blue-600 text-white shadow-md" 
                : "bg-gray-100 hover:bg-gray-200 text-gray-700"
            }`}
          >
            Custom Range
          </button>
        </div>
        <button
          onClick={exportToCSV}
          className="px-4 py-2 rounded-full bg-gradient-to-r from-green-500 to-green-600 text-white text-sm font-medium shadow-md hover:shadow-lg transition-all flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download CSV
        </button>
      </div>

      {/* Custom Date Range Picker (shown only when custom filter is selected) */}
      {filter === "custom" && (
        <div className="flex flex-col sm:flex-row gap-4 mb-6 items-center bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center gap-2">
            <label className="whitespace-nowrap font-medium">From:</label>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="whitespace-nowrap font-medium">To:</label>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleApplyCustomDate}
            disabled={!customStartDate || !customEndDate}
            className={`px-4 py-2 rounded-md ${
              !customStartDate || !customEndDate
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            } transition-colors`}
          >
            Apply Date Range
          </button>
        </div>
      )}

      {/* Expenses Summary Table */}
      {loading ? (
        <div className="flex justify-center items-center h-64 rounded-lg bg-gray-50 border border-gray-100">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-600">Loading expense data...</p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr className="text-left border-b border-gray-200">
                  <th className="p-4 font-medium text-gray-500">Item/Reason</th>
                  <th className="p-4 font-medium text-gray-500 text-right">Total Amount</th>
                  <th className="p-4 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {itemTotals.map(({ item, total, entries }) => (
                  <tr key={item} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-medium">{item}</td>
                    <td className="p-4 text-right font-mono text-red-600">
                      UGX {total.toLocaleString()}
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => showItemDetails(entries)}
                        className="px-3 py-1 bg-blue-100 text-blue-600 rounded-md hover:bg-blue-200 transition-colors text-sm"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {expenses.length === 0 && !loading && (
            <div className="p-8 text-center text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-lg">No expenses found</p>
              <p className="text-sm mt-1">Try adjusting your filters or add a new expense</p>
            </div>
          )}
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Expense Details</h3>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-3 text-sm font-medium text-gray-600 text-left">Amount</th>
                      <th className="p-3 text-sm font-medium text-gray-600 text-left">Department</th>
                      <th className="p-3 text-sm font-medium text-gray-600 text-left">Source Account</th>
                      <th className="p-3 text-sm font-medium text-gray-600 text-left">Details</th>
                      <th className="p-3 text-sm font-medium text-gray-600 text-left">Added By</th>
                      <th className="p-3 text-sm font-medium text-gray-600 text-left">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {selectedItemDetails?.map((expense) => (
                      <tr key={expense.id} className="hover:bg-gray-50">
                        <td className="p-3 text-sm font-mono text-red-600">
                          UGX {expense.amount_spent?.toLocaleString()}
                        </td>
                        <td className="p-3 text-sm">{expense.department}</td>
                        <td className="p-3 text-sm">{expense.mode_of_payment}</td>
                        <td className="p-3 text-sm">{expense.account || 'N/A'}</td>
                        <td className="p-3 text-sm">{expense.submittedby}</td>
                        <td className="p-3 text-sm text-gray-500">
                          {new Date(expense.date).toLocaleDateString()}
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
    </div>
  );
}
