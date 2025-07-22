"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function UserLedgerPage() {
  const [userId, setUserId] = useState("");
  const [userName, setUserName] = useState("");
  const [orderId, setOrderId] = useState("");
  const [ledger, setLedger] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalAmount, setTotalAmount] = useState(0);
  const [amountPaid, setAmountPaid] = useState(0);
  const [editEntry, setEditEntry] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showWarning, setShowWarning] = useState(true);
  const [modeOfPayment, setModeOfPayment] = useState("");
  const [modeOfMobileMoney, setModeOfMobileMoney] = useState("");
  const [bankName, setBankName] = useState("");
  const [financialSummary, setFinancialSummary] = useState<any>({
    cash: 0,
    bank: 0,
    mobileMoney: 0,
    mtn: 0,
    airtel: 0,
    bankNames: {},
  });

  const fetchUserDetails = async (userId: string) => {
    if (!userId) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("users")
      .select("name")
      .eq("id", userId)
      .single();

    if (error) {
      alert("Error fetching user details: " + error.message);
      setLoading(false);
      return;
    }

    setUserName(data?.name || "Unknown User");
    setLoading(false);
  };

  const fetchOrderDetails = async () => {
    if (!orderId) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("order")
      .select("user, total_amount")
      .eq("id", orderId)
      .single();

    if (error) {
      alert("Order not found! Please enter a valid track ID.");
      setLoading(false);
      return;
    }

    setUserId(data?.user || "");
    setTotalAmount(data?.total_amount || 0);
    fetchUserDetails(data?.user || "");
    fetchUserLedger(data?.user || "");
    setLoading(false);
  };

  const fetchUserLedger = async (userId: string) => {
    if (!userId) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("finance")
      .select("*")
      .eq("user_id", userId);

    if (error) {
      alert("Error fetching user ledger: " + error.message);
      setLoading(false);
      return;
    }

    setLedger(data || []);
    calculateFinancialSummary(data || []);
    setLoading(false);
  };

  const calculateFinancialSummary = (ledger: any[]) => {
    const summary = {
      cash: 0,
      bank: 0,
      mobileMoney: 0,
      mtn: 0,
      airtel: 0,
      bankNames: {} as { [key: string]: number },
    };

    ledger.forEach((entry) => {
      if (entry.mode_of_payment === "Cash") {
        summary.cash += entry.amount_paid;
      } else if (entry.mode_of_payment === "Bank") {
        summary.bank += entry.amount_paid;
        if (entry.bank_name) {
          summary.bankNames[entry.bank_name] = (summary.bankNames[entry.bank_name] || 0) + entry.amount_paid;
        }
      } else if (entry.mode_of_payment === "Mobile Money") {
        summary.mobileMoney += entry.amount_paid;
        if (entry.mode_of_mobilemoney === "MTN") {
          summary.mtn += entry.amount_paid;
        } else if (entry.mode_of_mobilemoney === "Airtel") {
          summary.airtel += entry.amount_paid;
        }
      }
    });

    setFinancialSummary(summary);
  };

  const submitPayment = async () => {
    if (!orderId || totalAmount <= 0 || amountPaid < 0) {
      alert("Please fill in all fields correctly.");
      return;
    }
    const balance = totalAmount - amountPaid;
    const { data, error } = await supabase
      .from("finance")
      .upsert(
        {
          user_id: userId,
          order_id: orderId,
          total_amount: totalAmount,
          amount_paid: amountPaid,
          amount_available: amountPaid,
          balance: balance,
          submittedby: "You",
          mode_of_payment: modeOfPayment,
          mode_of_mobilemoney: modeOfPayment === "Mobile Money" ? modeOfMobileMoney : null,
          bank_name: modeOfPayment === "Bank" ? bankName : null,
        },
        { onConflict: "user_id,order_id" }
      );

    if (error) {
      alert("Error submitting payment: " + error.message);
      return;
    }

    alert("Payment successfully submitted!");
    fetchUserLedger(userId);
    setEditEntry(null);
    setIsModalOpen(false);
    setModeOfPayment("");
    setModeOfMobileMoney("");
    setBankName("");
  };

  const handleEdit = (entry: any) => {
    setEditEntry(entry);
    setOrderId(entry.order_id);
    setTotalAmount(entry.total_amount);
    setAmountPaid(entry.amount_paid);
    setModeOfPayment(entry.mode_of_payment);
    setModeOfMobileMoney(entry.mode_of_mobilemoney || "");
    setBankName(entry.bank_name || "");
    setIsModalOpen(true);
  };

  const handleDelete = async (entryId: string) => {
    if (window.confirm("Are you sure you want to delete this entry?")) {
      const { error } = await supabase
        .from("finance")
        .delete()
        .eq("id", entryId);

      if (error) {
        alert("Error deleting entry: " + error.message);
        return;
      }

      alert("Entry successfully deleted!");
      fetchUserLedger(userId);
    }
  };

  const hasPaymentData = ledger.some((entry) => entry.order_id === orderId);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex items-center gap-3">
          <span className="text-4xl">📊</span>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Marketers Payment Records
          </h1>
        </div>
      </div>

      {/* Financial Summary Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <span>💰</span>
          <span>Payment Summary</span>
        </h2>
        
        {/* Primary Payment Methods */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-600">
                <span>💵</span>
                <span>Cash Payments</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-mono font-bold">{formatCurrency(financialSummary.cash)}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-green-50 border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <span>🏦</span>
                <span>Bank Transfers</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-mono font-bold">{formatCurrency(financialSummary.bank)}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-purple-50 border-purple-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-600">
                <span>📱</span>
                <span>Mobile Money</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-mono font-bold">{formatCurrency(financialSummary.mobileMoney)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Payment Details */}
        {(financialSummary.mtn > 0 || financialSummary.airtel > 0 || Object.keys(financialSummary.bankNames).length > 0) && (
          <>
            <h3 className="text-lg font-medium mb-3 text-gray-600">Detailed Breakdown</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {financialSummary.mtn > 0 && (
                <Card className="bg-yellow-50 border-yellow-200">
                  <CardHeader className="p-4">
                    <CardTitle className="flex items-center gap-2 text-yellow-600 text-sm">
                      <span>🟨</span>
                      <span>MTN Mobile Money</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <p className="text-lg font-mono">{formatCurrency(financialSummary.mtn)}</p>
                  </CardContent>
                </Card>
              )}
              
              {financialSummary.airtel > 0 && (
                <Card className="bg-red-50 border-red-200">
                  <CardHeader className="p-4">
                    <CardTitle className="flex items-center gap-2 text-red-600 text-sm">
                      <span>🟥</span>
                      <span>Airtel Money</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <p className="text-lg font-mono">{formatCurrency(financialSummary.airtel)}</p>
                  </CardContent>
                </Card>
              )}
              
              {Object.entries(financialSummary.bankNames).map(([bankName, amount]) => (
                <Card key={bankName} className="bg-gray-50 border-gray-200">
                  <CardHeader className="p-4">
                    <CardTitle className="flex items-center gap-2 text-gray-600 text-sm">
                      <span>🏛️</span>
                      <span>{bankName}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <p className="text-lg font-mono">{formatCurrency(amount as number)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Warning Alert */}
      {showWarning && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-r-lg relative">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <span className="text-yellow-500">⚠️</span>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Confirm proof of payment from the orders dashboard before adding payment!
              </p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() => setShowWarning(false)}
                className="text-yellow-500 hover:text-yellow-700"
              >
                <span className="text-xl">&times;</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Lookup Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <span>🔍</span>
          <span>Order Lookup</span>
        </h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            type="text"
            placeholder="Enter Tracking ID"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            className="flex-1"
          />
          <Button 
            onClick={fetchOrderDetails}
            className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
          >
            <span>🔎</span>
            <span>Search</span>
          </Button>
        </div>
      </div>

      {/* User and Ledger Section */}
      {userName && (
        <>
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
              <span>👤</span>
              <span>Marketer: {userName}</span>
            </h2>
            
            {loading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <>
                {/* Ledger Table */}
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead className="font-semibold">Track ID</TableHead>
                        <TableHead className="font-semibold">Total Amount</TableHead>
                        <TableHead className="font-semibold">Amount Paid</TableHead>
                        <TableHead className="font-semibold">Balance</TableHead>
                        <TableHead className="font-semibold">Payment Method</TableHead>
                        {ledger.some((entry) => entry.mode_of_payment === "Mobile Money") && (
                          <TableHead className="font-semibold">Mobile Provider</TableHead>
                        )}
                        {ledger.some((entry) => entry.mode_of_payment === "Bank") && (
                          <TableHead className="font-semibold">Bank Name</TableHead>
                        )}
                        <TableHead className="font-semibold text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ledger.length > 0 ? (
                        ledger.map((entry) => (
                          <TableRow key={entry.id} className="hover:bg-gray-50">
                            <TableCell>{entry.order_id}</TableCell>
                            <TableCell className="font-mono">{formatCurrency(entry.total_amount)}</TableCell>
                            <TableCell className="font-mono">{formatCurrency(entry.amount_paid)}</TableCell>
                            <TableCell className="font-mono">
                              {entry.balance > 0 ? (
                                <Badge variant="destructive">{formatCurrency(entry.balance)}</Badge>
                              ) : (
                                <Badge className="bg-green-500">{formatCurrency(entry.balance)}</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{entry.mode_of_payment}</Badge>
                            </TableCell>
                            {entry.mode_of_payment === "Mobile Money" && (
                              <TableCell>
                                <Badge variant="outline" className={entry.mode_of_mobilemoney === "MTN" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}>
                                  {entry.mode_of_mobilemoney}
                                </Badge>
                              </TableCell>
                            )}
                            {entry.mode_of_payment === "Bank" && (
                              <TableCell>{entry.bank_name}</TableCell>
                            )}
                            <TableCell className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(entry)}
                                className="border-blue-200 text-blue-600 hover:bg-blue-50"
                              >
                                Edit
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDelete(entry.id)}
                              >
                                Delete
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                            No payment records found for this user
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Payment Form */}
                {!hasPaymentData && (
                  <div className="mt-8 p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <span>➕</span>
                      <span>Add New Payment</span>
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Total Order Amount</label>
                        <Input
                          type="number"
                          placeholder="Total Amount"
                          value={totalAmount}
                          onChange={(e) => setTotalAmount(parseFloat(e.target.value))}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Amount Paid</label>
                        <Input
                          type="number"
                          placeholder="Amount Paid"
                          value={amountPaid}
                          onChange={(e) => setAmountPaid(parseFloat(e.target.value))}
                        />
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                      <Select onValueChange={setModeOfPayment} value={modeOfPayment}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Cash">Cash</SelectItem>
                          <SelectItem value="Bank">Bank Transfer</SelectItem>
                          <SelectItem value="Mobile Money">Mobile Money</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {modeOfPayment === "Mobile Money" && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Provider</label>
                        <Select onValueChange={setModeOfMobileMoney} value={modeOfMobileMoney}>
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

                    {modeOfPayment === "Bank" && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                        <Input
                          type="text"
                          placeholder="Enter bank name"
                          value={bankName}
                          onChange={(e) => setBankName(e.target.value)}
                        />
                      </div>
                    )}

                    <Button 
                      onClick={submitPayment}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      Submit Payment
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Edit Payment Modal */}
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent className="rounded-lg max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span>✏️</span>
                  <span>Edit Payment Record</span>
                </DialogTitle>
                <DialogDescription>
                  Update the payment details below
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Order Amount</label>
                  <Input
                    type="number"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(parseFloat(e.target.value))}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount Paid</label>
                  <Input
                    type="number"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(parseFloat(e.target.value))}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                  <Select onValueChange={setModeOfPayment} value={modeOfPayment}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Bank">Bank Transfer</SelectItem>
                      <SelectItem value="Mobile Money">Mobile Money</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {modeOfPayment === "Mobile Money" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Provider</label>
                    <Select onValueChange={setModeOfMobileMoney} value={modeOfMobileMoney}>
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

                {modeOfPayment === "Bank" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                    <Input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                    />
                  </div>
                )}
              </div>
              
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={submitPayment} className="bg-blue-600 hover:bg-blue-700">
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
