"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { saveAs } from "file-saver";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function GeneralLedgerPage() {
  const [ledger, setLedger] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [groupedExpenses, setGroupedExpenses] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(false);
  const [expensesLoading, setExpensesLoading] = useState(false);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalPayments, setTotalPayments] = useState(0);
  const [outstandingBalance, setOutstandingBalance] = useState(0);
  const [netProfit, setNetProfit] = useState(0);
  const [filter, setFilter] = useState<"daily" | "monthly" | "yearly" | "all">("all");
  const [expensesFilter, setExpensesFilter] = useState<"daily" | "monthly" | "yearly" | "all">("all");
  const [showIncomeStatement, setShowIncomeStatement] = useState(false);
  const [incomeData, setIncomeData] = useState<any[]>([]);
  const [expenseData, setExpenseData] = useState<any[]>([]);
  const [statementFilter, setStatementFilter] = useState<"daily" | "weekly" | "monthly" | "yearly" | "custom">("monthly");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [selectedItemDetails, setSelectedItemDetails] = useState<any[]>([]);
  const [showItemDetails, setShowItemDetails] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  useEffect(() => {
    fetchGeneralLedger(filter);
    fetchExpensesLedger(expensesFilter);
    fetchNetProfit();
  }, [filter, expensesFilter]);

  const fetchNetProfit = async () => {
    try {
      const { data: financeData, error: financeError } = await supabase
        .from("finance")
        .select("amount_available");

      const { data: expenseData, error: expenseError } = await supabase
        .from("expenses")
        .select("amount_spent");

      if (financeError || expenseError) {
        console.error("Error fetching data:", financeError || expenseError);
        return;
      }

      const totalAvailable = (financeData || []).reduce((sum, entry) => sum + (entry.amount_available || 0), 0);
      const totalExpenses = (expenseData || []).reduce((sum, entry) => sum + (entry.amount_spent || 0), 0);
      const calculatedNetProfit = totalAvailable - totalExpenses;

      setNetProfit(calculatedNetProfit);
    } catch (error) {
      console.error("Error calculating net profit:", error);
    }
  };

  const fetchGeneralLedger = async (filterType: "daily" | "monthly" | "yearly" | "all") => {
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
      default:
        startDate = null;
        endDate = null;
        break;
    }

    let query = supabase
      .from("finance")
      .select(`
        id,
        order_id,
        total_amount,
        amount_paid,
        amount_available,
        balance,
        created_at,
        users (
          name
        )
      `).not("order_id", "is", null);

    if (startDate && endDate) {
      query = query.gte("created_at", startDate.toISOString()).lte("created_at", endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      alert("Error fetching general ledger: " + error.message);
      setLoading(false);
      return;
    }

    setLedger(data || []);
    calculateFinancials(data || []);
    setLoading(false);
  };

  const fetchExpensesLedger = async (filterType: "daily" | "monthly" | "yearly" | "all") => {
    setExpensesLoading(true);
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
      default:
        startDate = null;
        endDate = null;
        break;
    }

    let query = supabase
      .from("expenses")
      .select(`
        id,
        item,
        amount_spent,
        department,
        mode_of_payment,
        account,
        submittedby,
        date
      `).order("date", { ascending: false });

    if (startDate && endDate) {
      query = query.gte("date", startDate.toISOString()).lte("date", endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      alert("Error fetching expenses ledger: " + error.message);
      setExpensesLoading(false);
      return;
    }

    setExpenses(data || []);
    
    // Group expenses by item
    const grouped = (data || []).reduce((acc, expense) => {
      const item = expense.item || 'Uncategorized';
      if (!acc[item]) {
        acc[item] = [];
      }
      acc[item].push(expense);
      return acc;
    }, {});

    setGroupedExpenses(grouped);
    setExpensesLoading(false);
  };

  const calculateFinancials = (data: any[]) => {
    let totalRevenue = 0;
    let totalPayments = 0;
    let outstandingBalance = 0;

    data.forEach((entry) => {
      totalRevenue += entry.total_amount || 0;
      totalPayments += entry.amount_paid || 0;
      outstandingBalance += entry.balance || 0;
    });

    setTotalRevenue(totalRevenue);
    setTotalPayments(totalPayments);
    setOutstandingBalance(outstandingBalance);
  };

  const fetchIncomeStatementData = async () => {
    setLoading(true);
    
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (statementFilter) {
      case "daily":
        startDate = new Date(now.setHours(0, 0, 0, 0));
        endDate = new Date(now.setHours(23, 59, 59, 999));
        break;
      case "weekly":
        startDate = new Date(now.setDate(now.getDate() - now.getDay()));
        endDate = new Date(now.setDate(now.getDate() - now.getDay() + 6));
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
        if (!customStartDate || !customEndDate) {
          alert("Please select both start and end dates");
          setLoading(false);
          return;
        }
        startDate = new Date(customStartDate);
        endDate = new Date(customEndDate);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    const { data: incomeData, error: incomeError } = await supabase
      .from("finance")
      .select("amount_paid, amount_available, created_at, mode_of_payment, submittedby,total_amount,purpose")
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString()).order("created_at",{ascending:false});

    if (incomeError) {
      alert("Error fetching income data: " + incomeError.message);
      setLoading(false);
      return;
    }

    const { data: expenseData, error: expenseError } = await supabase
      .from("expenses")
      .select("item, amount_spent, date, department, submittedby")
      .gte("date", startDate.toISOString())
      .lte("date", endDate.toISOString()).order("date",{ascending:false});

    if (expenseError) {
      alert("Error fetching expense data: " + expenseError.message);
      setLoading(false);
      return;
    }

    setIncomeData(incomeData || []);
    setExpenseData(expenseData || []);
    setLoading(false);
  };

  const calculateProfitLoss = () => {
    const totalIncome = incomeData.reduce((sum, item) => sum + (item.total_amount || 0), 0);
    const totalProfit = incomeData.reduce((sum, item) => sum + (item.amount_available || 0), 0);
    const totalExpenses = expenseData.reduce((sum, item) => sum + (item.amount_spent || 0), 0);
    
    const lossEntries = ledger.filter(entry => 
      entry.total_amount !== null && 
      entry.total_amount !== undefined &&
      (entry.total_amount || 0) > (entry.amount_paid || 0)
    );
    
    const totalPotentialLoss = lossEntries.reduce((sum, entry) => {
      return sum + ((entry.total_amount || 0) - (entry.amount_paid || 0));
    }, 0);
    
    const calculatedNetProfit = totalProfit - totalExpenses;
    
    return { 
      totalIncome,
      totalProfit,
      totalExpenses,
      totalPotentialLoss,
      netProfit: calculatedNetProfit > 0 ? calculatedNetProfit : 0,
      netLoss: calculatedNetProfit < 0 ? Math.abs(calculatedNetProfit) : 0
    };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const exportIncomeStatementToCSV = () => {
    const { 
      totalIncome, 
      totalProfit, 
      totalExpenses, 
      totalPotentialLoss,
      netProfit,
      netLoss 
    } = calculateProfitLoss();
    
    const incomeRows = incomeData.map((item) => ({
      "Type": "Income",
      "Description": `Deposit via ${item.mode_of_payment}`,
      "Amount Paid": item.amount_paid,
      "Amount Available": item.amount_available,
      "Date": new Date(item.created_at).toLocaleDateString(),
      "Submitted By": item.submittedby,
      "Purpose":item.purpose
    }));

    const expenseRows = expenseData.map((item) => ({
      "Type": "Expense",
      "Description": item.item,
      "Amount": -item.amount_spent,
      "Date": new Date(item.date).toLocaleDateString(),
      "Department": item.department,
      "Issued By": item.submittedby
    }));

    const lossRows = ledger
      .filter(entry => 
        entry.total_amount !== null && 
        entry.total_amount !== undefined &&
        (entry.total_amount || 0) > (entry.amount_paid || 0)
      )
      .map(entry => ({
        "Type": "Potential Loss",
        "Description": `Order ${entry.order_id}`,
        "Amount": -((entry.total_amount || 0) - (entry.amount_paid || 0)),
        "Date": new Date(entry.created_at).toLocaleDateString(),
        "Submitted By": entry.users?.name || "Unknown"
      }));

    const summaryRows = [
      { "Type": "SUMMARY", "Description": "Total Income (Amount expected from orders)", "Amount": totalIncome, "Date": "", "Department": "" },
      { "Type": "SUMMARY", "Description": "Total Profit (Amount Available)", "Amount": totalProfit, "Date": "", "Department": "" },
      { "Type": "SUMMARY", "Description": "Total Expenses", "Amount": -totalExpenses, "Date": "", "Department": "" },
      { "Type": "SUMMARY", "Description": "Total Potential Loss", "Amount": -totalPotentialLoss, "Date": "", "Department": "" },
      { "Type": "SUMMARY", "Description": "Net Profit", "Amount": netProfit > 0 ? netProfit : "", "Date": "", "Department": "" },
      { "Type": "SUMMARY", "Description": "Net Loss", "Amount": netLoss > 0 ? -netLoss : "", "Date": "", "Department": "" }
    ];

    const csvData = [...incomeRows, ...expenseRows, ...lossRows, ...summaryRows];
    const csvHeaders = Object.keys(csvData[0]).join(",") + "\n";
    const csvRows = csvData.map((row) => Object.values(row).join(",")).join("\n");

    const csvBlob = new Blob([csvHeaders + csvRows], { type: "text/csv;charset=utf-8" });
    saveAs(csvBlob, `income_statement_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const exportToCSV = () => {
    const csvData = ledger.map((entry) => ({
      "Marketer Name": entry.users?.name || "Unknown",
      "Total Order Amount": entry.total_amount,
      "Amount Paid": entry.amount_paid,
      "Balance": entry.balance,
      "Date": new Date(entry.created_at).toLocaleDateString(),
    }));

    const csvHeaders = Object.keys(csvData[0]).join(",") + "\n";
    const csvRows = csvData.map((row) => Object.values(row).join(",")).join("\n");

    const csvBlob = new Blob([csvHeaders + csvRows], { type: "text/csv;charset=utf-8" });
    saveAs(csvBlob, "general_ledger.csv");
  };

  const exportExpensesToCSV = () => {
    const csvData = expenses.map((entry) => ({
      "Item": entry.item,
      "Amount Spent": entry.amount_spent,
      "Department": entry.department,
      "Payment Mode": entry.mode_of_payment,
      "Account": entry.account,
      "Submitted By": entry.submittedby,
      "Date": new Date(entry.date).toLocaleDateString(),
    }));

    const csvHeaders = Object.keys(csvData[0]).join(",") + "\n";
    const csvRows = csvData.map((row) => Object.values(row).join(",")).join("\n");

    const csvBlob = new Blob([csvHeaders + csvRows], { type: "text/csv;charset=utf-8" });
    saveAs(csvBlob, "expenses_ledger.csv");
  };

  const showDetailsForItem = (item: string) => {
    setSelectedItemDetails(groupedExpenses[item] || []);
    setShowItemDetails(true);
  };

  const handleEditExpense = (expense: any) => {
    setEditingExpense(expense);
    setShowEditDialog(true);
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;
    
    try {
      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", id);

      if (error) {
        alert("Error deleting expense: " + error.message);
        return;
      }

      // Refresh expenses
      fetchExpensesLedger(expensesFilter);
      setShowItemDetails(false);
      alert("Expense deleted successfully");
    } catch (error) {
      console.error("Error deleting expense:", error);
      alert("Error deleting expense");
    }
  };

  const handleSaveEdit = async () => {
    if (!editingExpense) return;

    try {
      const { error } = await supabase
        .from("expenses")
        .update(editingExpense)
        .eq("id", editingExpense.id);

      if (error) {
        alert("Error updating expense: " + error.message);
        return;
      }

      // Refresh expenses
      fetchExpensesLedger(expensesFilter);
      setShowEditDialog(false);
      setShowItemDetails(false);
      alert("Expense updated successfully");
    } catch (error) {
      console.error("Error updating expense:", error);
      alert("Error updating expense");
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex items-center gap-3">
          <span className="text-4xl">📒</span>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            General Ledger Dashboard
          </h1>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="bg-green-50 border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <span>💰</span>
              <span>Total Revenue</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-mono font-bold">{formatCurrency(totalRevenue)}</p>
            <p className="text-sm text-gray-500 mt-1">Total sum of all orders made</p>
          </CardContent>
        </Card>
        
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-600">
              <span>💳</span>
              <span>Total Payments</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-mono font-bold">{formatCurrency(totalPayments)}</p>
            <p className="text-sm text-gray-500 mt-1">Total payments made so far</p>
          </CardContent>
        </Card>
        
        <Card className="bg-red-50 border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <span>⚠️</span>
              <span>Outstanding Balance</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-mono font-bold">{formatCurrency(outstandingBalance)}</p>
            <p className="text-sm text-gray-500 mt-1">Amount not submitted</p>
          </CardContent>
        </Card>
        
        <Card className="bg-purple-50 border-purple-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-600">
              <span>🏦</span>
              <span>Account Balance</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-mono font-bold">{formatCurrency(netProfit)}</p>
            <p className="text-sm text-gray-500 mt-1">(Amount available)</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Controls for Marketers Ledger */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
          >
            All Time
          </Button>
          <Button
            variant={filter === "daily" ? "default" : "outline"}
            onClick={() => setFilter("daily")}
          >
            Today
          </Button>
          <Button
            variant={filter === "monthly" ? "default" : "outline"}
            onClick={() => setFilter("monthly")}
          >
            This Month
          </Button>
          <Button
            variant={filter === "yearly" ? "default" : "outline"}
            onClick={() => setFilter("yearly")}
          >
            This Year
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setShowIncomeStatement(true);
              fetchIncomeStatementData();
            }}
            className="flex items-center gap-2"
          >
            <span>📊</span>
            <span>Income Statement</span>
          </Button>
        </div>
        <Button
          onClick={exportToCSV}
          variant="default"
          className="flex items-center gap-2"
        >
          <span>📥</span>
          <span>Download Ledger</span>
        </Button>
      </div>

      {/* Marketers Ledger Table */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Marketers Collections</h2>
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="font-medium">Marketer</TableHead>
                  <TableHead className="font-medium text-right">Total Amount</TableHead>
                  <TableHead className="font-medium text-right">Amount Paid</TableHead>
                  <TableHead className="font-medium text-right">Balance</TableHead>
                  <TableHead className="font-medium">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledger.length > 0 ? (
                  ledger.map((entry) => (
                    <TableRow key={entry.id} className="hover:bg-gray-50">
                      <TableCell>{entry.users?.name || "Unknown"}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(entry.total_amount)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(entry.amount_paid)}</TableCell>
                      <TableCell className="text-right font-mono">
                        {entry.balance > 0 ? (
                          <Badge variant="destructive">{formatCurrency(entry.balance)}</Badge>
                        ) : (
                          <Badge className="bg-green-500">{formatCurrency(entry.balance)}</Badge>
                        )}
                      </TableCell>
                      <TableCell>{new Date(entry.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      No payment records found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Expenses Ledger Section */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h2 className="text-xl font-semibold">Expenses Ledger</h2>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={expensesFilter === "all" ? "default" : "outline"}
              onClick={() => setExpensesFilter("all")}
            >
              All Time
            </Button>
            <Button
              variant={expensesFilter === "daily" ? "default" : "outline"}
              onClick={() => setExpensesFilter("daily")}
            >
              Today
            </Button>
            <Button
              variant={expensesFilter === "monthly" ? "default" : "outline"}
              onClick={() => setExpensesFilter("monthly")}
            >
              This Month
            </Button>
            <Button
              variant={expensesFilter === "yearly" ? "default" : "outline"}
              onClick={() => setExpensesFilter("yearly")}
            >
              This Year
            </Button>
            <Button
              onClick={exportExpensesToCSV}
              variant="default"
              className="flex items-center gap-2"
            >
              <span>📥</span>
              <span>Download Expenses</span>
            </Button>
          </div>
        </div>

        {expensesLoading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="font-medium">Item</TableHead>
                  <TableHead className="font-medium text-right">Total Amount</TableHead>
                  <TableHead className="font-medium">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.keys(groupedExpenses).length > 0 ? (
                  Object.entries(groupedExpenses).map(([item, itemExpenses]) => {
                    const totalAmount = itemExpenses.reduce((sum, expense) => sum + (expense.amount_spent || 0), 0);
                    return (
                      <TableRow key={item} className="hover:bg-gray-50">
                        <TableCell>{item}</TableCell>
                        <TableCell className="text-right font-mono text-red-600">
                          {formatCurrency(totalAmount)}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => showDetailsForItem(item)}
                          >
                            Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                      No expenses found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Item Details Dialog */}
      <Dialog open={showItemDetails} onOpenChange={setShowItemDetails}>
        <DialogContent className="rounded-lg max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>📋</span>
              <span>Expense Details for {selectedItemDetails[0]?.item}</span>
            </DialogTitle>
            <DialogDescription>
              Detailed view of all expenses for this item
            </DialogDescription>
          </DialogHeader>
          
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Payment Mode</TableHead>
                  <TableHead>Submitted By</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedItemDetails.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>{new Date(expense.date).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right font-mono text-red-600">
                      {formatCurrency(expense.amount_spent)}
                    </TableCell>
                    <TableCell>{expense.department}</TableCell>
                    <TableCell>{expense.mode_of_payment}</TableCell>
                    <TableCell>{expense.submittedby}</TableCell>
                    <TableCell className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditExpense(expense)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteExpense(expense.id)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <DialogFooter>
            <Button 
              onClick={() => setShowItemDetails(false)}
              variant="secondary"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Expense Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="rounded-lg max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
            <DialogDescription>
              Update the expense details
            </DialogDescription>
          </DialogHeader>
          
          {editingExpense && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="item" className="text-right">
                  Item
                </label>
                <Input
                  id="item"
                  value={editingExpense.item}
                  onChange={(e) => setEditingExpense({...editingExpense, item: e.target.value})}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="amount" className="text-right">
                  Amount
                </label>
                <Input
                  id="amount"
                  type="number"
                  value={editingExpense.amount_spent}
                  onChange={(e) => setEditingExpense({...editingExpense, amount_spent: Number(e.target.value)})}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="department" className="text-right">
                  Department
                </label>
                <Input
                  id="department"
                  value={editingExpense.department}
                  onChange={(e) => setEditingExpense({...editingExpense, department: e.target.value})}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="paymentMode" className="text-right">
                  Payment Mode
                </label>
                <Input
                  id="paymentMode"
                  value={editingExpense.mode_of_payment}
                  onChange={(e) => setEditingExpense({...editingExpense, mode_of_payment: e.target.value})}
                  className="col-span-3"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              onClick={handleSaveEdit}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Save Changes
            </Button>
            <Button 
              onClick={() => setShowEditDialog(false)}
              variant="secondary"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Income Statement Dialog */}
      <Dialog open={showIncomeStatement} onOpenChange={setShowIncomeStatement}>
        <DialogContent className="rounded-lg max-w-6xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>📊</span>
              <span>Income Statement</span>
            </DialogTitle>
            <DialogDescription>
              Financial overview for selected period
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-wrap gap-4 mb-6 items-center">
            <Select value={statementFilter} onValueChange={(value) => setStatementFilter(value as any)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>

            {statementFilter === "custom" && (
              <div className="flex gap-2 items-center">
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                />
                <span>to</span>
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                />
              </div>
            )}

            <Button
              onClick={fetchIncomeStatementData}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Apply Filter
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-blue-600">Total Income</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-mono font-bold">
                  {formatCurrency(calculateProfitLoss().totalIncome)}
                </p>
                <p className="text-sm text-gray-500 mt-1">Amount expected from orders</p>
              </CardContent>
            </Card>
            
            <Card className="bg-green-50 border-green-200">
              <CardHeader>
                <CardTitle className="text-green-600">Total Profit</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-mono font-bold">
                  {formatCurrency(calculateProfitLoss().totalProfit)}
                </p>
                <p className="text-sm text-gray-500 mt-1">Amount Available</p>
              </CardContent>
            </Card>
            
            <Card className="bg-red-50 border-red-200">
              <CardHeader>
                <CardTitle className="text-red-600">Total Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-mono font-bold">
                  {formatCurrency(calculateProfitLoss().totalExpenses)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Profit/Loss Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Card className={`border ${
              calculateProfitLoss().netProfit > 0 
                ? "bg-green-50 border-green-200" 
                : "bg-gray-50 border-gray-200"
            }`}>
              <CardHeader>
                <CardTitle className="text-green-600">Net Profit</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-mono font-bold">
                  {calculateProfitLoss().netProfit > 0 
                    ? formatCurrency(calculateProfitLoss().netProfit)
                    : "N/A"}
                </p>
              </CardContent>
            </Card>
            
            <Card className={`border ${
              calculateProfitLoss().netLoss > 0 
                ? "bg-red-50 border-red-200" 
                : "bg-gray-50 border-gray-200"
            }`}>
              <CardHeader>
                <CardTitle className="text-red-600">Net Loss</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-mono font-bold">
                  {calculateProfitLoss().netLoss > 0 
                    ? formatCurrency(calculateProfitLoss().netLoss)
                    : "N/A"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Potential Loss Section */}
          {calculateProfitLoss().totalPotentialLoss > 0 && (
            <Card className="mb-6 bg-orange-50 border-orange-200">
              <CardHeader>
                <CardTitle className="text-orange-600">Potential Loss</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-mono font-bold">
                  {formatCurrency(calculateProfitLoss().totalPotentialLoss)}
                </p>
                <p className="text-sm text-orange-500 mt-1">
                  Unpaid balances from orders
                </p>
              </CardContent>
            </Card>
          )}

          {/* Income Table */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-3 text-blue-600">Income</h3>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-blue-50">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Payment Mode</TableHead>
                    <TableHead>Purpose/Reason</TableHead>
                    <TableHead className="text-right">Amount Paid</TableHead>
                    <TableHead className="text-right">Amount Available</TableHead>
                    <TableHead>Submitted By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incomeData.map((item, index) => (
                    <TableRow key={`income-${index}`} className="hover:bg-blue-50">
                      <TableCell>{new Date(item.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.mode_of_payment}</Badge>
                      </TableCell>
                      <TableCell>{item.purpose}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(item.amount_paid)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(item.amount_available)}</TableCell>
                      <TableCell>{item.submittedby}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Expenses Table */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-red-600">Expenses</h3>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-red-50">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Issued By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenseData.map((item, index) => (
                    <TableRow key={`expense-${index}`} className="hover:bg-red-50">
                      <TableCell>{new Date(item.date).toLocaleDateString()}</TableCell>
                      <TableCell>{item.item}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(item.amount_spent)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.department}</Badge>
                      </TableCell>
                      <TableCell>{item.submittedby}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="secondary"
              onClick={exportIncomeStatementToCSV}
              className="mr-2"
            >
              Download CSV
            </Button>
            <Button 
              onClick={() => setShowIncomeStatement(false)}
              variant="destructive"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
