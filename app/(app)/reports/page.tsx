// app/(app)/reports/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation'; // Import if needed for navigation buttons
import { createClient } from '@/lib/supabase/client';
import { Label } from "@/components/ui/label"; // <--- ADD LABEL HERE (or ensure it's present)
import { useAuth } from '@/context/AuthProvider';
import { InventoryItem } from '@/types'; // Ensure types are defined
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { DatePickerWithRange } from "@/components/ui/date-range-picker"; // Import from its dedicated file
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Archive, BarChart3, CalendarClock, Hourglass, IndianRupee, Loader2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subDays, startOfDay, endOfDay } from 'date-fns'; // Ensure 'format' is imported once here
import type { DateRange } from "react-day-picker";
import { toast } from "sonner"; // Import toast for potential error messages

// --- Helper Functions ---
const formatCurrency = (value: number | string | null | undefined): string => {
    const number = Number(value);
    if (value == null || isNaN(number)) return '₹ -.--';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(number);
};

// --- Configuration ---
const LOW_STOCK_THRESHOLD = 10;
const EXPIRY_DAYS_THRESHOLD = 90;

// --- Component State Interfaces ---
interface InventorySummary {
    totalItems: number;
    lowStockCount: number;
    expiringSoonCount: number;
}

interface SalesSummary {
    totalRevenue: number;
    totalSalesCount: number;
}

