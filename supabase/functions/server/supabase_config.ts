/**
 * Supabase config for the server. All values must come from environment variables.
 * Set SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY in your deployment env.
 */
export const projectId = Deno.env.get('SUPABASE_URL')?.replace('https://', '').replace('.supabase.co', '') ?? '';
export const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
export const publicAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
export const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
