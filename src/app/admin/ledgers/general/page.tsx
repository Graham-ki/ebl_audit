"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function CashFlowLedgerPage() {
  const [cashFlowData, setCashFlowData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"daily" | "monthly" | "yearly" | "all" | "custom">("all");
  const [users, setUsers] = useState<Record<string, string>>({});
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Fetch all users to map user IDs to names
  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, name");
      
      if (error) throw error;

      const usersMap = data.reduce((acc, user) => {
        acc[user.id] = user.name;
        return acc;
      }, {} as Record<string, string>);

      setUsers(usersMap);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  // Fetch and combine data from finance and expenses tables
  const fetchCashFlowData = async (filterType: "daily" | "monthly" | "yearly" | "all" | "custom") => {
    setLoading(true);
    const now = new Date();
    let queryStartDate: Date | null = null;
    let queryEndDate: Date | null = null;

    switch (filterType) {
      case "daily":
        queryStartDate = new Date(now.setHours(0, 0, 0, 0));
        queryEndDate = new Date(now.setHours(23, 59, 59, 999));
        break;
      case "monthly":
        queryStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
        queryEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      case "yearly":
        queryStartDate = new Date(now.getFullYear(), 0, 1);
        queryEndDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        break;
      case "custom":
        if (startDate && endDate) {
          queryStartDate = new Date(startDate);
          queryEndDate = new Date(endDate);
          queryStartDate.setHours(0, 0, 0, 0);
          queryEndDate.setHours(23, 59, 59, 999);
        } else {
          setLoading(false);
          return;
        }
        break;
      default:
        queryStartDate = null;
        queryEndDate = null;
        break;
    }

    try {
      // Fetch inflows from finance table
      let inflowsQuery = supabase
        .from("finance")
        .select(`
          id,
          amount_paid,
          purpose,
          created_at,
          user_id
        `);

      if (queryStartDate && queryEndDate) {
        inflowsQuery = inflowsQuery
          .gte("created_at", queryStartDate.toISOString())
          .lte("created_at", queryEndDate.toISOString());
      }

      const { data: inflows, error: inflowsError } = await inflowsQuery;

      if (inflowsError) throw inflowsError;

      // Fetch outflows from expenses table
      let outflowsQuery = supabase
        .from("expenses")
        .select(`
          id,
          amount_spent,
          item,
          date,
          department
        `);

      if (queryStartDate && queryEndDate) {
        outflowsQuery = outflowsQuery
          .gte("date", queryStartDate.toISOString())
          .lte("date", queryEndDate.toISOString());
      }

      const { data: outflows, error: outflowsError } = await outflowsQuery;

      if (outflowsError) throw outflowsError;

      // Transform and combine data
      const transformedInflows = (inflows || []).map(item => ({
        id: item.id,
        date: item.created_at,
        name: users[item.user_id] || "Unknown",
        reason: item.purpose || "N/A",
        inflow: item.amount_paid,
        outflow: null,
        type: "inflow"
      }));

      const transformedOutflows = (outflows || []).map(item => ({
        id: item.id,
        date: item.date,
        name: item.department || "N/A",
        reason: item.item || "N/A",
        inflow: null,
        outflow: item.amount_spent,
        type: "outflow"
      }));

      // Combine and sort by date (earliest first)
      const combinedData = [...transformedInflows, ...transformedOutflows].sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      // Calculate running balance
      let balance = 0;
      const dataWithBalance = combinedData.map(item => {
        if (item.type === "inflow") {
          balance += item.inflow || 0;
        } else {
          balance -= item.outflow || 0;
        }
        return { ...item, balance };
      });

      setCashFlowData(dataWithBalance);
    } catch (error) {
      console.error("Error fetching cash flow data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return "-";
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  const handleDownloadCSV = () => {
    if (cashFlowData.length === 0) {
      alert("No data to download");
      return;
    }

    const headers = [
      "Date",
      "Name",
      "Reason",
      "Inflow (Debit)",
      "Outflow (Credit)",
      "Balance",
      "Type"
    ];

    const rows = cashFlowData.map(item => [
      formatDate(item.date),
      item.name,
      item.reason,
      item.inflow || "",
      item.outflow || "",
      item.balance,
      item.type === "inflow" ? "Inflow" : "Outflow"
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `cash_flow_${filter}_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const applyCustomDateFilter = () => {
    if (!startDate || !endDate) {
      alert("Please select both start and end dates");
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      alert("Start date cannot be after end date");
      return;
    }
    setFilter("custom");
    setShowDatePicker(false);
    fetchCashFlowData("custom");
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (Object.keys(users).length > 0) {
      fetchCashFlowData(filter);
    }
  }, [filter, users]);

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="mb-8 text-center mx-auto">
  <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
    General ledger
  </h1>
  <p className="text-gray-600 dark:text-gray-300">
    Track all cash inflows and outflows with running balance
  </p>
</div>


      {/* Filter Controls */}
      <div className="flex flex-wrap gap-2 mb-6 items-center">
        <Select onValueChange={(value) => {
          setFilter(value as any);
          if (value !== "custom") {
            setShowDatePicker(false);
          }
        }} value={filter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select time period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="daily">Today</SelectItem>
            <SelectItem value="monthly">This Month</SelectItem>
            <SelectItem value="yearly">This Year</SelectItem>
            <SelectItem value="custom">Custom Date Range</SelectItem>
          </SelectContent>
        </Select>

        {filter === "custom" && (
          <div className="flex flex-col md:flex-row gap-2">
            <div className="flex items-center gap-2">
              <label className="text-sm">From:</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-[150px]"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm">To:</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-[150px]"
              />
            </div>
            <Button 
              onClick={applyCustomDateFilter}
              disabled={!startDate || !endDate}
            >
              Apply
            </Button>
          </div>
        )}

        <Button 
          variant="outline" 
          onClick={handleDownloadCSV}
          className="ml-auto"
          disabled={cashFlowData.length === 0}
        >
          Download CSV
        </Button>
      </div>

      {/* Cash Flow Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="font-semibold text-gray-700">Date & Time</TableHead>
              <TableHead className="font-semibold text-gray-700">Name</TableHead>
              <TableHead className="font-semibold text-gray-700">Reason</TableHead>
              <TableHead className="font-semibold text-gray-700 text-right">Inflow (Debit)</TableHead>
              <TableHead className="font-semibold text-gray-700 text-right">Outflow (Credit)</TableHead>
              <TableHead className="font-semibold text-gray-700 text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : cashFlowData.length > 0 ? (
              cashFlowData.map((entry) => (
                <TableRow key={`${entry.type}-${entry.id}`} className="hover:bg-gray-50">
                  <TableCell>{formatDate(entry.date)}</TableCell>
                  <TableCell>{entry.name}</TableCell>
                  <TableCell>{entry.reason}</TableCell>
                  <TableCell className="text-right font-mono text-green-600">
                    {entry.inflow ? formatCurrency(entry.inflow) : "-"}
                  </TableCell>
                  <TableCell className="text-right font-mono text-red-600">
                    {entry.outflow ? formatCurrency(entry.outflow) : "-"}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    <Badge variant={entry.balance >= 0 ? "default" : "destructive"}>
                      {formatCurrency(entry.balance)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  No cash flow records found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Summary Cards */}
      {cashFlowData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-green-600">Total Inflows</h3>
            <p className="text-xl font-mono font-bold">
              {formatCurrency(
                cashFlowData.reduce((sum, entry) => sum + (entry.inflow || 0), 0)
              )}
            </p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-red-600">Total Outflows</h3>
            <p className="text-xl font-mono font-bold">
              {formatCurrency(
                cashFlowData.reduce((sum, entry) => sum + (entry.outflow || 0), 0)
              )}
            </p>
          </div>
          <div className={`border rounded-lg p-4 ${
            cashFlowData[cashFlowData.length - 1]?.balance >= 0 
              ? "bg-blue-50 border-blue-200" 
              : "bg-orange-50 border-orange-200"
          }`}>
            <h3 className="text-sm font-medium">
              Current Balance
            </h3>
            <p className="text-xl font-mono font-bold">
              {formatCurrency(cashFlowData[cashFlowData.length - 1]?.balance || 0)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