export default function ReportsPage() {
    // --- Hooks ---
    const supabase = createClient();
    const { user } = useAuth();
    const router = useRouter(); // Initialize router if needed

    // --- State ---
    const [storeId, setStoreId] = useState<string | null>(null);
    const [isLoadingStore, setIsLoadingStore] = useState(true);
    const [error, setError] = useState<string | null>(null); // General page errors
    const [reportError, setReportError] = useState<string | null>(null); // Errors specific to loading report data

    // Report Data State
    const [inventorySummary, setInventorySummary] = useState<InventorySummary | null>(null);
    const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
    const [expiringSoonItems, setExpiringSoonItems] = useState<InventoryItem[]>([]);
    const [salesSummary, setSalesSummary] = useState<SalesSummary | null>(null);
    const [isLoadingReports, setIsLoadingReports] = useState(false);

    // Date Range State
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
    });

    // --- Effects ---

    // 1. Fetch Store ID
    useEffect(() => {
        const fetchStore = async () => {
             if (!user) { setIsLoadingStore(false); return; }
             setIsLoadingStore(true); setError(null); setReportError(null); // Reset errors on fetch
             try {
                 const { data, error: storeError } = await supabase.from('stores').select('id').eq('user_id', user.id).single();
                 if (storeError?.code === 'PGRST116') throw new Error("Store not found. Please complete Store Setup first.");
                 if (storeError) throw storeError;
                 setStoreId(data.id);
             } catch (err: any) {
                console.error("Error fetching store ID:", err);
                setError(err.message || "Could not load store information.");
             } finally { setIsLoadingStore(false); }
        };
        fetchStore();
    }, [user, supabase]);

    // 2. Fetch Report Data (Memoized)
    const fetchReportData = useCallback(async () => {
        if (!storeId) return; // Don't fetch if store ID isn't available
        setIsLoadingReports(true);
        setReportError(null); // Clear previous report-specific errors

        try {
            // Prepare dates for queries
            const today = new Date();
            const expiryLimitDate = format(subDays(today, -EXPIRY_DAYS_THRESHOLD), 'yyyy-MM-dd');
            const todayDate = format(today, 'yyyy-MM-dd');
            const salesStartDate = dateRange?.from ? format(startOfDay(dateRange.from), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx") : null;
            const salesEndDate = dateRange?.to ? format(endOfDay(dateRange.to), "yyyy-MM-dd'T'HH:mm:ss.SSSxxx") : null;

            // Perform fetches concurrently
            const [
                inventorySummaryRes,
                lowStockRes,
                expiringSoonRes,
                salesSummaryRes
            ] = await Promise.allSettled([ // Use Promise.allSettled to handle individual query failures
                // Inventory Summary Query
                supabase
                    .from('inventory')
                    .select('id, quantity, expiry_date', { count: 'exact', head: false })
                    .eq('store_id', storeId)
                    .gt('quantity', 0),
                // Low Stock Query
                supabase
                    .from('inventory')
                    .select('*, master_medicines(name, manufacturer)')
                    .eq('store_id', storeId)
                    .lt('quantity', LOW_STOCK_THRESHOLD + 1)
                    .gt('quantity', 0)
                    .order('quantity', { ascending: true })
                    .limit(50),
                // Expiring Soon Query
                supabase
                    .from('inventory')
                    .select('*, master_medicines(name, manufacturer)')
                    .eq('store_id', storeId)
                    .gt('quantity', 0)
                    .gte('expiry_date', todayDate)
                    .lte('expiry_date', expiryLimitDate)
                    .order('expiry_date', { ascending: true })
                    .limit(50),
                // Sales Summary Query (conditional)
                salesStartDate && salesEndDate ? supabase
                    .from('sales')
                    .select('total_amount', { count: 'exact' })
                    .eq('store_id', storeId)
                    .gte('sale_date', salesStartDate)
                    .lte('sale_date', salesEndDate)
                : Promise.resolve({ data: [], count: 0, error: null }) // Resolve immediately if no date range
            ]);

            // --- Process Results (Check status of each promise) ---
            let processingError: string | null = null;

            // Process Inventory Summary
            if (inventorySummaryRes.status === 'fulfilled' && !inventorySummaryRes.value.error) {
                const allItems = inventorySummaryRes.value.data || [];
                const totalItemsCount = allItems.length;
                const lowStockCount = allItems.filter(item => item.quantity <= LOW_STOCK_THRESHOLD).length;
                const expiringSoonCount = allItems.filter(item => item.expiry_date && item.expiry_date >= todayDate && item.expiry_date <= expiryLimitDate).length;
                setInventorySummary({ totalItems: totalItemsCount, lowStockCount, expiringSoonCount });
            } else {
                console.error("Inv Summary Error:", inventorySummaryRes.status === 'rejected' ? inventorySummaryRes.reason : inventorySummaryRes.value.error);
                processingError = processingError ? `${processingError}; Inv Summary Failed` : 'Inv Summary Failed';
                setInventorySummary(null); // Clear stale data
            }

            // Process Low Stock
            if (lowStockRes.status === 'fulfilled' && !lowStockRes.value.error) {
                setLowStockItems(lowStockRes.value.data || []);
            } else {
                 console.error("Low Stock Error:", lowStockRes.status === 'rejected' ? lowStockRes.reason : lowStockRes.value.error);
                 processingError = processingError ? `${processingError}; Low Stock Failed` : 'Low Stock Failed';
                 setLowStockItems([]); // Clear stale data
            }

            // Process Expiring Soon
            if (expiringSoonRes.status === 'fulfilled' && !expiringSoonRes.value.error) {
                setExpiringSoonItems(expiringSoonRes.value.data || []);
            } else {
                console.error("Expiring Soon Error:", expiringSoonRes.status === 'rejected' ? expiringSoonRes.reason : expiringSoonRes.value.error);
                processingError = processingError ? `${processingError}; Expiring Soon Failed` : 'Expiring Soon Failed';
                setExpiringSoonItems([]); // Clear stale data
            }

             // Process Sales Summary
             if (salesSummaryRes.status === 'fulfilled' && !salesSummaryRes.value.error) {
                const salesData = salesSummaryRes.value.data || [];
                const totalRevenue = salesData.reduce((sum, sale) => sum + (Number(sale.total_amount) || 0), 0);
                const totalSalesCount = salesSummaryRes.value.count ?? 0;
                setSalesSummary({ totalRevenue, totalSalesCount });
             } else {
                console.error("Sales Summary Error:", salesSummaryRes.status === 'rejected' ? salesSummaryRes.reason : salesSummaryRes.value.error);
                processingError = processingError ? `${processingError}; Sales Summary Failed` : 'Sales Summary Failed';
                setSalesSummary(null); // Clear stale data
             }

             // Set overall report error if any part failed
             if (processingError) {
                setReportError(`Failed to load some report sections: ${processingError}.`);
                toast.error("Report Error", { description: `Failed to load some report sections. Please try refreshing.` });
             }

        } catch (err: any) {
            // Catch unexpected errors during the setup/Promise.all phase
            console.error("Unexpected error fetching report data:", err);
            setReportError(`An unexpected error occurred: ${err.message}`);
            toast.error("Report Loading Failed", { description: `An unexpected error occurred. Please try refreshing.` });
            // Clear all report data
            setInventorySummary(null); setLowStockItems([]); setExpiringSoonItems([]); setSalesSummary(null);
        } finally {
            setIsLoadingReports(false); // Turn off loading indicator
        }
    }, [storeId, supabase, dateRange]); // Dependencies for the callback

    // Trigger initial data fetch when storeId becomes available
    useEffect(() => {
        if (storeId) {
            fetchReportData();
        }
    }, [storeId, fetchReportData]); // Only depends on storeId and the memoized fetch function


    // --- Render Logic ---

    // Initial loading state (waiting for store ID)
    if (isLoadingStore) {
        return (
             <div className="flex items-center justify-center p-10">
                 <Loader2 className="h-8 w-8 animate-spin text-primary" />
                 <span className="ml-3 text-muted-foreground">Loading Store Information...</span>
             </div>
         );
    }

    // Display error if store ID fetch failed (e.g., store not set up)
    if (error) {
        return (
            <Card className="m-4 md:m-6 lg:m-8 border-destructive bg-destructive/10">
                 <CardHeader><CardTitle className="text-destructive flex items-center"><AlertCircle className='mr-2 h-5 w-5'/> Configuration Error</CardTitle></CardHeader>
                 <CardContent className="space-y-4">
                     <p>{error}</p>
                     {error.includes("Store not found") && (
                        <Button variant="outline" size="sm" onClick={() => router.push('/store-setup')}>
                            Go to Store Setup
                        </Button>
                     )}
                 </CardContent>
            </Card>
        );
    }

    // Should not happen if error handling is correct, but as a fallback
    if (!storeId) {
        return <Card className="m-4"><CardHeader><CardTitle>Error</CardTitle></CardHeader><CardContent><p>Store ID could not be determined.</p></CardContent></Card>;
    }

    // Main Reports Page Content
    return (
        <div className="space-y-6 p-1 md:p-4 lg:p-6 relative"> {/* Added relative for potential loading overlay */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                 <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
                 <Button variant="outline" size="sm" onClick={fetchReportData} disabled={isLoadingReports}>
                    {isLoadingReports ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BarChart3 className="mr-2 h-4 w-4" />}
                    Refresh Reports
                 </Button>
            </div>

            {/* Loading Indicator specifically for report data fetching */}
            {isLoadingReports && (
                 <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
                     <Loader2 className="h-8 w-8 animate-spin text-primary" />
                     <span className='ml-3 text-lg font-medium'>Loading Reports...</span>
                 </div>
             )}

             {/* Display report-specific error if occurred */}
             {reportError && !isLoadingReports && (
                 <Card className="border-destructive bg-destructive/10">
                     <CardHeader><CardTitle className="text-destructive flex items-center"><AlertCircle className='mr-2 h-5 w-5'/>Report Error</CardTitle></CardHeader>
                     <CardContent><p>{reportError}</p></CardContent>
                 </Card>
             )}

            {/* Report Sections Grid */}
            <div className={`grid gap-4 md:grid-cols-2 lg:grid-cols-3 ${isLoadingReports ? 'opacity-50 pointer-events-none' : ''}`}> {/* Dim content while loading */}
                 {/* Inventory Summary Card */}
                 <Card>
                     <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                         <CardTitle className="text-sm font-medium">Inventory Overview</CardTitle>
                         <Archive className="h-4 w-4 text-muted-foreground" />
                     </CardHeader>
                     <CardContent className="space-y-2 pt-1"> {/* Reduced top padding */}
                         <div className="text-2xl font-bold">{inventorySummary?.totalItems ?? '-'}</div>
                         <p className="text-xs text-muted-foreground">Total distinct batches in stock</p>
                         <Separator className="my-2"/>
                         <div className="flex justify-between text-sm items-center">
                             <span className="text-muted-foreground">Low Stock Items ({'<= '}{LOW_STOCK_THRESHOLD}):</span>
                             <span className="font-semibold text-orange-600">{inventorySummary?.lowStockCount ?? '-'}</span>
                         </div>
                         <div className="flex justify-between text-sm items-center">
                             <span className="text-muted-foreground">Expiring Soon ({'<='}{EXPIRY_DAYS_THRESHOLD}d):</span>
                             <span className="font-semibold text-red-600">{inventorySummary?.expiringSoonCount ?? '-'}</span>
                         </div>
                     </CardContent>
                 </Card>

                 {/* Sales Summary Card */}
                 <Card>
                     <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                         <CardTitle className="text-sm font-medium">Sales Summary</CardTitle>
                         <IndianRupee className="h-4 w-4 text-muted-foreground" />
                     </CardHeader>
                     <CardContent className="pt-1">
                         <div className="text-2xl font-bold">{formatCurrency(salesSummary?.totalRevenue) ?? '-'}</div>
                         <p className="text-xs text-muted-foreground">
                             Total revenue from {salesSummary?.totalSalesCount ?? '-'} sales
                         </p>
                         <Separator className="my-2"/>
                          <div className="flex items-center gap-2">
                            <Label className="text-xs whitespace-nowrap mr-1">Date Range:</Label>
                            {/* Ensure DatePickerWithRange component exists and is imported */}
                            <DatePickerWithRange date={dateRange} onDateChange={setDateRange} disabled={isLoadingReports} />
                          </div>
                     </CardContent>
                 </Card>

                 {/* Placeholder Card */}
                 <Card className="flex items-center justify-center border-dashed min-h-[150px]">
                     <p className="text-muted-foreground text-center text-sm p-4">Charts & more reports coming soon...</p>
                 </Card>
            </div>

            {/* Low Stock Table */}
            <Card className={`${isLoadingReports ? 'opacity-50 pointer-events-none' : ''}`}>
                <CardHeader>
                    <CardTitle className="flex items-center text-lg"><Hourglass className="mr-2 h-5 w-5 text-orange-500"/> Low Stock Items</CardTitle>
                    <CardDescription>Items with quantity less than or equal to {LOW_STOCK_THRESHOLD}.</CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Medicine Name</TableHead>
                                <TableHead>Manufacturer</TableHead>
                                <TableHead>Batch No.</TableHead>
                                <TableHead className="text-right">Quantity Left</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {lowStockItems.length === 0 && <TableRow><TableCell colSpan={4} className="text-center h-24 text-muted-foreground">No low stock items found.</TableCell></TableRow>}
                            {lowStockItems.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.master_medicines?.name ?? 'N/A'}</TableCell>
                                     <TableCell className="text-xs text-muted-foreground">{item.master_medicines?.manufacturer ?? '-'}</TableCell>
                                    <TableCell>{item.batch_number || '-'}</TableCell>
                                    <TableCell className="text-right font-semibold text-orange-600">{item.quantity}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                         <TableCaption>Showing up to 50 low stock items.</TableCaption>
                    </Table>
                </CardContent>
            </Card>

             {/* Expiring Soon Table */}
            <Card className={`${isLoadingReports ? 'opacity-50 pointer-events-none' : ''}`}>
                <CardHeader>
                    <CardTitle className="flex items-center text-lg"><CalendarClock className="mr-2 h-5 w-5 text-red-500"/> Expiring Soon Items</CardTitle>
                    <CardDescription>Items expiring within the next {EXPIRY_DAYS_THRESHOLD} days.</CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Medicine Name</TableHead>
                                 <TableHead>Manufacturer</TableHead>
                                <TableHead>Batch No.</TableHead>
                                <TableHead className="text-right">Quantity</TableHead>
                                <TableHead className="text-right">Expiry Date</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                             {expiringSoonItems.length === 0 && <TableRow><TableCell colSpan={5} className="text-center h-24 text-muted-foreground">No items expiring soon.</TableCell></TableRow>}
                            {expiringSoonItems.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.master_medicines?.name ?? 'N/A'}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground">{item.master_medicines?.manufacturer ?? '-'}</TableCell>
                                    <TableCell>{item.batch_number || '-'}</TableCell>
                                    <TableCell className="text-right">{item.quantity}</TableCell>
                                    <TableCell className="text-right font-semibold text-red-600">
                                        {/* Ensure correct date formatting, considering potential timezones if stored as TIMESTAMPTZ */}
                                        {item.expiry_date ? format(new Date(item.expiry_date.replace(/-/g, '/')), 'dd MMM yyyy') : '-'}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                         <TableCaption>Showing up to 50 items expiring soon.</TableCaption>
                    </Table>
                </CardContent>
            </Card>

        </div>
    );
}

// --- REMEMBER: DatePickerWithRange component should be in its own file ---
// e.g., components/ui/date-range-picker.tsx
// DO NOT define it here.