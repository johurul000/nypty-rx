// app/(app)/billing/page.tsx
'use client';

import { useState, useEffect, ChangeEvent, useCallback, useMemo, FormEvent } from 'react';
import { useRouter } from 'next/navigation'; // <--- Make sure this import is present
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

// ... rest of the component code
// --- Helper Function for Currency Formatting ---
const formatCurrency = (value: number | string | null | undefined): string => {
    const number = Number(value);
    if (value == null || isNaN(number)) return '₹ -.--'; // Handle null/undefined/NaN gracefully
    // Use Indian Rupee formatting
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(number);
};

export default function BillingPage() {
    // --- Hooks Initialization ---
    const supabase = createClient();
    const { user } = useAuth(); // Get authenticated user
    const router = useRouter(); // If needed for navigation later

    // --- State Variables ---
    const [storeId, setStoreId] = useState<string | null>(null);
    const [isLoadingStore, setIsLoadingStore] = useState(true); // Loading state for initial store fetch
    const [error, setError] = useState<string | null>(null); // For displaying critical errors

    // Inventory Search State
    const [searchPopoverOpen, setSearchPopoverOpen] = useState(false);
    const [inventorySearchTerm, setInventorySearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(inventorySearchTerm, 300); // Debounce search input
    const [inventorySearchResults, setInventorySearchResults] = useState<InventoryItem[]>([]);
    const [isSearchingInventory, setIsSearchingInventory] = useState(false); // Loading state for search API call

    // Bill State (Current Cart)
    const [billItems, setBillItems] = useState<BillItem[]>([]); // Array holding items added to the current bill
    const [customerName, setCustomerName] = useState(''); // Optional customer name
    const [isGeneratingBill, setIsGeneratingBill] = useState(false); // Loading state for final bill generation

    // --- Effects ---

    // 1. Fetch Store ID on component mount or when user changes
    useEffect(() => {
        const fetchStore = async () => {
             if (!user) { setIsLoadingStore(false); return; } // Exit if no user
             setIsLoadingStore(true);
             setError(null); // Clear previous errors
             try {
                 // Fetch only the ID of the store owned by the current user
                 const { data, error: storeError } = await supabase
                     .from('stores')
                     .select('id')
                     .eq('user_id', user.id)
                     .single(); // Expect exactly one store per user

                // Handle case where store setup is required
                 if (storeError?.code === 'PGRST116') { // specific error code for "No rows found"
                     throw new Error("Store not found. Please complete Store Setup first.");
                 }
                 if (storeError) { // Handle other database errors
                    throw storeError;
                 }
                 setStoreId(data.id); // Store the fetched ID
             } catch (err: any) {
                console.error("Error fetching store ID:", err);
                setError(err.message || "Could not load store information.");
                // Avoid toasting for "Store not found" as it's handled in the UI
                if (err.message !== "Store not found. Please complete Store Setup first.") {
                    toast.error("Error Loading Store", { description: err.message || "Could not load store information." });
                }
             } finally {
                setIsLoadingStore(false); // Ensure loading state is always turned off
             }
        };
        fetchStore();
    }, [user, supabase]); // Dependencies: run when user or supabase client changes

    // 2. Search Available Inventory based on debounced search term and store ID
    useEffect(() => {
        const searchInventory = async () => {
            // Don't search if no store ID, search term is too short, or already searching
            if (!storeId || debouncedSearchTerm.length < 2) {
                setInventorySearchResults([]);
                setIsSearchingInventory(false);
                return;
            }
            setIsSearchingInventory(true); // Set loading state for search
            try {
                // Query inventory table
                const { data, error } = await supabase
                    .from('inventory')
                    .select(`
                        *,
                        master_medicines ( name, manufacturer )
                    `) // Select all inventory fields and join related master medicine data
                    .eq('store_id', storeId) // Filter by the user's store
                    .gt('quantity', 0) // IMPORTANT: Only select items with quantity greater than 0
                    .ilike('master_medicines.name', `%${debouncedSearchTerm}%`) // Case-insensitive search on medicine name
                    .order('expiry_date', { ascending: true }) // Optional: prioritize items expiring sooner
                    .limit(15); // Limit results for performance

                if (error) throw error; // Throw error if Supabase query fails

                // Further filter results client-side to exclude items already fully added to the bill
                const billInventoryIds = new Set(billItems.map(item => item.inventoryItem.id));
                const filteredResults = (data || []).filter(invItem => {
                    const itemInBill = billItems.find(bi => bi.inventoryItem.id === invItem.id);
                    if (!itemInBill) return true; // Include if not in bill
                    // Include if in bill but quantity sold is less than available
                    return itemInBill.quantitySold < invItem.quantity;
                });

                setInventorySearchResults(filteredResults); // Update search results state

            } catch (err: any) {
                console.error("Error searching inventory:", err);
                toast.error("Search Error", { description: "Failed to search inventory." });
                setInventorySearchResults([]); // Clear results on error
            } finally {
                setIsSearchingInventory(false); // Clear loading state
            }
        };
        searchInventory();
    }, [debouncedSearchTerm, storeId, supabase, billItems]); // Dependencies: re-run search if these change

    // --- Event Handlers ---

    // 3. Add Item from Search Results to the Bill/Cart
    const handleAddItemToBill = (invItem: InventoryItem) => {
        // Check if this specific inventory batch (by ID) is already in the bill
        const existingBillItemIndex = billItems.findIndex(item => item.inventoryItem.id === invItem.id);

        if (existingBillItemIndex !== -1) {
            // Batch already exists, try incrementing quantity if stock allows
            const existingBillItem = billItems[existingBillItemIndex];
            if (existingBillItem.quantitySold < invItem.quantity) {
                // Call update function to handle incrementing and recalculation
                updateBillItemQuantity(invItem.id, (existingBillItem.quantitySold + 1).toString()); // Pass as string
            } else {
                toast.warning("Stock Limit Reached", { description: `Maximum available quantity (${invItem.quantity}) for this batch already added.` });
            }
        } else {
            // Batch is not in the bill, add it as a new item
            if (invItem.quantity < 1) { // Double-check stock just in case
                 toast.error("Out of Stock", { description: "This item batch is out of stock." });
                 return;
            }
            const unitPrice = Number(invItem.mrp) || 0; // Use MRP as unit price, default to 0
            const newItem: BillItem = {
                inventoryItem: invItem, // Store the full inventory item details
                quantitySold: 1,       // Start with quantity 1
                unitPrice: unitPrice,
                totalItemPrice: unitPrice * 1, // Calculate initial total for this item
            };
            setBillItems(prev => [...prev, newItem]); // Add the new item to the bill state
        }
        // Reset search UI after adding an item
        setInventorySearchTerm('');
        setInventorySearchResults([]);
        setSearchPopoverOpen(false);
    };

    // 4. Update Quantity for an Item already in the Bill/Cart
    const updateBillItemQuantity = (inventoryId: string, newQuantityStr: string) => {
        const newQuantity = parseInt(newQuantityStr, 10); // Convert input string to number

        setBillItems(prev => prev.map(item => {
            if (item.inventoryItem.id === inventoryId) { // Find the item to update
                // Validate the new quantity
                if (isNaN(newQuantity) || newQuantity < 1) {
                    // If invalid (NaN or less than 1), reset to 1 and show warning
                    toast.warning("Invalid Quantity", { description: "Quantity must be at least 1." });
                    return { ...item, quantitySold: 1, totalItemPrice: item.unitPrice * 1 };
                }
                if (newQuantity > item.inventoryItem.quantity) {
                    // If requested quantity exceeds available stock, cap it at max available
                    toast.warning("Stock Limit Exceeded", { description: `Only ${item.inventoryItem.quantity} available for this batch.` });
                    return { ...item, quantitySold: item.inventoryItem.quantity, totalItemPrice: item.unitPrice * item.inventoryItem.quantity };
                }
                // If quantity is valid, update quantitySold and recalculate totalItemPrice
                return { ...item, quantitySold: newQuantity, totalItemPrice: item.unitPrice * newQuantity };
            }
            return item; // Return other items unchanged
        }));
    };

    // 5. Remove an Item completely from the Bill/Cart
    const handleRemoveItemFromBill = (inventoryId: string) => {
        setBillItems(prev => prev.filter(item => item.inventoryItem.id !== inventoryId)); // Filter out the item
        toast.info("Item Removed", { description: "Item removed from the current bill." });
    };

    // 6. Calculate Total Bill Amount (Memoized for performance)
    const billTotal = useMemo(() => {
        // Sum up the totalItemPrice of all items in the billItems array
        return billItems.reduce((sum, item) => sum + item.totalItemPrice, 0);
    }, [billItems]); // Recalculate only when billItems array changes

    // 7. Handle Final Bill Generation (Calls Edge Function)
    const handleGenerateBill = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault(); // Prevent default form submission
        // Validations
        if (billItems.length === 0) { toast.error("Empty Bill", { description: "Please add items to the bill first." }); return; }
        if (!storeId) { toast.error("Store Error", { description: "Store information could not be loaded." }); return; }

        setIsGeneratingBill(true); // Set loading state for the button

        // Prepare the payload for the Edge Function
        const billDetails = {
            store_id: storeId,
            customer_name: customerName.trim() || null, // Send null if empty after trimming
            total_amount: billTotal,
            items: billItems.map(bi => ({ // Map bill items to the format expected by the Edge Function
                inventory_id: bi.inventoryItem.id,
                quantity_sold: bi.quantitySold,
                price_per_unit: bi.unitPrice,
                total_price: bi.totalItemPrice,
                medicine_name: bi.inventoryItem.master_medicines?.name ?? 'Unknown Medicine', // Include name for sale_items table
            }))
        };

        console.log("Attempting to generate bill with details:", billDetails);
        toast.info("Generating Bill...", { description: "Processing sale and updating inventory..." });

        try {
            // --- INVOKE THE SUPABASE EDGE FUNCTION ---
            // Replace 'process-sale' if your function has a different name
            // Ensure the Edge Function handles atomicity (DB transaction) & returns { success: true, saleId: '...', bill_number: '...' }
            const { data, error: functionError } = await supabase.functions.invoke('process-sale', {
                body: billDetails,
            });

            if (functionError) {
                // Handle errors specifically returned by the Edge Function invocation itself
                 console.error("Edge Function Invocation Error:", functionError);
                 if (functionError.message.includes('Insufficient stock')) {
                     throw new Error('Insufficient stock detected by server. Please review the bill.');
                 }
                 throw new Error(`Server error during bill generation: ${functionError.message}`);
            }

            // --- Process successful function response ---
            if (data && data.success && data.saleId) {
                 toast.success("Bill Generated Successfully!", {
                     description: `Bill No: ${data.bill_number || 'N/A'}. Opening print preview...`,
                     duration: 5000,
                 });

                 // Construct the URL for the print page using the returned saleId
                 const printUrl = `/billing/print/${data.saleId}`;
                 // Open the print page in a new browser tab
                 window.open(printUrl, '_blank');

                 // Clear the current bill form after successful generation
                 setBillItems([]);
                 setCustomerName('');
            }
            // Handle case where function succeeded but didn't return expected data
            else if (data && data.success) {
                 console.warn("Bill generation reported success but saleId was missing from response:", data);
                 toast.warning("Bill Generated (Print Failed)", { description: "Could not automatically open print view. Bill was saved." });
                 setBillItems([]); // Still clear the form
                 setCustomerName('');
            }
            // Handle cases where function ran but explicitly reported failure
            else {
                 throw new Error(data?.message || "Sale processing failed on the server. Inventory not updated.");
            }

        } catch (err: any) {
            // Catch errors from the invoke call or thrown within the try block
            console.error("Error During Bill Generation:", err);
            toast.error("Bill Generation Failed", {
                description: err.message || "An unexpected error occurred. Inventory might not be updated.",
                duration: 10000, // Show error longer
            });
        } finally {
            setIsGeneratingBill(false); // Reset loading state regardless of outcome
        }
    };

    // --- Render Logic ---

    // Display loading indicator while fetching initial store info
    if (isLoadingStore) {
        return (
            <div className="flex items-center justify-center p-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-3 text-muted-foreground">Loading Store Information...</span>
            </div>
        );
    }

    // Display error message if store fetch failed (e.g., Store not set up)
    if (error) {
        return (
            <Card className="m-4 md:m-6 lg:m-8 border-destructive bg-destructive/10">
                 <CardHeader>
                     <CardTitle className="text-destructive flex items-center">
                         <AlertCircle className='mr-2 h-5 w-5'/> Configuration Error
                     </CardTitle>
                 </CardHeader>
                 <CardContent>
                     <p>{error}</p>
                     {/* Optionally add a button to navigate to Store Setup if error indicates it */}
                     {error.includes("Store not found") && (
                        <Button variant="outline" size="sm" className="mt-4" onClick={() => router.push('/store-setup')}>
                            Go to Store Setup
                        </Button>
                     )}
                 </CardContent>
            </Card>
        );
    }

    // Main Billing Page Content (Rendered only if storeId is successfully fetched)
    return (
        <div className="space-y-6 p-1 md:p-4 lg:p-6"> {/* Add padding for different screen sizes */}
            <h1 className="text-3xl font-bold tracking-tight">Billing</h1>

            {/* Section 1: Search Inventory Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Search Inventory Item</CardTitle>
                    <CardDescription>Find available medicine batches by name to add to the bill.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Popover open={searchPopoverOpen} onOpenChange={setSearchPopoverOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" className="w-full md:w-[400px] justify-between text-muted-foreground hover:text-foreground data-[state=open]:text-foreground"> {/* Styling adjustments */}
                                <div className="flex items-center">
                                    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                                    {inventorySearchTerm || "Search medicine name..."}
                                </div>
                                <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
                            <Command shouldFilter={false}> {/* Disable built-in filtering; we use Supabase */}
                                <CommandInput
                                    placeholder="Type 2+ characters..."
                                    value={inventorySearchTerm}
                                    onValueChange={setInventorySearchTerm}
                                    disabled={isSearchingInventory}
                                    className="h-9"
                                />
                                <CommandList>
                                    {/* Loading and Empty States for Search Results */}
                                    {isSearchingInventory && <CommandEmpty>Searching...</CommandEmpty>}
                                    {!isSearchingInventory && inventorySearchResults.length === 0 && debouncedSearchTerm.length >= 2 && (<CommandEmpty>No matching items found in stock.</CommandEmpty>)}
                                    {!isSearchingInventory && inventorySearchResults.length === 0 && debouncedSearchTerm.length < 2 && (<CommandEmpty>Type 2 or more characters to search.</CommandEmpty>)}
                                    {/* Display Search Results */}
                                    <CommandGroup heading="Available Batches">
                                        {inventorySearchResults.map((inv) => (
                                            <CommandItem
                                                key={inv.id}
                                                // Value used for potential keyboard navigation within Command
                                                value={`${inv.master_medicines?.name} ${inv.batch_number || ''} ${inv.id}`}
                                                onSelect={() => handleAddItemToBill(inv)} // Add item when selected
                                                className="flex justify-between items-center cursor-pointer text-sm"
                                            >
                                                {/* Left side: Medicine details */}
                                                <div>
                                                    <span className="font-medium">{inv.master_medicines?.name}</span>
                                                    {inv.batch_number && <span className='text-xs text-muted-foreground ml-2'>(Batch: {inv.batch_number})</span>}
                                                    {inv.expiry_date && <span className='text-xs text-muted-foreground ml-2'>(Exp: {inv.expiry_date})</span>}
                                                     <span className='text-xs text-muted-foreground ml-2'>(MRP: {formatCurrency(inv.mrp)})</span>
                                                </div>
                                                {/* Right side: Available Quantity */}
                                                <span className='text-sm font-semibold text-blue-600 ml-4'>Qty: {inv.quantity}</span>
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
            <form onSubmit={handleGenerateBill}> {/* Wrap the bill section in a form */}
                <Card>
                    <CardHeader>
                        <CardTitle className='flex items-center text-lg'> {/* Adjusted size */}
                            <ShoppingCart className='mr-2 h-5 w-5'/> Current Bill
                        </CardTitle>
                        <CardDescription>Review items, adjust quantities, and generate the final bill.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Display message if no items are added yet */}
                        {billItems.length === 0 ? (
                             <p className="text-center text-muted-foreground py-6">Search and select items to add them here.</p>
                        ) : (
                            // Make table scroll horizontally on small screens
                            <div className="overflow-x-auto border rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="pl-2 pr-1">Medicine</TableHead> {/* Adjusted padding */}
                                            <TableHead className="px-1">Batch</TableHead>
                                            <TableHead className="min-w-[160px] px-1">Qty Sold</TableHead> {/* Give more space */}
                                            <TableHead className="text-right px-1">Unit Price</TableHead>
                                            <TableHead className="text-right px-1">Total</TableHead>
                                            <TableHead className="w-[50px] text-center pl-1 pr-2">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {billItems.map((item) => (
                                            <TableRow key={item.inventoryItem.id}>
                                                <TableCell className="font-medium pl-2 pr-1">{item.inventoryItem.master_medicines?.name ?? 'N/A'}</TableCell>
                                                <TableCell className="px-1">{item.inventoryItem.batch_number || '-'}</TableCell>
                                                <TableCell className="px-1">
                                                    {/* Input group for quantity and available stock */}
                                                    <div className="flex items-center gap-1">
                                                        <Input
                                                            type="number"
                                                            min="1"
                                                            max={item.inventoryItem.quantity} // Set max based on available stock
                                                            value={item.quantitySold}
                                                            onChange={(e) => updateBillItemQuantity(item.inventoryItem.id, e.target.value)}
                                                            className="h-8 w-[70px]" // Slightly wider input
                                                            disabled={isGeneratingBill}
                                                            aria-label={`Quantity for ${item.inventoryItem.master_medicines?.name}`}
                                                        />
                                                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                            / {item.inventoryItem.quantity} avail.
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right px-1">{formatCurrency(item.unitPrice)}</TableCell>
                                                <TableCell className="text-right font-semibold px-1">{formatCurrency(item.totalItemPrice)}</TableCell>
                                                <TableCell className="pl-1 pr-2 text-center">
                                                    {/* Remove Item Button */}
                                                    <Button
                                                        type="button" // Important: prevent form submission
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full" // Make it round
                                                        onClick={() => handleRemoveItemFromBill(item.inventoryItem.id)}
                                                        disabled={isGeneratingBill}
                                                        aria-label={`Remove ${item.inventoryItem.master_medicines?.name} from bill`}
                                                    >
                                                        <XCircle className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}

                        {/* Only show summary if there are items */}
                        {billItems.length > 0 && (
                            <>
                                <Separator/>
                                {/* Bill Summary and Customer Section */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 items-end pt-4">
                                   {/* Customer Name Input */}
                                   <div className="grid gap-1.5 order-last md:order-first"> {/* Change order on mobile */}
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
                                        <p className="text-sm font-medium text-muted-foreground">Grand Total</p>
                                        <p className="text-3xl font-bold tracking-tight">{formatCurrency(billTotal)}</p> {/* Larger total */}
                                    </div>
                                </div>
                             </>
                        )}
                    </CardContent>
                    {/* Generate Bill Button */}
                    <CardContent>
                         <Button
                            type="submit"
                            className="w-full md:w-auto"
                            disabled={isGeneratingBill || billItems.length === 0} // Disable if no items or processing
                            size="lg" // Larger button
                        >
                            {isGeneratingBill ? (
                                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing Bill...</>
                            ) : (
                                <><Receipt className='mr-2 h-5 w-5'/> Generate Bill & Open Preview</>
                            )}
                        </Button>
                    </CardContent>
                </Card>
            </form>
        </div>
    );
}