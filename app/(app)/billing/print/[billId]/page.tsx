// app/(app)/billing/print/[billId]/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation'; // Use useParams to get URL param
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/context/AuthProvider'; // Optional: for user context if needed
import { Store, Sale, SaleItem } from '@/types';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Loader2, Printer, ArrowLeft, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

// Helper Function for Currency Formatting
const formatCurrency = (value: number | string | null | undefined): string => {
    const number = Number(value);
    if (value == null || isNaN(number)) return '₹ -.--';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(number);
};

export default function BillPrintPage() {
    const supabase = createClient();
    const params = useParams(); // Get dynamic route parameters
    const router = useRouter();
    const { user } = useAuth(); // Get user if needed for checks
    const billId = params.billId as string; // Extract billId from URL

    const [sale, setSale] = useState<Sale | null>(null);
    const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
    const [store, setStore] = useState<Store | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // const printableAreaRef = useRef<HTMLDivElement>(null); // Ref for the printable area

    useEffect(() => {
        const fetchBillData = async () => {
            if (!billId || !user) {
                setError("Invalid request or not authenticated.");
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            setError(null);

            try {
                // 1. Fetch Sale details using the bill ID (which is the sale UUID)
                const { data: saleData, error: saleError } = await supabase
                    .from('sales')
                    .select('*')
                    .eq('id', billId)
                    .single(); // Expect only one bill with this ID

                if (saleError || !saleData) {
                    throw new Error(saleError?.message || "Bill not found.");
                }

                // Security Check: Ensure the fetched sale belongs to the logged-in user's store
                const { data: storeCheck, error: storeCheckError } = await supabase
                    .from('stores')
                    .select('id')
                    .eq('id', saleData.store_id)
                    .eq('user_id', user.id) // Check ownership
                    .maybeSingle();

                if (storeCheckError || !storeCheck) {
                     throw new Error("Access denied or store mismatch.");
                }

                setSale(saleData);

                // 2. Fetch Store details using store_id from the sale
                const { data: storeData, error: storeError } = await supabase
                    .from('stores')
                    .select('*')
                    .eq('id', saleData.store_id)
                    .single();

                if (storeError || !storeData) {
                    throw new Error(storeError?.message || "Store details not found.");
                }
                setStore(storeData);

                // 3. Fetch Sale Items associated with the sale ID
                const { data: itemsData, error: itemsError } = await supabase
                    .from('sale_items')
                    .select('*')
                    .eq('sale_id', saleData.id); // Use the sale's ID

                if (itemsError) {
                    throw new Error(itemsError.message || "Could not fetch bill items.");
                }
                setSaleItems(itemsData || []);

            } catch (err: any) {
                console.error("Error fetching bill data:", err);
                setError(err.message);
                setSale(null);
                setStore(null);
                setSaleItems([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchBillData();
    }, [billId, user, supabase]); // Re-fetch if billId or user changes

    // --- Print Handler ---
    const handlePrint = () => {
        // We rely on CSS @media print rules to style the output
        window.print();
    };

    // --- Render States ---
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Loading Bill Details...</p>
            </div>
        );
    }

    if (error || !sale || !store) {
        return (
            <Card className="m-4 border-destructive bg-destructive/10 max-w-lg mx-auto">
                <CardHeader>
                    <CardTitle className="text-destructive flex items-center">
                        <AlertTriangle className='mr-2 h-5 w-5'/> Error Loading Bill
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p>{error || "Could not load bill details. Please check the ID or try again."}</p>
                    <Button variant="outline" onClick={() => router.back()}>
                         <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
                    </Button>
                </CardContent>
            </Card>
        );
    }

    // --- Render Bill ---
    return (
        <div className="max-w-3xl mx-auto p-4 md:p-6 lg:p-8 bg-background">
            {/* --- Action Buttons (Hidden on Print) --- */}
            <div className="mb-6 flex justify-between items-center no-print">
                <Button variant="outline" size="sm" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Billing
                </Button>
                <Button size="sm" onClick={handlePrint}>
                    <Printer className="mr-2 h-4 w-4" /> Print Bill
                </Button>
            </div>

            {/* --- Printable Bill Area --- */}
            {/* Add ref here if you need JS manipulation, but often CSS is enough */}
            <Card className="printable-area border shadow-none print:shadow-none print:border-none">
                <CardContent className="p-6 print:p-2"> {/* Adjust padding for print */}
                    {/* Bill Header: Store Info */}
                    <div className="text-center mb-6 print:mb-3">
                        <h1 className="text-xl font-bold print:text-lg">{store.name}</h1>
                        <p className="text-sm text-muted-foreground print:text-xs">
                            {store.address}{store.address && (store.city || store.state) ? ', ' : ''}
                            {store.city}{store.city && store.state ? ', ' : ''}{store.state} {store.zip_code}
                        </p>
                        {/* Add Phone/GST here if available in store details */}
                        {/* <p className="text-sm text-muted-foreground print:text-xs">Phone: {store.phone}</p> */}
                        {/* <p className="text-sm text-muted-foreground print:text-xs">GSTIN: {store.gstin}</p> */}
                    </div>

                    <Separator className="my-4 print:my-2"/>

                    {/* Bill Header: Bill Details */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mb-6 print:text-xs print:mb-3">
                        <div><span className="font-semibold">Bill No:</span> {sale.bill_number}</div>
                        <div className="text-right"><span className="font-semibold">Date:</span> {format(new Date(sale.sale_date), 'dd MMM yyyy, hh:mm a')}</div>
                        <div><span className="font-semibold">Customer:</span> {sale.customer_name || 'Walk-in'}</div>
                    </div>

                    {/* Items Table */}
                    <div className="border-t border-b print:border-t-0 print:border-b-0">
                        <Table className="print:text-xs">
                            <TableHeader>
                                <TableRow className="print:border-b print:border-black">
                                    <TableHead className="w-[40px] print:p-1">S.No</TableHead>
                                    <TableHead className="print:p-1">Item Description</TableHead>
                                    {/* Add Batch/Expiry if needed and available in saleItems */}
                                    {/* <TableHead className="print:p-1">Batch</TableHead> */}
                                    {/* <TableHead className="print:p-1">Expiry</TableHead> */}
                                    <TableHead className="text-center print:p-1">Qty</TableHead>
                                    <TableHead className="text-right print:p-1">Rate</TableHead>
                                    <TableHead className="text-right print:p-1">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {saleItems.map((item, index) => (
                                    <TableRow key={item.id} className="print:border-0">
                                        <TableCell className="print:p-1">{index + 1}</TableCell>
                                        <TableCell className="font-medium print:p-1">{item.medicine_name}</TableCell>
                                        {/* Display Batch/Expiry if added */}
                                        {/* <TableCell className="print:p-1">{item.batch_number || '-'}</TableCell> */}
                                        {/* <TableCell className="print:p-1">{item.expiry_date ? format(new Date(item.expiry_date), 'MM/yy') : '-'}</TableCell> */}
                                        <TableCell className="text-center print:p-1">{item.quantity_sold}</TableCell>
                                        <TableCell className="text-right print:p-1">{formatCurrency(item.price_per_unit)}</TableCell>
                                        <TableCell className="text-right print:p-1">{formatCurrency(item.total_price)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Bill Summary */}
                    <div className="flex justify-end mt-6 print:mt-3">
                        <div className="w-full max-w-[250px] space-y-2 text-sm print:text-xs">
                             <Separator className="my-2 print:my-1"/>
                            <div className="flex justify-between font-bold text-base print:text-sm">
                                <span>Grand Total:</span>
                                <span>{formatCurrency(sale.total_amount)}</span>
                            </div>
                             {/* Add Amount in words if needed */}
                        </div>
                    </div>

                    {/* Footer Message */}
                    <div className="mt-8 pt-4 border-t text-center text-xs text-muted-foreground print:mt-4 print:pt-2">
                        Thank you for your purchase!
                        {/* Add other terms or notes here */}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}