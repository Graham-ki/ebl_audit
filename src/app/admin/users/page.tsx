"use client";

import { useState, useEffect } from "react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { createClient } from "@supabase/supabase-js";
import { Badge } from "@/components/ui/badge";

const formatDateToEAT = (dateString: string) => {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Africa/Kampala",
  };
  return new Intl.DateTimeFormat("en-GB", options).format(date);
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface User {
  id?: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  password?: string;
  type: string;
}

interface Order {
  id: string;
  user_id: string;
  status: string;
  totalPrice: number;
  slug: string;
  created_at: string;
}

const UsersPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [viewOrdersUser, setViewOrdersUser] = useState<User | null>(null);
  const [userOrders, setUserOrders] = useState<Order[]>([]); 
  const [isViewingOrders, setIsViewingOrders] = useState(false);
  const [newUser, setNewUser] = useState<User>({
    name: "",
    email: "",
    phone: "",
    address: "",
    password: "",
    type: "USER",
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("users").select("id, name, email, phone, address, type").neq('type',"ADMIN");

    if (error) {
      console.error("Error fetching users:", error);
    } else {
      setUsers(data ?? []);
    }
    setLoading(false);
  };

  const handleAddUser = async () => {
    const { name, email, phone, address, password } = newUser;
  
    if (!name || !email || !phone || !address || !password) {
      alert("Please fill in all the fields.");
      return;
    }
  
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });
  
      if (authError) {
        throw authError;
      }
  
      const authUser = authData.user;
  
      const { data: dbData, error: dbError } = await supabase.from("users").insert([
        {
          name,
          email,
          phone,
          address,
          password,
          type: "USER",
        },
      ]);
  
      if (dbError) {
        throw dbError;
      }
  
      if (dbData && Array.isArray(dbData)) {
        setUsers([...users, ...dbData]);
      } else {
        alert("No user data was returned. Please check the database.");
      }
  
      setIsAdding(false);
      alert("User added successfully!");
    } catch (error: any) {
      console.error("Error adding user:", error.message);
      alert("User added: Please confirm the user by updating the details!");
    }
  };
  
  const handleEditUser = (user: User) => {
    setEditUser(user);
    setIsEditing(true);
  };

  const handleUpdateUser = async () => {
    if (!editUser) return;
    const updatedUser = { ...editUser, type: "USER" };
    const { error } = await supabase
      .from("users")
      .update({
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        address: updatedUser.address,
        type: updatedUser.type,
      })
      .eq("id", updatedUser.id);

    if (error) {
      console.error("Error updating user:", error.message);
      alert("Failed to update user: " + error.message);
    } else {
      setUsers(users.map((user) => (user.id === updatedUser.id ? updatedUser : user)));
      setIsEditing(false);
      alert("User updated successfully!");
    }
  };

  const handleDeleteUser = async (id: string) => {
    const { error } = await supabase.from("users").delete().eq("id", id);

    if (error) {
      console.error("Error deleting user:", error.message);
      alert("Failed to delete user: " + error.message);
    } else {
      setUsers(users.filter((user) => user.id !== id));
      alert("User deleted successfully!");
    }
  };

  const handleViewOrders = async (user: User) => {
    setViewOrdersUser(user);
    setIsViewingOrders(true);

    const { data: orders, error } = await supabase.from("order").select("*").eq("user", user.id);
    if (error) {
      console.error("Error fetching orders:", error.message);
      alert("Failed to fetch orders for the user.");
    } else {
      setUserOrders(orders ?? []);
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status.toLowerCase()) {
      case 'approved':
        return <Badge className="bg-green-500 hover:bg-green-600">{status}</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">{status}</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500 hover:bg-red-600">{status}</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex items-center gap-3">
          <span className="text-4xl">👥</span>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            User Management Dashboard
          </h1>
        </div>

        <Button 
          variant="default" 
          onClick={() => setIsAdding(false)} 
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
        >
          <span>➕</span>
          <span>Add New User</span>
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="font-medium text-gray-700">Name</TableHead>
                <TableHead className="font-medium text-gray-700">Email</TableHead>
                <TableHead className="font-medium text-gray-700">Phone</TableHead>
                <TableHead className="font-medium text-gray-700">Address</TableHead>
                <TableHead className="font-medium text-gray-700 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length > 0 ? (
                users.map((user) => (
                  <TableRow key={user.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.phone}</TableCell>
                    <TableCell>{user.address}</TableCell>
                    <TableCell className="flex justify-end gap-2">
                      <Button 
                        variant="outline" 
                        onClick={() => handleViewOrders(user)}
                        className="flex items-center gap-1 border-blue-200 text-blue-600 hover:bg-blue-50"
                      >
                        <span>📋</span>
                        <span>Orders</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No users found in the system
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add User Modal */}
      <Dialog open={isAdding} onOpenChange={setIsAdding}>
        <DialogContent className="rounded-lg max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>👤</span>
              <span>Add New User</span>
            </DialogTitle>
            <DialogDescription>
              Fill in all required fields to register a new user
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <Input
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                placeholder="John Doe"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <Input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="user@example.com"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <Input
                value={newUser.phone}
                onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                placeholder="+256XXXXXXXXX"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Physical Address</label>
              <Input
                value={newUser.address}
                onChange={(e) => setNewUser({ ...newUser, address: e.target.value })}
                placeholder="Kampala, Uganda"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Temporary Password</label>
              <Input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                placeholder="••••••••"
                className="w-full"
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setIsAdding(false)}>Cancel</Button>
            <Button onClick={handleAddUser} className="bg-blue-600 hover:bg-blue-700">
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="rounded-lg max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>✏️</span>
              <span>Edit User Details</span>
            </DialogTitle>
            <DialogDescription>
              Update the user information below
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <Input
                value={editUser?.name || ''}
                onChange={(e) => setEditUser({ ...editUser!, name: e.target.value })}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <Input
                type="email"
                value={editUser?.email || ''}
                onChange={(e) => setEditUser({ ...editUser!, email: e.target.value })}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <Input
                value={editUser?.phone || ''}
                onChange={(e) => setEditUser({ ...editUser!, phone: e.target.value })}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Physical Address</label>
              <Input
                value={editUser?.address || ''}
                onChange={(e) => setEditUser({ ...editUser!, address: e.target.value })}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">User Type</label>
              <Input
                value="USER"
                readOnly
                disabled
                className="w-full bg-gray-100"
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
            <Button onClick={handleUpdateUser} className="bg-green-600 hover:bg-green-700">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Orders Modal */}
      <Dialog open={isViewingOrders} onOpenChange={setIsViewingOrders}>
        <DialogContent className="rounded-lg max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>📋</span>
              <span>Order History for {viewOrdersUser?.name}</span>
            </DialogTitle>
            <DialogDescription>
              List of all orders placed by this user
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-auto">
            <Table>
              <TableHeader className="bg-gray-50 sticky top-0">
                <TableRow>
                  <TableHead className="font-medium text-gray-700">Order ID</TableHead>
                  <TableHead className="font-medium text-gray-700">Order Date</TableHead>
                  <TableHead className="font-medium text-gray-700">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userOrders.length > 0 ? (
                  userOrders.map((order) => (
                    <TableRow key={order.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium">{order.slug}</TableCell>
                      <TableCell>{formatDateToEAT(order.created_at)}</TableCell>
                      <TableCell>
                        {getStatusBadge(order.status)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                      No orders found for this user
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsViewingOrders(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersPage;
