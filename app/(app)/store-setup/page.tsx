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
import { Loader2, AlertCircle } from 'lucide-react'; // Added AlertCircle
import GoogleLocationPicker from '@/components/GoogleLocationPicker'; // Import the Google Maps picker

// Type for form state, including location
type StoreWithLocation = Partial<Store> & {
    latitude?: number | null;
    longitude?: number | null;
};

export default function StoreSetupPage() {
  const supabase = createClient();
  const { user } = useAuth();
  const [store, setStore] = useState<StoreWithLocation>({
    name: '', address: '', city: '', state: '', zip_code: '',
    latitude: null, longitude: null
  });
  const [storeId, setStoreId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null); // Separate error for fetching

  // Retrieve Google Maps API Key
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // --- Fetching Logic ---
  useEffect(() => {
    const fetchStoreData = async () => {
      if (!user) { setIsLoading(false); return; }
      setIsLoading(true);
      setFetchError(null); // Clear previous fetch errors
      try {
        const { data, error } = await supabase
          .from('stores')
          .select('*, latitude, longitude') // Fetch all fields including location
          .eq('user_id', user.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') throw error; // Throw actual DB errors

        if (data) {
           const storeData: StoreWithLocation = {
               ...data,
               // Ensure lat/lng are numbers or null
               latitude: data.latitude ? parseFloat(data.latitude.toString()) : null,
               longitude: data.longitude ? parseFloat(data.longitude.toString()) : null,
           };
           setStore(storeData);
           setStoreId(data.id);
           console.log('Existing store data loaded:', storeData);
        } else {
           console.log('No existing store found.');
           // Reset to empty state if no store exists
           setStore({ name: '', address: '', city: '', state: '', zip_code: '', latitude: null, longitude: null });
           setStoreId(null);
        }
      } catch (err: any) {
        console.error("Error fetching store data:", err);
        setFetchError(`Could not load store data: ${err.message}`);
        toast.error("Fetch Error", { description: `Could not load store data.` });
      } finally {
        setIsLoading(false);
      }
    };
    fetchStoreData();
  }, [user, supabase]); // Dependencies

  // --- Input Change Handler ---
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // console.log(`handleChange called for ${name}: ${value}`); // <--- Add for debugging
    setStore(prev => ({ ...prev, [name]: value }));
  };

  // --- Location Change Handler ---
  const handleLocationChange = useCallback((lat: number, lng: number) => {
    // console.log("Google Location updated:", lat, lng); // <--- Add for debugging
    setStore(prev => ({ ...prev, latitude: lat, longitude: lng }));
  }, []); // Empty dependency array is correct here

  // --- Form Submission ---
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) { toast.error("Not Authenticated"); return; }
    if (!store.name?.trim()) { // Added trim() validation
        toast.error("Validation Error", { description: "Store Name is required." });
        return;
    }
    setIsSaving(true);
    try {
      const storeDataToSave = {
        ...store,
        user_id: user.id,
        id: storeId ?? undefined, // Pass ID only if updating
        // Ensure lat/lng are numbers or null before saving
        latitude: store.latitude != null ? Number(store.latitude) : null,
        longitude: store.longitude != null ? Number(store.longitude) : null,
      };
      if (!storeDataToSave.id) delete storeDataToSave.id;

      console.log("Attempting to save store data:", storeDataToSave);
      const { data, error } = await supabase
        .from('stores')
        .upsert(storeDataToSave, { onConflict: 'user_id' })
        .select('*, latitude, longitude') // Re-select to get potentially updated values
        .single();

      if (error) throw error;

      if (data) {
         const updatedStoreData: StoreWithLocation = { // Re-map response just in case
             ...data,
             latitude: data.latitude ? parseFloat(data.latitude.toString()) : null,
             longitude: data.longitude ? parseFloat(data.longitude.toString()) : null,
         };
         setStore(updatedStoreData);
         setStoreId(data.id);
         toast.success("Store Saved", { description: "Store details have been updated." });
         console.log("Save successful, returned data:", updatedStoreData);
      } else {
         throw new Error("Save successful but no data returned.");
      }
    } catch (err: any) {
      console.error("Error saving store data:", err);
      toast.error("Save Error", { description: `Failed to save store details: ${err.message}` });
    } finally {
      setIsSaving(false);
    }
  };

  // --- Debugging Logs ---
  // console.log('Current isSaving state:', isSaving); // <--- Add for debugging
  // useEffect(() => { console.log('Store state updated:', store); }, [store]); // <--- Add for debugging

  // --- Render Logic ---
  if (isLoading) {
     return <div className="flex items-center justify-center p-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /><span className="ml-3">Loading...</span></div>;
  }

  if (fetchError) { // Show fetch error prominently
      return <Card className="m-4 border-destructive bg-destructive/10"><CardHeader><CardTitle className="text-destructive flex items-center"><AlertCircle className="mr-2"/>Error</CardTitle></CardHeader><CardContent>{fetchError}</CardContent></Card>;
  }

  if (!googleMapsApiKey) {
      return <Card className="m-4 border-destructive bg-destructive/10"><CardHeader><CardTitle>Configuration Error</CardTitle></CardHeader><CardContent>Google Maps API Key is missing.</CardContent></Card>;
  }

  return (
    <Card className="max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Store Setup</CardTitle>
        <CardDescription>
          {storeId ? 'Update your store information and location.' : 'Enter your store information and set location.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
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
            <div className="grid gap-1.5"> <Label htmlFor="city">City</Label> <Input id="city" name="city" value={store.city || ''} onChange={handleChange} disabled={isSaving}/> </div>
            <div className="grid gap-1.5"> <Label htmlFor="state">State / Province</Label> <Input id="state" name="state" value={store.state || ''} onChange={handleChange} disabled={isSaving}/> </div>
            <div className="grid gap-1.5"> <Label htmlFor="zip_code">Zip / Postal Code</Label> <Input id="zip_code" name="zip_code" value={store.zip_code || ''} onChange={handleChange} disabled={isSaving}/> </div>
          </div>

          {/* --- Google Location Picker Section --- */}
          <div className="space-y-2">
             <Label>Store Location (Search or click/drag marker)</Label>
             <GoogleLocationPicker
                 apiKey={googleMapsApiKey}
                 initialLat={store.latitude}
                 initialLng={store.longitude}
                 onLocationChange={handleLocationChange}
                 mapHeight="350px"
                 disabled={isSaving} // Disable map interactions during save
             />
             <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground mt-2">
                 <div>Lat: {store.latitude != null ? store.latitude.toFixed(6) : 'Not Set'}</div>
                 <div>Lng: {store.longitude != null ? store.longitude.toFixed(6) : 'Not Set'}</div>
             </div>
          </div>

          {/* --- Submit Button --- */}
          <Button type="submit" disabled={isSaving || isLoading} className="w-full sm:w-auto"> {/* Also disable if initially loading */}
            {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save Store Information'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}