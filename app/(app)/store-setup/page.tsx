// app/(app)/store-setup/page.tsx
'use client';

import { useState, useEffect, FormEvent, ChangeEvent, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthProvider';
import { Store } from '@/types';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic'; // Import dynamic

const LocationPicker = dynamic(() => import('@/components/LocationPicker'), {
    ssr: false,
    loading: () => <div className='flex items-center justify-center h-[400px]'><Loader2 className="h-6 w-6 animate-spin" /> Loading Map...</div>
  });


// Extend the Store type locally if needed, or update types/index.ts
type StoreWithLocation = Partial<Store> & {
    latitude?: number | null;
    longitude?: number | null;
};

export default function StoreSetupPage() {
  const supabase = createClient();
  const { user } = useAuth();
  // Update state to include lat/lng
  const [store, setStore] = useState<StoreWithLocation>({
    name: '', address: '', city: '', state: '', zip_code: '',
    latitude: null, longitude: null // Initialize location fields
  });
  const [storeId, setStoreId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // --- Fetching Logic (Update select to include lat/lng) ---
  useEffect(() => {
    const fetchStoreData = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      };
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('stores')
          // Select latitude and longitude as well
          .select('*, latitude, longitude')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') throw error;

        if (data) {
           // Convert numeric strings from Supabase to numbers if needed
           const storeData: StoreWithLocation = {
               ...data,
               latitude: data.latitude ? parseFloat(data.latitude) : null,
               longitude: data.longitude ? parseFloat(data.longitude) : null,
           };
           setStore(storeData);
           setStoreId(data.id);
           console.log('Existing store data loaded:', storeData);
        } else {
           console.log('No existing store found.');
           setStore({ name: '', address: '', city: '', state: '', zip_code: '', latitude: null, longitude: null });
           setStoreId(null);
        }
      } catch (err: any) {
        console.error("Error fetching store data:", err);
        toast.error("Fetch Error", { description: `Could not load store data: ${err.message}` });
      } finally {
        setIsLoading(false);
      }
    };
    fetchStoreData();
  }, [user, supabase]);

  // --- Input Change Handler (No change needed here) ---
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setStore(prev => ({ ...prev, [name]: value }));
  };

  // --- Location Change Handler (Callback for LocationPicker) ---
  const handleLocationChange = useCallback((lat: number, lng: number) => {
    console.log("Location changed:", lat, lng);
    setStore(prev => ({
        ...prev,
        latitude: lat,
        longitude: lng
    }));
  }, []); // Empty dependency array, updates state

  // --- Form Submission (Includes lat/lng automatically) ---
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) { /* ... validation ... */ return; }
    if (!store.name) { /* ... validation ... */ return; }

    setIsSaving(true);

    // Latitude and Longitude are already part of the 'store' state
    const storeDataToSave = {
      ...store,
      user_id: user.id,
      id: storeId ?? undefined,
      // Ensure lat/lng are included, Supabase handles numeric conversion
      latitude: store.latitude,
      longitude: store.longitude,
    };
    if (!storeDataToSave.id) delete storeDataToSave.id;

    console.log("Attempting to save store data:", storeDataToSave);

    try {
      const { data, error } = await supabase
        .from('stores')
        .upsert(storeDataToSave, { onConflict: 'user_id' })
        .select('*, latitude, longitude') // Re-select to get updated/inserted values
        .single();

      if (error) throw error;

      if (data) {
         const updatedStoreData: StoreWithLocation = {
             ...data,
             latitude: data.latitude ? parseFloat(data.latitude) : null,
             longitude: data.longitude ? parseFloat(data.longitude) : null,
         };
         setStore(updatedStoreData);
         setStoreId(data.id);
         toast.success("Store Saved", { description: "Your store details have been updated." });
         console.log("Save successful, returned data:", updatedStoreData);
      } else {
         console.warn("Upsert successful but no data returned.");
         toast.warning("Save Completed", { description: "Operation finished, but no data returned." });
      }
    } catch (err: any) {
      console.error("Error saving store data:", err);
      toast.error("Save Error", { description: `Failed to save store details: ${err.message}` });
    } finally {
      setIsSaving(false);
    }
  };

  // --- Render Logic ---
  if (isLoading) { /* ... loading indicator ... */ }

  return (
    <Card className="max-w-3xl mx-auto"> {/* Increased max-width */}
      <CardHeader>
        <CardTitle>Store Setup</CardTitle>
        <CardDescription>
          {storeId ? 'Update your store information and location.' : 'Enter your store information and set location.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6"> {/* Increased spacing */}
          {/* --- Standard Address Fields --- */}
          <div className="grid gap-1.5">
            <Label htmlFor="name">Store Name <span className='text-destructive'>*</span></Label>
            <Input id="name" name="name" value={store.name || ''} onChange={handleChange} required disabled={isSaving} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="address">Address</Label>
            <Input id="address" name="address" value={store.address || ''} onChange={handleChange} disabled={isSaving} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="city">City</Label>
              <Input id="city" name="city" value={store.city || ''} onChange={handleChange} disabled={isSaving}/>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="state">State / Province</Label>
              <Input id="state" name="state" value={store.state || ''} onChange={handleChange} disabled={isSaving}/>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="zip_code">Zip / Postal Code</Label>
              <Input id="zip_code" name="zip_code" value={store.zip_code || ''} onChange={handleChange} disabled={isSaving}/>
            </div>
          </div>

          {/* --- Location Picker Section --- */}
          <div className="space-y-2">
             <Label>Store Location (Click or drag marker)</Label>
             <div className="border rounded-md overflow-hidden"> {/* Nice border for map */}
                <LocationPicker
                    // Pass lat/lng from state (or null)
                    initialLat={store.latitude}
                    initialLng={store.longitude}
                    // Callback to update state when map changes
                    onLocationChange={handleLocationChange}
                    mapHeight="350px" // Adjust height as needed
                />
             </div>
             {/* Display current coordinates */}
             <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                 <div>Lat: {store.latitude?.toFixed(6) ?? 'Not Set'}</div>
                 <div>Lng: {store.longitude?.toFixed(6) ?? 'Not Set'}</div>
             </div>
          </div>


          {/* --- Submit Button --- */}
          <Button type="submit" disabled={isSaving} className="w-full sm:w-auto">
            {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save Store Information'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}