// supabase/functions/process-bulk-inventory/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// Match client-side interface, minus __rowNum__
interface InventoryItemPayload {
    medicineName: string;
    batchNumber?: string | null;
    quantity: number;
    mrp?: number | null;
    purchasePrice?: number | null;
    expiryDate?: string | null; // Expect YYYY-MM-DD or parseable date string
}

// Expected request body structure
interface BulkPayload {
  store_id: string;
  inventoryItems: (InventoryItemPayload & { __rowNum__: number })[]; // Include original row number
}

// Structure for items ready to be inserted into DB
interface ValidatedInventoryItem {
     store_id: string;
     medicine_id: string; // Resolved from master_medicines
     batch_number?: string | null;
     quantity: number;
     mrp?: number | null;
     purchase_price?: number | null;
     expiry_date?: string | null; // Formatted as YYYY-MM-DD
}

// Error detail structure
interface RowError {
    rowNum: number;
    error: string;
    rowData: any; // Original row data for context
}

// --- Date Parsing Helper ---
function parseDate(dateStr: string | null | undefined): string | null {
    if (!dateStr) return null;
    try {
        // Attempt to parse common formats or directly from Excel date object if cellDates:true worked
        let date: Date;
        if (dateStr instanceof Date) {
            date = dateStr;
        } else if (typeof dateStr === 'string') {
            // Handle YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY etc. Adjust regex/logic if needed
             const parts = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/); // YYYY-MM-DD
             if (parts) {
                 date = new Date(Date.UTC(parseInt(parts[1]), parseInt(parts[2]) - 1, parseInt(parts[3])));
             } else {
                 // Try creating date directly, might work for some formats like ISO strings or MM/DD/YYYY
                  date = new Date(dateStr);
             }
        } else if (typeof dateStr === 'number') {
             // Handle Excel serial date numbers (requires more complex conversion)
             // For simplicity, we'll treat this as an error for now.
             // You'd typically use a library function or formula for this.
             console.warn(`Excel date number ${dateStr} found, direct conversion not supported here.`);
             throw new Error("Excel date number format not supported.");
        } else {
            throw new Error("Unparseable date format.");
        }


        if (isNaN(date.getTime())) {
            throw new Error("Invalid date value after parsing.");
        }

        // Format to YYYY-MM-DD for Supabase DATE column
        const year = date.getUTCFullYear();
        const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
        const day = date.getUTCDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch (e) {
        console.error(`Date parsing failed for "${dateStr}": ${e.message}`);
        return null; // Indicate parsing failure
    }
}


