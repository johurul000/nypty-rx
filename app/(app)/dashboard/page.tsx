// app/(app)/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthProvider';
import { Store } from '@/types'; // Make sure you have this type defined
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Package, Store as StoreIcon, AlertCircle, Receipt } from 'lucide-react'; // Icons
import Link from 'next/link';
import { Button } from '@/components/ui/button';

// Ensure Store type exists in types/index.ts (or appropriate file)
// export type Store = {
//   id: string;
//   user_id: string;
//   name: string;
//   address?: string | null;
//   city?: string | null;
//   state?: string | null;
//   zip_code?: string | null;
//   created_at: string;
//   updated_at?: string | null;
// };

export default function DashboardPage() {
  const supabase = createClient();
  const { user } = useAuth();
  const [store, setStore] = useState<Store | null>(null);
  const [inventoryCount, setInventoryCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [storeId, setStoreId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setIsLoading(false); // Not logged in, nothing to load
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // 1. Fetch Store Details
        const { data: storeData, error: storeError } = await supabase
          .from('stores')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle(); // Use maybeSingle to handle no store found gracefully

        if (storeError) throw storeError;

        if (storeData) {
          setStore(storeData);
          setStoreId(storeData.id); // Set storeId for inventory fetch

          // 2. Fetch Inventory Count (only if store exists)
          const { count, error: countError } = await supabase
            .from('inventory')
            .select('*', { count: 'exact', head: true }) // head:true makes it faster, only gets count
            .eq('store_id', storeData.id);

          if (countError) throw countError;
          setInventoryCount(count ?? 0);

        } else {
          // No store setup yet for this user
          setStore(null);
          setInventoryCount(0); // No inventory if no store
        }

      } catch (err: any) {
        console.error("Dashboard Fetch Error:", err);
        setError(err.message || 'Failed to fetch dashboard data.');
        // Keep existing data if partial fetch failed? Decide based on UX.
        // setStore(null);
        // setInventoryCount(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // Optional: Setup real-time listeners for counts if needed
    // const inventoryListener = supabase.channel(...) ... subscribe() ... unsubscribe()

  }, [user, supabase]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-10">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className='ml-2'>Loading Dashboard...</span>
      </div>
    );
  }

  if (error) {
     return (
        <Card className="border-destructive bg-destructive/10">
             <CardHeader>
                 <CardTitle className="flex items-center text-destructive">
                    <AlertCircle className="mr-2 h-5 w-5"/> Error Loading Dashboard
                 </CardTitle>
             </CardHeader>
             <CardContent>
                 <p className="text-sm text-destructive">{error}</p>
                 <p className="text-sm mt-2">Please try refreshing the page. If the problem persists, contact support.</p>
             </CardContent>
         </Card>
     );
  }

  // If no store is set up yet
  if (!store) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Welcome!</CardTitle>
          <CardDescription>Your store is not set up yet.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4">Please set up your store details to start managing your inventory and sales.</p>
          <Button asChild>
            <Link href="/store-setup">Go to Store Setup</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Main dashboard display
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Store Info Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Store</CardTitle>
             <StoreIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{store.name}</div>
            <p className="text-xs text-muted-foreground">
                {store.address || 'Address not set'}
            </p>
            {/* Add a link to edit */}
             <Button variant="link" size="sm" className="px-0 h-auto mt-2" asChild>
                <Link href="/store-setup">Edit Store Info</Link>
             </Button>
          </CardContent>
        </Card>

        {/* Inventory Count Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {inventoryCount !== null ? inventoryCount : <Loader2 className='h-6 w-6 animate-spin'/>}
            </div>
            <p className="text-xs text-muted-foreground">
                Total unique medicine batches in stock
            </p>
             {/* Add a link to manage inventory */}
             <Button variant="link" size="sm" className="px-0 h-auto mt-2" asChild>
                <Link href="/medicine-management">Manage Inventory</Link>
             </Button>
          </CardContent>
        </Card>

        {/* Placeholder for Sales Card */}
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Sales</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" /> {/* Use Receipt icon */}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {/* Fetch and display sales data here */}
              Coming Soon
            </div>
            <p className="text-xs text-muted-foreground">
                Total sales amount for today
            </p>
             {/* Add a link to billing or reports */}
             <Button variant="link" size="sm" className="px-0 h-auto mt-2" asChild>
                <Link href="/billing">Go to Billing</Link>
             </Button>
          </CardContent>
        </Card>

      </div>

      {/* Maybe add recent activity or alerts here later */}

    </div>
  );
}