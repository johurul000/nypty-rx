// app/(app)/billing/page.tsx
'use client';

// ... (Keep all other imports, state, functions as they were) ...
import { useState, useEffect, ChangeEvent, useCallback, useMemo, FormEvent } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthProvider';
import { Store, MasterMedicine, InventoryItem, BillItem } from '@/types';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, Search, AlertCircle, Check, ChevronsUpDown, XCircle, ShoppingCart, Receipt } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

const formatCurrency = (value: number | string | null | undefined): string => { /* ... */ };

export default function BillingPage() {
    // ... (Keep all state variables: storeId, isLoadingStore, error, search states, billItems, customerName, etc.) ...
    const supabase = createClient();
    const { user } = useAuth();
    const [storeId, setStoreId] = useState<string | null>(null);
    const [isLoadingStore, setIsLoadingStore] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchPopoverOpen, setSearchPopoverOpen] = useState(false);
    const [inventorySearchTerm, setInventorySearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(inventorySearchTerm, 300);
    const [inventorySearchResults, setInventorySearchResults] = useState<InventoryItem[]>([]);
    const [isSearchingInventory, setIsSearchingInventory] = useState(false);
    const [billItems, setBillItems] = useState<BillItem[]>([]);
    const [customerName, setCustomerName] = useState('');
    const [isGeneratingBill, setIsGeneratingBill] = useState(false);
    
    // 1. Fetch Store ID
    useEffect(() => {
        // ... (Same fetchStore logic as Medicine Management page) ...
        const fetchStore = async () => {
             if (!user) return; setIsLoadingStore(true); setError(null);
             try {
                 const { data, error: storeError } = await supabase.from('stores').select('id').eq('user_id', user.id).single();
                 if (storeError) throw storeError;
                 if (!data) throw new Error("Store not found. Please set up your store first.");
                 setStoreId(data.id);
             } catch (err: any) { console.error("Error fetching store ID:", err); setError(err.message || "Could not load store information."); toast.error("Error", { description: err.message || "Could not load store information." });}
             finally { setIsLoadingStore(false); }
        };
        fetchStore();
    }, [user, supabase]);

    // 2. Search Available Inventory (Debounced)
    useEffect(() => {
        const searchInventory = async () => {
            if (!storeId || debouncedSearchTerm.length < 2) {
                setInventorySearchResults([]); setIsSearchingInventory(false); return;
            }
            setIsSearchingInventory(true);
            try {
                // Query inventory, join with master_medicines, filter by store, name, and QUANTITY > 0
                const { data, error } = await supabase
                    .from('inventory')
                    .select(`
                        *,
                        master_medicines ( name, manufacturer )
                    `)
                    .eq('store_id', storeId)
                    .gt('quantity', 0) // Only show items with stock > 0
                    .ilike('master_medicines.name', `%${debouncedSearchTerm}%`) // Search by medicine name
                    .order('expiry_date', { ascending: true }) // Optional: prioritize older expiry first?
                    .limit(15);

                if (error) throw error;
                // Filter out items already fully added to the current bill by inventory ID
                const billInventoryIds = new Set(billItems.map(item => item.inventoryItem.id));
                const filteredResults = (data || []).filter(invItem => {
                    // Check if the item is already in the bill
                    const itemInBill = billItems.find(bi => bi.inventoryItem.id === invItem.id);
                    if (!itemInBill) return true; // Not in bill, include it
                    // In bill, only include if quantity sold < available quantity
                    return itemInBill.quantitySold < invItem.quantity;
                });

                setInventorySearchResults(filteredResults);

            } catch (err: any) {
                console.error("Error searching inventory:", err);
                toast.error("Search Error", { description: "Failed to search inventory." });
                setInventorySearchResults([]);
            } finally {
                setIsSearchingInventory(false);
            }
        };
        searchInventory();
    }, [debouncedSearchTerm, storeId, supabase, billItems]); // Re-run search if billItems change too

    // 3. Add Item to Bill
    const handleAddItemToBill = (invItem: InventoryItem) => {
        // Check if this *specific batch* (inventoryItem.id) is already in the bill
        const existingBillItemIndex = billItems.findIndex(item => item.inventoryItem.id === invItem.id);

        if (existingBillItemIndex !== -1) {
            // Item batch exists, try incrementing quantity
            const existingBillItem = billItems[existingBillItemIndex];
            if (existingBillItem.quantitySold < invItem.quantity) {
                updateBillItemQuantity(invItem.id, existingBillItem.quantitySold + 1);
            } else {
                toast.warning("Stock Limit", { description: `Maximum available quantity (${invItem.quantity}) for this batch already added.` });
            }
        } else {
            // Add new item batch to bill
            if (invItem.quantity < 1) {
                 toast.error("Out of Stock", { description: "This item batch is out of stock." });
                 return;
            }
            const unitPrice = Number(invItem.mrp) || 0; // Default to 0 if MRP is null/invalid
            const newItem: BillItem = {
                inventoryItem: invItem,
                quantitySold: 1, // Start with quantity 1
                unitPrice: unitPrice,
                totalItemPrice: unitPrice * 1,
            };
            setBillItems(prev => [...prev, newItem]);
        }
        setInventorySearchTerm(''); // Clear search
        setInventorySearchResults([]); // Clear results
        setSearchPopoverOpen(false); // Close popover
    };

    // 4. Update Quantity of an Item in the Bill
    const updateBillItemQuantity = (inventoryId: string, newQuantityStr: string) => {
        const newQuantity = parseInt(newQuantityStr, 10);

        setBillItems(prev => prev.map(item => {
            if (item.inventoryItem.id === inventoryId) {
                // Validate quantity
                if (isNaN(newQuantity) || newQuantity < 1) {
                     toast.warning("Invalid Quantity", { description: "Quantity must be at least 1." });
                    return { ...item, quantitySold: 1, totalItemPrice: item.unitPrice * 1 }; // Reset to 1 or keep old? Resetting seems safer.
                }
                if (newQuantity > item.inventoryItem.quantity) {
                    toast.warning("Stock Limit", { description: `Only ${item.inventoryItem.quantity} available for this batch.` });
                    // Cap quantity at available stock
                    return { ...item, quantitySold: item.inventoryItem.quantity, totalItemPrice: item.unitPrice * item.inventoryItem.quantity };
                }
                // Valid quantity
                return { ...item, quantitySold: newQuantity, totalItemPrice: item.unitPrice * newQuantity };
            }
            return item;
        }));
    };

    // 5. Remove Item from Bill
    const handleRemoveItemFromBill = (inventoryId: string) => {
        setBillItems(prev => prev.filter(item => item.inventoryItem.id !== inventoryId));
        toast.info("Item Removed", { description: "Item removed from the current bill." });
    };

    // 6. Calculate Bill Total
    const billTotal = useMemo(() => {
        return billItems.reduce((sum, item) => sum + item.totalItemPrice, 0);
    }, [billItems]);

    // 7. Handle Generate Bill Submission
    const handleGenerateBill = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (billItems.length === 0) {
            toast.error("Empty Bill", { description: "Please add items to the bill first." });
            return;
        }
        if (!storeId) {
            toast.error("Store Error", { description: "Store information not found." });
            return;
        }

        setIsGeneratingBill(true);

        const billDetails = {
            store_id: storeId,
            customer_name: customerName || null,
            total_amount: billTotal,
            items: billItems.map(bi => ({
                inventory_id: bi.inventoryItem.id,
                quantity_sold: bi.quantitySold,
                price_per_unit: bi.unitPrice,
                total_price: bi.totalItemPrice,
                medicine_name: bi.inventoryItem.master_medicines?.name ?? 'Unknown Medicine', // Denormalized name
            }))
        };

        console.log("Generating Bill with details:", billDetails);
        toast.info("Generating Bill", { description: "Processing sale and updating inventory..." });

        // --- CRITICAL: Call Supabase Edge Function for Atomic Transaction ---
        try {
            // const { data, error: functionError } = await supabase.functions.invoke('process-sale', {
            //     body: billDetails,
            // });

            // TEMPORARY Placeholder - Replace with actual Edge Function call
            await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network delay
            const functionError = null; // Simulate success for now
            const data = { success: true, bill_number: `DEMO-${Date.now()}`}; // Simulate success response
            // --- End Placeholder ---


            if (functionError) {
                throw functionError; // Handle function-specific errors
            }

            if (data && data.success) {
                 toast.success("Bill Generated Successfully!", {
                     description: `Bill Number: ${data.bill_number || 'N/A'}. Inventory updated.`,
                     duration: 10000, // Show longer
                 });
                // Clear the bill form
                setBillItems([]);
                setCustomerName('');
                // Optionally navigate to a success/print page or refresh dashboard?
            } else {
                 // Handle cases where function ran but reported failure
                 throw new Error(data?.message || "Failed to process sale. Inventory not updated.");
            }

        } catch (err: any) {
            console.error("Error Generating Bill:", err);
            let description = "An error occurred while generating the bill. Inventory might not be updated.";
            if (err.message) {
                description = `${err.message}. Inventory might not be updated.`;
            } else if (typeof err === 'string') {
                 description = `${err}. Inventory might not be updated.`;
            }
            toast.error("Bill Generation Failed", {
                description: description,
                duration: 10000, // Show longer
            });
        } finally {
            setIsGeneratingBill(false);
        }
    };


    // --- Render Logic ---
    if (isLoadingStore) { /* ... loading indicator ... */ }
    if (error) { /* ... error display ... */ }
    if (!storeId) { /* ... prompt to setup store ... */ }

    return (
        <div className="space-y-6 p-1">
            <h1 className="text-2xl font-semibold">Billing</h1>

            {/* Section 1: Search Inventory */}
            <Card>
                <CardHeader>
                    <CardTitle>Search Inventory Item</CardTitle>
                    <CardDescription>Find available medicine batches to add to the bill.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Popover open={searchPopoverOpen} onOpenChange={setSearchPopoverOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" className="w-full md:w-[300px] justify-between">
                                <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                                {inventorySearchTerm || "Search medicine..."}
                                <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
                            <Command shouldFilter={false}>
                                <CommandInput
                                    placeholder="Type medicine name..."
                                    value={inventorySearchTerm}
                                    onValueChange={setInventorySearchTerm}
                                    disabled={isSearchingInventory}
                                    className="h-9"
                                />
                                <CommandList>
                                    {isSearchingInventory && <CommandEmpty>Loading...</CommandEmpty>}
                                    {!isSearchingInventory && inventorySearchResults.length === 0 && debouncedSearchTerm.length >= 2 && (<CommandEmpty>No matching items in stock.</CommandEmpty>)}
                                     {!isSearchingInventory && inventorySearchResults.length === 0 && debouncedSearchTerm.length < 2 && (<CommandEmpty>Type 2+ characters to search.</CommandEmpty>)}
                                    <CommandGroup heading="Available Batches">
                                        {inventorySearchResults.map((inv) => (
                                            <CommandItem
                                                key={inv.id}
                                                value={`${inv.master_medicines?.name} ${inv.batch_number || ''} ${inv.id}`}
                                                onSelect={() => handleAddItemToBill(inv)}
                                                className="flex justify-between items-center cursor-pointer"
                                            >
                                                <div>
                                                    <span>{inv.master_medicines?.name}</span>
                                                    {inv.batch_number && <span className='text-xs text-muted-foreground ml-2'>(Batch: {inv.batch_number})</span>}
                                                    {inv.expiry_date && <span className='text-xs text-muted-foreground ml-2'>(Exp: {inv.expiry_date})</span>}
                                                </div>
                                                <span className='text-sm font-medium ml-4'>Qty: {inv.quantity}</span>
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </CardContent>
            </Card>

            <Separator/>

            {/* Section 2: Current Bill Form */}
             <form onSubmit={handleGenerateBill}>
                <Card>
                    <CardHeader>
                        <CardTitle className='flex items-center'><ShoppingCart className='mr-2 h-5 w-5'/> Current Bill</CardTitle>
                        <CardDescription>Review items and quantities before generating the bill.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {billItems.length === 0 ? (
                             <p className="text-center text-muted-foreground py-4">No items added to the bill yet.</p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Medicine</TableHead>
                                        <TableHead>Batch</TableHead>
                                        <TableHead className="w-[100px]">Qty Sold</TableHead>
                                        <TableHead className="text-right">Unit Price</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                        <TableHead className="w-[50px]">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {billItems.map((item) => (
                                        <TableRow key={item.inventoryItem.id}>
                                            <TableCell className="font-medium">{item.inventoryItem.master_medicines?.name ?? 'N/A'}</TableCell>
                                            <TableCell>{item.inventoryItem.batch_number || '-'}</TableCell>
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    max={item.inventoryItem.quantity} // Max is available stock
                                                    value={item.quantitySold}
                                                    onChange={(e) => updateBillItemQuantity(item.inventoryItem.id, e.target.value)}
                                                    className="h-8" // Smaller input
                                                    disabled={isGeneratingBill}
                                                />
                                                <span className="text-xs text-muted-foreground ml-1">/ {item.inventoryItem.quantity} avail.</span>
                                            </TableCell>
                                            <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                                            <TableCell className="text-right font-semibold">{formatCurrency(item.totalItemPrice)}</TableCell>
                                            <TableCell>
                                                <Button
                                                    type="button" // Important: prevent form submission
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                                    onClick={() => handleRemoveItemFromBill(item.inventoryItem.id)}
                                                    disabled={isGeneratingBill}
                                                >
                                                    <XCircle className="h-4 w-4" />
                                                    <span className="sr-only">Remove Item</span>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}

                        <Separator/>

                        {/* Bill Summary and Customer */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end pt-4">
                           {/* Customer Name Input */}
                           <div className="grid gap-1.5">
                                <Label htmlFor="customerName">Customer Name (Optional)</Label>
                                <Input
                                    id="customerName"
                                    name="customerName"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    disabled={isGeneratingBill}
                                    placeholder="Walk-in Customer"
                                />
                            </div>

                            {/* Total Amount Display */}
                            <div className="text-right space-y-1">
                                <p className="text-sm text-muted-foreground">Total Amount</p>
                                <p className="text-2xl font-bold">{formatCurrency(billTotal)}</p>
                            </div>
                        </div>

                    </CardContent>
                     {/* Generate Bill Button - Placed outside CardContent if needed */}
                    <CardContent>
                         <Button type="submit" className="w-full md:w-auto" disabled={isGeneratingBill || billItems.length === 0}>
                            {isGeneratingBill ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</> : <><Receipt className='mr-2 h-4 w-4'/> Generate Bill</>}
                        </Button>
                    </CardContent>
                </Card>
            </form>

        </div>
    );
}