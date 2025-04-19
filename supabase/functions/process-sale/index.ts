// supabase/functions/process-sale/index.ts

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts'; // Import shared CORS headers

// Define the expected structure for items in the payload
interface SaleItemPayload {
  inventory_id: string;
  quantity_sold: number;
  price_per_unit: number;
  total_price: number;
  medicine_name: string; // Denormalized name
}

// Define the expected structure for the main request payload
interface SalePayload {
  store_id: string;
  customer_name?: string | null;
  total_amount: number;
  items: SaleItemPayload[]; // Array of sale items
}

// --- Helper Function to Generate Bill Number ---
// Customize this logic based on your desired format
function generateBillNumber(storeId: string): string {
  const date = new Date();
  const prefix = storeId.substring(0, 4).toUpperCase();
  // Format: YYYYMMDD-HHMMSS-Random(3)
  const datePart = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;
  const timePart = `${date.getHours().toString().padStart(2, '0')}${date.getMinutes().toString().padStart(2, '0')}${date.getSeconds().toString().padStart(2, '0')}`;
  const randomPart = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}-${datePart}-${timePart}-${randomPart}`;
}


// --- Core Logic: Calls the Database Function ---
// This function assumes the existence of a PostgreSQL function named 'create_sale_and_update_inventory'
async function processSaleTransaction(
  supabaseAdminClient: SupabaseClient, // Use Admin client for RPC if SECURITY DEFINER is used on DB func
  userId: string, // ID of the authenticated user calling the function
  payload: SalePayload
) {
  console.log(`Processing sale for user ${userId}, store ${payload.store_id}`);

  // --- 1. Verify Store Ownership (Security Check) ---
  // Ensure the user calling the function owns the store they're trying to bill for.
  const { data: storeData, error: storeError } = await supabaseAdminClient
    .from('stores')
    .select('id')
    .eq('id', payload.store_id)
    .eq('user_id', userId) // Match against the authenticated user ID
    .single(); // Expect only one matching store

  if (storeError || !storeData) {
    console.error(`Store verification failed for user ${userId}, store ${payload.store_id}:`, storeError?.message || 'Store not found or access denied.');
    throw new Error('Store verification failed or access denied.');
  }
  console.log(`Store ${payload.store_id} ownership verified for user ${userId}.`);

  // --- 2. Prepare Payload for the Database Function ---
  const generatedBillNo = generateBillNumber(payload.store_id);
  const dbFunctionPayload = {
    p_store_id: payload.store_id,
    p_customer_name: payload.customer_name,
    p_total_amount: payload.total_amount,
    p_sale_items: payload.items, // Pass the items array as JSONB
    p_bill_number: generatedBillNo
  };
  console.log("Calling DB function 'create_sale_and_update_inventory' with payload:", dbFunctionPayload);


  // --- 3. Call the Database Function via RPC ---
  // This function handles the atomic transaction (inserts/updates)
  const { data: rpcData, error: rpcError } = await supabaseAdminClient.rpc(
    'create_sale_and_update_inventory', // Ensure this matches your DB function name
     dbFunctionPayload
  );

  if (rpcError) {
    console.error(`RPC Error calling DB function for store ${payload.store_id}:`, rpcError);
    // Check for specific errors raised by the DB function
     if (rpcError.message.includes('Insufficient stock')) {
        throw new Error('Insufficient stock for one or more items.');
     }
    throw new Error(`Database transaction failed: ${rpcError.message}`);
  }

  // --- 4. Validate DB Function Response and Return Success ---
  if (!rpcData || !rpcData[0]?.sale_id || !rpcData[0]?.bill_number) {
      // Note: RPC often returns an array, access the first element if needed. Adjust based on actual return structure.
      console.error('DB function succeeded but did not return expected sale_id/bill_number:', rpcData);
      throw new Error('Internal server error: Failed to retrieve sale details after creation.');
   }

   console.log(`Successfully processed sale. Sale ID: ${rpcData[0].sale_id}, Bill No: ${rpcData[0].bill_number}`);
  // The DB function should return the new sale ID and bill number
  return {
    success: true,
    saleId: rpcData[0].sale_id, // Adjust access based on DB function return type (TABLE returns array)
    bill_number: rpcData[0].bill_number
  };
}


// --- Edge Function HTTP Request Handler ---
serve(async (req: Request) => {
  console.log(`New Request - Method: ${req.method}, URL: ${req.url}`);

  // --- Handle CORS Preflight Request ---
  // Browsers send OPTIONS request first for cross-origin POST requests
  if (req.method === 'OPTIONS') {
    console.log("Handling OPTIONS preflight request.");
    return new Response('ok', { headers: corsHeaders });
  }

  // --- Main Request Processing ---
  try {
    // --- Environment Variable Check ---
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); // Use Service Role Key for admin actions like RPC

    if (!supabaseUrl || !supabaseServiceRoleKey) {
        console.error("Missing Supabase environment variables (URL or SERVICE_ROLE_KEY).");
        throw new Error("Server configuration error.");
    }

    // --- Create Supabase Admin Client ---
    // Use Service Role Key here for potentially calling SECURITY DEFINER functions
    // or bypassing RLS if absolutely necessary (use with caution).
    // The user's identity is still verified using the Authorization header below.
    const supabaseAdminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
       auth: { // Important: prevent client persistence for server-side use
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
       },
    });
    console.log("Supabase Admin Client created.");

    // --- Authenticate User from Request Header ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error("Missing Authorization header.");
    }
    // Create a temporary client *just* for getting the user based on the provided token
    const supabaseUserClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, { // Anon key is fine here
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data: { user }, error: userError } = await supabaseUserClient.auth.getUser();

    if (userError || !user) {
      console.error('User authentication failed:', userError?.message || 'No user found for token.');
      // Return 401 Unauthorized
       return new Response(JSON.stringify({ success: false, message: 'Authentication required or token invalid.' }), {
           status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
       });
    }
    console.log(`Authenticated user ID: ${user.id}`);

    // --- Parse Request Body ---
    if (!req.body) {
        throw new Error("Request body is missing.");
    }
    const payload: SalePayload = await req.json();
     if (!payload || typeof payload !== 'object' || !payload.store_id || !Array.isArray(payload.items) || typeof payload.total_amount !== 'number') {
       throw new Error("Invalid request payload structure or missing required fields.");
     }
    console.log("Request payload parsed successfully.");

    // --- Execute Core Transaction Logic ---
    const result = await processSaleTransaction(supabaseAdminClient, user.id, payload);

    // --- Return Success Response ---
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200, // OK
    });

  } catch (error) {
    // --- Return Error Response ---
    console.error('Edge Function encountered an error:', error);
    // Determine appropriate status code (4xx for client errors, 5xx for server errors)
    const status = (error.message.includes('verification failed') || error.message.includes('Invalid request payload') || error.message.includes('Insufficient stock')) ? 400 : 500;

    return new Response(JSON.stringify({ success: false, message: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: status,
    });
  }
});

console.log("Process-sale Edge Function handler loaded."); // Log on initial load