// --- Core Processing Logic ---
async function processBulkInventory(
    supabaseAdminClient: SupabaseClient,
    userId: string,
    payload: BulkPayload
) {
    console.log(`Processing bulk inventory for user ${userId}, store ${payload.store_id}, items: ${payload.inventoryItems.length}`);
    const { store_id, inventoryItems } = payload;
    const errors: RowError[] = [];
    const validItemsToInsert: ValidatedInventoryItem[] = [];

    // --- 1. Verify Store Ownership ---
    const { data: storeData, error: storeError } = await supabaseAdminClient
        .from('stores')
        .select('id')
        .eq('id', store_id)
        .eq('user_id', userId)
        .single();

    if (storeError || !storeData) {
        throw new Error('Store verification failed or access denied.');
    }
     console.log(`Store ${store_id} verified for user ${userId}.`);

    // --- 2. Process Each Row ---
    // Fetch all relevant master medicines names *once* for efficiency? Or fetch as needed?
    // Fetching as needed might be better if the list is huge, but less efficient for smaller uploads.
    // Let's fetch as needed for simplicity, but consider optimization later.

    for (const item of inventoryItems) {
        try {
            // --- Basic Validation ---
            if (!item.medicineName || typeof item.medicineName !== 'string' || item.medicineName.trim() === '') {
                 throw new Error("Missing or invalid 'Medicine Name'.");
            }
            if (item.quantity == null || isNaN(Number(item.quantity)) || Number(item.quantity) <= 0) {
                 throw new Error("Missing or invalid 'Quantity' (must be a positive number).");
            }
             const quantity = Math.floor(Number(item.quantity)); // Ensure integer quantity

            // --- Find Master Medicine ---
            // Case-insensitive search for exact match recommended for bulk upload clarity
            const searchName = item.medicineName.trim();
            const { data: medData, error: medError } = await supabaseAdminClient
                .from('master_medicines')
                .select('id')
                .ilike('name', searchName) // Use ilike for case-insensitivity
                .limit(2); // Limit to check for ambiguity

            if (medError) throw new Error(`Database error searching for medicine: ${medError.message}`);
            if (!medData || medData.length === 0) throw new Error(`Medicine named '${searchName}' not found in master list.`);
            if (medData.length > 1) throw new Error(`Multiple medicines found matching '${searchName}'. Please use a more specific name.`);

            const medicine_id = medData[0].id;

             // --- Parse/Validate Optional Fields ---
             const batchNumber = item.batchNumber?.toString().trim() || null;
             const mrp = item.mrp != null && !isNaN(Number(item.mrp)) ? Number(item.mrp) : null;
             const purchasePrice = item.purchasePrice != null && !isNaN(Number(item.purchasePrice)) ? Number(item.purchasePrice) : null;
             const expiryDate = parseDate(item.expiryDate); // Use helper to parse/format
             if (item.expiryDate && !expiryDate) {
                  // Warning or error if date provided but couldn't be parsed? Let's make it an error.
                 throw new Error(`Invalid 'Expiry Date' format for value: ${item.expiryDate}`);
             }


            // --- Add Validated Item to Insertion Array ---
            validItemsToInsert.push({
                store_id: store_id,
                medicine_id: medicine_id,
                batch_number: batchNumber,
                quantity: quantity,
                mrp: mrp,
                purchase_price: purchasePrice,
                expiry_date: expiryDate,
            });

        } catch (error) {
             // --- Record Row-Level Errors ---
             console.warn(`Skipping row ${item.__rowNum__}: ${error.message}`);
             errors.push({
                 rowNum: item.__rowNum__,
                 error: error.message,
                 rowData: item // Include original row data for context
             });
        }
    } // End of row processing loop

    console.log(`Validation complete. Valid items: ${validItemsToInsert.length}, Errors: ${errors.length}`);

    // --- 3. Bulk Insert Valid Items ---
    let insertedCount = 0;
    if (validItemsToInsert.length > 0) {
        const { count, error: insertError } = await supabaseAdminClient
            .from('inventory')
            .insert(validItemsToInsert); // Bulk insert!

        if (insertError) {
            console.error("Bulk Insert Error:", insertError);
            // Add a general insert error if bulk fails, though row errors are more common
             throw new Error(`Database bulk insert failed: ${insertError.message}. Some items might not have been added.`);
             // Alternatively, add it to the errors array?
             // errors.push({rowNum: -1, error: `Database bulk insert failed: ${insertError.message}`, rowData: {}});
        }
        insertedCount = count ?? validItemsToInsert.length; // Use returned count if available
        console.log(`Bulk insert successful for ${insertedCount} items.`);
    }


    // --- 4. Return Detailed Result ---
    return {
        success: errors.length === 0 && validItemsToInsert.length > 0, // Consider success only if *all* valid items inserted and no errors? Or partial success? Let's go with partial for now.
        insertedCount: insertedCount,
        skippedCount: errors.length,
        errors: errors, // Return the list of errors
        message: errors.length > 0
            ? `Processed ${inventoryItems.length} rows. Inserted ${insertedCount}, Skipped ${errors.length}.`
            : `Successfully inserted ${insertedCount} inventory items.`
    };
}


// --- Edge Function HTTP Request Handler ---
serve(async (req) => {
  // ... (OPTIONS handler remains the same) ...
  if (req.method === 'OPTIONS') { return new Response('ok', { headers: corsHeaders }); }

  try {
    // ... (Auth, Client setup, User verification remains the same - USE ADMIN CLIENT) ...
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceRoleKey) { throw new Error("Server config error."); }
    const supabaseAdminClient = createClient(supabaseUrl, supabaseServiceRoleKey, { auth: { persistSession: false } });
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error("Auth header missing.");
    const supabaseUserClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } });
    const { data: { user }, error: userError } = await supabaseUserClient.auth.getUser();
     if (userError || !user) { return new Response(JSON.stringify({ success: false, message: 'Authentication failed.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }


    // --- Get Request Body ---
    if (!req.body) throw new Error("Missing request body.");
    const payload: BulkPayload = await req.json();
     if (!payload || typeof payload !== 'object' || !payload.store_id || !Array.isArray(payload.inventoryItems)) {
       throw new Error("Invalid request payload structure.");
     }

    // --- Execute Processing Logic ---
    const result = await processBulkInventory(supabaseAdminClient, user.id, payload);

    // --- Return Success/Partial Success Response ---
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      // Status 200 even for partial success, client checks 'errors' array
      status: 200,
    });
  } catch (error) {
    // --- Return Error Response ---
    console.error('Bulk Inventory Function Error:', error);
    const status = (error.message.includes('verification failed') || error.message.includes('Invalid request payload')) ? 400 : 500;
    return new Response(JSON.stringify({ success: false, message: error.message, errors: [] }), { // Ensure errors array is present even on top-level fail
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: status,
    });
  }
});
console.log("Process-bulk-inventory Edge Function handler loaded.");