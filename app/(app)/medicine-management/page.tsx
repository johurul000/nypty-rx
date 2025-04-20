// app/(app)/medicine-management/page.tsx
'use client';

import { useState, useEffect, ChangeEvent, FormEvent, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthProvider';
import { MasterMedicine, InventoryItem } from '@/types';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { DatePicker } from "@/components/ui/date-picker"; // Shadcn Date Picker
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, PackagePlus, AlertCircle, Check, ChevronsUpDown } from 'lucide-react';
import { format } from 'date-fns'; // For date formatting
import { useDebounce } from '@/hooks/useDebounce'; // Assuming you create/use a debounce hook

// --- Helper Function for Price Formatting (Optional) ---
const formatCurrency = (value: number | string | null | undefined) => {
    const number = Number(value);
    if (isNaN(number)) return '';
    // Adjust locale and options as needed
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(number);
};

// --- Initial State for Add Form ---
const initialInventoryFormState = {
    batch_number: '',
    quantity: '', // Use string for input flexibility
    purchase_price: '',
    mrp: '',
    expiry_date: undefined as Date | undefined, // Use Date object for picker
};

export default function MedicineManagementPage() {
    const supabase = createClient();
    const { user } = useAuth();
    const [storeId, setStoreId] = useState<string | null>(null);
    const [isLoadingStore, setIsLoadingStore] = useState(true);

    // --- Master Medicine Search State ---
    const [searchPopoverOpen, setSearchPopoverOpen] = useState(false);
    const [masterSearchTerm, setMasterSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(masterSearchTerm, 300); // Debounce search input
    const [masterSearchResults, setMasterSearchResults] = useState<MasterMedicine[]>([]);
    const [isSearchingMaster, setIsSearchingMaster] = useState(false);
    const [selectedMasterMedicine, setSelectedMasterMedicine] = useState<MasterMedicine | null>(null);

    // --- Add Inventory Form State ---
    const [inventoryFormData, setInventoryFormData] = useState(initialInventoryFormState);
    const [isAddingInventory, setIsAddingInventory] = useState(false);

    // --- Inventory Table State ---
    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
    const [isLoadingInventory, setIsLoadingInventory] = useState(false);

    // --- Error State ---
    const [error, setError] = useState<string | null>(null);

    // 1. Fetch Store ID on Load
    useEffect(() => {
        const fetchStore = async () => {
            if (!user) return;
            setIsLoadingStore(true);
            setError(null);
            try {
                const { data, error: storeError } = await supabase
                    .from('stores')
                    .select('id')
                    .eq('user_id', user.id)
                    .single();

                if (storeError) throw storeError;
                if (!data) throw new Error("Store not found for this user. Please set up your store first.");

                setStoreId(data.id);
            } catch (err: any) {
                console.error("Error fetching store ID:", err);
                setError(err.message || "Could not load store information.");
                toast.error("Error", { description: err.message || "Could not load store information." });
            } finally {
                setIsLoadingStore(false);
            }
        };
        fetchStore();
    }, [user, supabase]);

    // 2. Fetch Inventory Items when Store ID is available
    const fetchInventory = useCallback(async () => {
        if (!storeId) return;
        setIsLoadingInventory(true);
        try {
            const { data, error: inventoryError } = await supabase
                .from('inventory')
                .select(`
                    *,
                    master_medicines ( name, manufacturer )
                `)
                .eq('store_id', storeId)
                .order('created_at', { ascending: false });

            if (inventoryError) throw inventoryError;
            setInventoryItems(data || []);
        } catch (err: any) {
            console.error("Error fetching inventory:", err);
            toast.error("Inventory Error", { description: `Could not load inventory: ${err.message}` });
        } finally {
            setIsLoadingInventory(false);
        }
    }, [storeId, supabase]);

    useEffect(() => {
        if (storeId) {
            fetchInventory();
        }
    }, [storeId, fetchInventory]); // Fetch inventory when storeId is set

    // 3. Search Master Medicines (Debounced)
    useEffect(() => {
        const searchMaster = async () => {
            if (debouncedSearchTerm.length < 2) { // Only search if term is long enough
                setMasterSearchResults([]);
                setIsSearchingMaster(false);
                return;
            }
            setIsSearchingMaster(true);
            try {
                const { data, error } = await supabase
                    .from('master_medicines')
                    .select('id, name, manufacturer')
                    .ilike('name', `%${debouncedSearchTerm}%`) // Case-insensitive search
                    .limit(10); // Limit results for performance

                if (error) throw error;
                setMasterSearchResults(data || []);
            } catch (err: any) {
                console.error("Error searching master medicines:", err);
                toast.error("Search Error", { description: "Failed to search master medicines." });
                setMasterSearchResults([]);
            } finally {
                setIsSearchingMaster(false);
            }
        };

        searchMaster();
    }, [debouncedSearchTerm, supabase]);

    // 4. Handle Selecting a Master Medicine
    const handleSelectMasterMedicine = (medicine: MasterMedicine) => {
        setSelectedMasterMedicine(medicine);
        setMasterSearchTerm(''); // Clear search input
        setMasterSearchResults([]); // Clear results
        setSearchPopoverOpen(false); // Close popover
        setInventoryFormData(initialInventoryFormState); // Reset form for the new medicine
        // Optionally focus the batch number input here
    };

    // 5. Handle Form Input Changes
    const handleFormChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setInventoryFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleDateChange = (date: Date | undefined) => {
        setInventoryFormData(prev => ({ ...prev, expiry_date: date }));
    };

    // 6. Handle Add Inventory Submission
    const handleAddInventory = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!storeId || !selectedMasterMedicine) {
            toast.error("Error", { description: "Please select a master medicine first." });
            return;
        }

        const quantity = parseInt(inventoryFormData.quantity, 10);
        if (isNaN(quantity) || quantity <= 0) {
            toast.error("Validation Error", { description: "Please enter a valid quantity (> 0)." });
            return;
        }

        // Basic price validation (optional)
        const purchasePrice = parseFloat(inventoryFormData.purchase_price);
        const mrp = parseFloat(inventoryFormData.mrp);
        // Add more robust validation as needed

        setIsAddingInventory(true);
        try {
            const itemToAdd = {
                store_id: storeId,
                medicine_id: selectedMasterMedicine.id,
                batch_number: inventoryFormData.batch_number || null,
                quantity: quantity,
                purchase_price: !isNaN(purchasePrice) ? purchasePrice : null,
                mrp: !isNaN(mrp) ? mrp : null,
                // Format date to 'YYYY-MM-DD' for Supabase DATE column
                expiry_date: inventoryFormData.expiry_date
                    ? format(inventoryFormData.expiry_date, 'yyyy-MM-dd')
                    : null,
            };

            console.log("Adding to inventory:", itemToAdd);

            const { error: insertError } = await supabase
                .from('inventory')
                .insert(itemToAdd);

            if (insertError) throw insertError;

            toast.success("Inventory Added", { description: `${selectedMasterMedicine.name} added successfully.` });
            setInventoryFormData(initialInventoryFormState); // Reset form
            setSelectedMasterMedicine(null); // Clear selected medicine (optional, maybe keep it?)
            fetchInventory(); // Refresh the inventory list

        } catch (err: any) {
            console.error("Error adding inventory:", err);
            toast.error("Add Error", { description: `Failed to add inventory: ${err.message}` });
        } finally {
            setIsAddingInventory(false);
        }
    };


    // --- Render Logic ---

    if (isLoadingStore) {
        return <div className="flex justify-center items-center p-10"><Loader2 className="h-8 w-8 animate-spin" /> Loading Store Info...</div>;
    }

    if (error) {
        return (
            <Card className="border-destructive bg-destructive/10 m-4">
                 <CardHeader><CardTitle className="text-destructive flex items-center"><AlertCircle className='mr-2'/>Error</CardTitle></CardHeader>
                 <CardContent><p>{error}</p></CardContent>
            </Card>
        );
    }

    if (!storeId) {
         // This case should theoretically be covered by the error state now
         return <Card className="m-4"><CardHeader><CardTitle>Store Not Found</CardTitle></CardHeader><CardContent><p>Please set up your store first.</p></CardContent></Card>;
    }

    // --- Main Page Content ---
    return (
        <div className="space-y-6 p-1">
            {/* Section 1: Search and Add Form */}
            <Card>
                <CardHeader>
                    <CardTitle>Add Medicine to Inventory</CardTitle>
                    <CardDescription>Search the master list and add batch details for your store.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Master Medicine Search */}
                    <div className="space-y-1.5">
                        <Label>Search Master Medicine</Label>
                        <Popover open={searchPopoverOpen} onOpenChange={setSearchPopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={searchPopoverOpen}
                                    className="w-full justify-between"
                                >
                                    {selectedMasterMedicine
                                        ? `${selectedMasterMedicine.name}${selectedMasterMedicine.manufacturer ? ` (${selectedMasterMedicine.manufacturer})` : ''}`
                                        : "Select medicine..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
                                <Command shouldFilter={false} > {/* We handle filtering via Supabase */}
                                    <CommandInput
                                        placeholder="Search medicine name..."
                                        value={masterSearchTerm}
                                        onValueChange={setMasterSearchTerm}
                                        disabled={isSearchingMaster}
                                        className="h-9"
                                    />
                                     <CommandList>
                                        {isSearchingMaster && <CommandEmpty>Loading...</CommandEmpty>}
                                        {!isSearchingMaster && masterSearchResults.length === 0 && debouncedSearchTerm.length >= 2 && (
                                            <CommandEmpty>No medicines found.</CommandEmpty>
                                        )}
                                         {!isSearchingMaster && masterSearchResults.length === 0 && debouncedSearchTerm.length < 2 && (
                                            <CommandEmpty>Type 2+ characters to search.</CommandEmpty>
                                        )}
                                        <CommandGroup heading="Results">
                                            {masterSearchResults.map((med) => (
                                                <CommandItem
                                                    key={med.id}
                                                    value={`${med.name} ${med.manufacturer || ''}`} // Value for potential filtering/searching within Command
                                                    onSelect={() => handleSelectMasterMedicine(med)}
                                                >
                                                    {med.name} {med.manufacturer && <span className='text-muted-foreground ml-2 text-xs'>({med.manufacturer})</span>}
                                                    <Check
                                                        className={`ml-auto h-4 w-4 ${selectedMasterMedicine?.id === med.id ? "opacity-100" : "opacity-0"}`}
                                                    />
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                     </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Add Inventory Form (shown only if medicine selected) */}
                    {selectedMasterMedicine && (
                        <form onSubmit={handleAddInventory} className="space-y-4 pt-4 border-t">
                             <p className="text-sm font-medium">Adding: <span className='text-primary'>{selectedMasterMedicine.name}</span></p>
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="grid gap-1.5">
                                    <Label htmlFor="batch_number">Batch Number</Label>
                                    <Input id="batch_number" name="batch_number" value={inventoryFormData.batch_number} onChange={handleFormChange} placeholder="Optional" />
                                </div>
                                <div className="grid gap-1.5">
                                    <Label htmlFor="quantity">Quantity <span className='text-destructive'>*</span></Label>
                                    <Input id="quantity" name="quantity" type="number" min="1" value={inventoryFormData.quantity} onChange={handleFormChange} required placeholder="e.g., 100" />
                                </div>
                                <div className="grid gap-1.5">
                                    <Label htmlFor="expiry_date">Expiry Date</Label>
                                    <DatePicker date={inventoryFormData.expiry_date} onDateChange={handleDateChange} />
                                </div>
                                <div className="grid gap-1.5">
                                    <Label htmlFor="purchase_price">Purchase Price (per unit)</Label>
                                    <Input id="purchase_price" name="purchase_price" type="number" step="0.01" value={inventoryFormData.purchase_price} onChange={handleFormChange} placeholder="Optional" />
                                </div>
                                <div className="grid gap-1.5">
                                    <Label htmlFor="mrp">MRP (per unit)</Label>
                                    <Input id="mrp" name="mrp" type="number" step="0.01" value={inventoryFormData.mrp} onChange={handleFormChange} placeholder="Optional" />
                                </div>
                             </div>
                            <Button type="submit" disabled={isAddingInventory}>
                                {isAddingInventory ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding...</> : <><PackagePlus className='mr-2 h-4 w-4'/> Add Batch to Inventory</>}
                            </Button>
                        </form>
                    )}
                </CardContent>
            </Card>

            <Separator />

            {/* Section 2: Inventory Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Current Inventory</CardTitle>
                    <CardDescription>Medicines currently in stock in your store.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Medicine Name</TableHead>
                                <TableHead>Manufacturer</TableHead>
                                <TableHead>Batch No.</TableHead>
                                <TableHead className="text-right">Quantity</TableHead>
                                <TableHead className="text-right">MRP</TableHead>
                                <TableHead>Expiry</TableHead>
                                <TableHead>Added On</TableHead>
                                {/* <TableHead>Actions</TableHead> */}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoadingInventory && (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">
                                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                                    </TableCell>
                                </TableRow>
                            )}
                            {!isLoadingInventory && inventoryItems.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">
                                        No inventory items found. Add medicines using the form above.
                                    </TableCell>
                                </TableRow>
                            )}
                            {!isLoadingInventory && inventoryItems.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.master_medicines?.name ?? 'N/A'}</TableCell>
                                    <TableCell>{item.master_medicines?.manufacturer ?? 'N/A'}</TableCell>
                                    <TableCell>{item.batch_number || '-'}</TableCell>
                                    <TableCell className="text-right">{item.quantity}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(item.mrp)}</TableCell>
                                    <TableCell>{item.expiry_date ? format(new Date(item.expiry_date), 'MMM yyyy') : '-'}</TableCell>
                                    <TableCell>{format(new Date(item.created_at), 'dd MMM yyyy')}</TableCell>
                                    {/* <TableCell> <Button variant="ghost" size="sm">Edit</Button> </TableCell> */}
                                </TableRow>
                            ))}
                        </TableBody>
                         <TableCaption>Your current medicine stock.</TableCaption>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}


// Simple Debounce Hook (Create this file: hooks/useDebounce.ts)
// export function useDebounce<T>(value: T, delay: number): T {
//   const [debouncedValue, setDebouncedValue] = useState<T>(value);

//   useEffect(() => {
//     const timer = setTimeout(() => setDebouncedValue(value), delay || 500);
//     return () => {
//       clearTimeout(timer);
//     };
//   }, [value, delay]);

//   return debouncedValue;
// }