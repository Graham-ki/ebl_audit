'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/supabase/client';

export default function ItemDetailsPage() {
  const { table, id } = useParams(); // Get table and id from the URL
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchItem = async () => {
      if (!table || !id) return;

      try {
        // Fetch the item based on the table and ID
        const { data, error } = await supabase
          .from(table as 'users' | 'order' | 'category' | 'expenses' | 'ledger' | 'materials' | 'order_item' | 'product' | 'products_materials' | 'proof_of_payment' | 'finance')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;

        setItem(data);
      } catch (error) {
        console.error('Error fetching item:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchItem();
  }, [table, id, supabase]);

  if (loading) {
    return <p>Loading...</p>;
  }

  if (!item) {
    return <p>Item not found.</p>;
  }

  return (
    <div className="p-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        {/* Render details based on the table */}
        {table === 'materials' && <MaterialDetails item={item} />}
        {table === 'order' && <OrderDetails item={item} />}
        {table === 'product' && <ProductDetails item={item} />}
        {table === 'expenses' && <ExpenseDetails item={item} />}
        {table === 'products_materials' && <ProductMaterialDetails item={item} />}
        {table === 'users' && <UserDetails item={item} />}
        {table === 'finance' && <UserLedgerDetails item={item} />}
      </div>
    </div>
  );
}

// Component to display material details
function MaterialDetails({ item }: { item: any }) {
  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4 text-sky-600">{item.name}</h2>
      <p>
        <strong>Available:</strong> <em className="text-lime-600">{item.amount_available}</em>
      </p>
      <p>
        <strong>Unit per box:</strong> <em className="text-lime-600">{item.unit}</em>
      </p>
    </div>
  );
}

// Component to display order details
function OrderDetails({ item }: { item: any }) {
  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4 text-sky-600">{item.slug}</h2>
      <p>
        <strong>Delivery status:</strong> <em className="text-lime-600">{item.status}</em>
      </p>
      <p>
        <strong>ReceptionsStatus:</strong> <em className="text-lime-600">{item.receiption_status}</em>
      </p>
    </div>
  );
}

// Component to display product details
function ProductDetails({ item }: { item: any }) {
  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4 text-sky-600">Product Details</h2>
      <p>
        <strong>Name:</strong> <em className="text-lime-600">{item.title}</em>
      </p>
      <p>
        <strong>Stock:</strong> <em className="text-lime-600">{item.maxQuantity}</em>
      </p>
    </div>
  );
}

// Component to display expense details
function ExpenseDetails({ item }: { item: any }) {
  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4 text-sky-600">Expense on {item.item}</h2>
      <p>
        <strong>Amount Spent:</strong> <em className="text-lime-600">{item.amount_spent}</em>
      </p>
      <p>
        <strong>Date:</strong> <em className="text-lime-600">{new Date(item.date).toLocaleDateString()}</em>
      </p>
      <p>
        <strong>Department:</strong> <em className="text-lime-600">{item.department}</em>
      </p>
    </div>
  );
}

// Component to display product-material details
function ProductMaterialDetails({ item }: { item: any }) {
  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Product-Material Details</h2>
      <p>
        <strong>Material Name:</strong> {item.material_name}
      </p>
      <p>
        <strong>Quantity Used:</strong> {item.quantity_used}
      </p>
      <p>
        <strong>Product ID:</strong> {item.product_id}
      </p>
    </div>
  );
}

// Component to display user details
function UserDetails({ item }: { item: any }) {
  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4 text-sky-600">{item.name} is a system user</h2>
      <p>
        <strong>Email:</strong> <em className="text-lime-600">{item.email}</em>
      </p>
      <p>
        <strong>Role:</strong> <em className="text-lime-600">{item.type}</em>
      </p>
    </div>
  );
}

// Component to display user ledger details
function UserLedgerDetails({ item }: { item: any }) {
  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4 text-sky-600">Payment Details</h2>
      <p>
        <strong>Mode of Payment:</strong> <em className="text-lime-600">{item.mode_of_payment}</em>
      </p>
      {item.mode_of_payment === 'Mobile Money' && (
        <p>
          <strong>Mobile Money Provider:</strong> <em className="text-lime-600">{item.mode_of_mobilemoney}</em>
        </p>
      )}
      {item.mode_of_payment === 'Bank' && (
        <p>
          <strong>Bank Name:</strong> <em className="text-lime-600">{item.bank_name}</em>
        </p>
      )}
      <p>
        <strong>Amount Paid:</strong> <em className="text-lime-600">UGX {item.amount_paid}</em>
      </p>
      <p>
        <strong>Date:</strong> <em className="text-lime-600">{new Date(item.created_at).toLocaleDateString()}</em>
      </p>
    </div>
  );
}
