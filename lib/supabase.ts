import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE;
if (!url || !serviceRole) {
  // We avoid throwing at import-time to keep non-admin pages working
  // Upload API will validate again
}

export function getSupabaseServiceClient() {
  if (!url || !serviceRole) throw new Error('Supabase env tidak lengkap');
  return createClient(url, serviceRole, { auth: { persistSession: false } });
}


