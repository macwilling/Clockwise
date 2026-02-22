/**
 * Supabase config for the frontend. Required for the app to work.
 * Copy .env.example to .env and set VITE_SUPABASE_PROJECT_ID and VITE_SUPABASE_ANON_KEY
 * (get values from Supabase Dashboard → Settings → API).
 */
export const projectId = import.meta.env?.VITE_SUPABASE_PROJECT_ID ?? '';
export const publicAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY ?? '';
