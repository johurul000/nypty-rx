// supabase/functions/process-sale/index.ts (Conceptual Example - Needs Transaction Handling)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// --- Interfaces ---
interface SaleItemPayload { // Item details from the client's bill cart
  inventory_id: string;
  quantity_sold: number;
  price_per_unit: number;
  total_price: number;
  medicine_name: string;
}

interface SalePayload { // Overall payload from the client
  store_id: string;
  customer_name?: string | null;
  total_amount: number;
  items: SaleItemPayload[];
}

// --- Main Function ---
serve(async (req) => {
  // --- CORS Preflight ---
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // --- Initialize Supabase Admin Client ---
  let supabaseAdmin;
  try {
     supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Use Service Role Key!
      { auth: { persistSession: false } }
    );
  } catch (initError) {
      console.error("Failed to initialize Supabase client:", initError);
      return new Response(JSON.stringify({ success: false, message: "Server configuration error." }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }


  // --- Main Logic within Try/Catch ---
  try {
    const payload: SalePayload = await req.json();
    const { store_id, customer_name, total_amount, items } = payload;

    // --- Payload Validation ---
    if (!store_id || !items || items.length === 0 || total_amount == null) {
        throw new Error("Missing required fields: store_id, items array, total_amount.");
    }
    if (items.some(item => !item.inventory_id || item.quantity_sold <= 0)) {
        throw new Error("Invalid sale item data: Missing inventory_id or non-positive quantity_sold.");
    }

    // --- Authorization Check (Placeholder - Implement based on your needs) ---
    // const userJwt = req.headers.get('Authorization')?.replace('Bearer ', '');
    // if (!userJwt) throw new Error("Unauthorized: Missing token.");
    // const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(userJwt);
    // if (userError || !user) throw new Error("Unauthorized: Invalid token.");
    // Add logic to verify user owns store_id...

    // --- Generate Bill Number ---
    const bill_number = `B-${store_id.substring(0, 4).toUpperCase()}-${Date.now()}`; // Example generation

    // --- *** ATOMIC OPERATION REQUIRED HERE *** ---
    // The following steps (check stock, insert sale, insert items, update inventory)
    // MUST happen within a single database transaction.
    // The BEST way is to create a PL/pgSQL function in Supabase SQL Editor
    // and call it here via RPC.

    // --- Conceptual Call to a Database Function (RECOMMENDED APPROACH) ---
    /*
    const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc(
      'create_sale_and_update_inventory', // Name of your PL/pgSQL function
      {
        p_store_id: store_id,
        p_customer_name: customer_name,
        p_total_amount: total_amount,
        p_bill_number: bill_number,
        p_sale_items: items // Pass items array (DB function needs matching type)
      }
    );

    if (rpcError) {
      // The DB function handles atomicity; if it errors, nothing committed.
      throw new Error(rpcError.message || "Database transaction failed.");
    }
    const newSaleId = rpcData?.sale_id; // Assuming DB function returns the new sale ID
    if (!newSaleId) {
        throw new Error("Database function succeeded but did not return a sale ID.");
    }
    */

    // --- OR: Sequential Operations (NOT ATOMIC - Higher Risk of Inconsistency) ---
    // ** If NOT using a DB function, implement the logic below, **
    // ** but understand the risk if a step fails mid-way. **

    // 1. Check Stock for all items FIRST
    const inventoryChecks = await Promise.all(items.map(item =>
        supabaseAdmin
            .from('inventory')
            .select('quantity')
            .eq('id', item.inventory_id)
            .eq('store_id', store_id) // Verify item belongs to the store
            .single()
    ));

    const inventoryUpdates: { id: string; newQuantity: number }[] = [];
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const checkResult = inventoryChecks[i];

        if (checkResult.error || !checkResult.data) {
            throw new Error(`Inventory check failed for ${item.medicine_name} (ID: ${item.inventory_id}): ${checkResult.error?.message || 'Not found'}`);
        }
        const currentQuantity = checkResult.data.quantity;
        if (item.quantity_sold > currentQuantity) {
            throw new Error(`Insufficient stock for ${item.medicine_name} (Batch ID: ${item.inventory_id}). Available: ${currentQuantity}, Requested: ${item.quantity_sold}`);
        }
        inventoryUpdates.push({
            id: item.inventory_id,
            newQuantity: currentQuantity - item.quantity_sold
        });
    }
    // If we reach here, all stock checks passed *at the time of checking*.

    // 2. Insert into 'sales'
    const { data: saleData, error: saleInsertError } = await supabaseAdmin
        .from('sales').insert({ /* ...sale details... */ bill_number: bill_number, store_id: store_id, customer_name: customer_name, total_amount: total_amount })
        .select('id').single();
    if (saleInsertError || !saleData) throw new Error(saleInsertError?.message || "Failed to create sale record.");
    const newSaleId = saleData.id;

    // 3. Insert into 'sale_items'
    const saleItemsToInsert = items.map(item => ({ /* ...item details... */ sale_id: newSaleId, inventory_id: item.inventory_id, medicine_name: item.medicine_name, quantity_sold: item.quantity_sold, price_per_unit: item.price_per_unit, total_price: item.total_price }));
    const { error: itemsInsertError } = await supabaseAdmin.from('sale_items').insert(saleItemsToInsert);
    if (itemsInsertError) { console.error("!!! Failed sale_items insert AFTER sale insert !!!"); throw new Error(itemsInsertError.message || "Failed to insert sale items."); }

    // 4. *** Update 'inventory' quantities *** (The critical part)
    const updatePromises = inventoryUpdates.map(update =>
        supabaseAdmin
            .from('inventory')
            .update({ quantity: update.newQuantity })
            .eq('id', update.id)
    );
    const updateResults = await Promise.all(updatePromises);

    // Check if any inventory update failed
    const updateErrors = updateResults.map(res => res.error).filter(Boolean);
    if (updateErrors.length > 0) {
        console.error(`!!! Failed inventory update(s) AFTER sale/items insert !!! Errors: ${updateErrors.map(e => e?.message).join(', ')}`);
        // This is where data becomes inconsistent without a transaction!
        // We should ideally roll back, but we can't easily here.
        // For now, report the overall failure but acknowledge inconsistency.
        throw new Error(`Sale recorded but failed to update inventory: ${updateErrors[0]?.message}`);
    }
    // --- END SEQUENTIAL (Non-Atomic) SECTION ---


    // --- Success Response ---
    return new Response(
        JSON.stringify({ success: true, saleId: newSaleId, bill_number: bill_number }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    // --- Error Response ---
    console.error("Process Sale Function Error:", error);
    return new Response(
        JSON.stringify({ success: false, message: error.message || "An unknown error occurred." }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: error.message?.includes("stock") || error.message?.includes("Invalid") ? 400 : 500 } // Use 400 for validation/stock errors, 500 otherwise
    );
  }
});