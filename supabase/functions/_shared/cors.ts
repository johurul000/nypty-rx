// supabase/functions/_shared/cors.ts
export const corsHeaders = {
    'Access-Control-Allow-Origin': '*', // Or your specific origin(s)
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS', // MUST include OPTIONS
  };