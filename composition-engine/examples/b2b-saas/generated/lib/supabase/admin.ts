import { createClient } from '@supabase/supabase-js';

/**
 * Service-role client for trusted server code (webhooks, background jobs).
 * It bypasses row level security: never import it from client components
 * and never expose the service role key to the browser.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
