/* 
 * Supabase configuration
 * This file contains the Supabase URL and keys used by the server.
 * In production, these should come from environment variables.
 */

export const projectId = "ksqwrjtjnlxojslzedyr";
export const supabaseUrl = `https://${projectId}.supabase.co`;
export const publicAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzcXdyanRqbmx4b2pzbHplZHlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2Mzc5MzUsImV4cCI6MjA4NzIxMzkzNX0.eeHuSxuDzuRxPxOTISEHCkB85Rus6xtt7aAQqm6qsv8";

// Service role key must come from environment variable for security
export const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
