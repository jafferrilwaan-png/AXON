import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://qabjhnybmlxhxyxvjvtg.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhYmpobnlibWx4aHh5eHZqdnRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0ODg2MDksImV4cCI6MjA5MzA2NDYwOX0.Z36bxhNU30zAv3L-qZXNTIvXmoYkRWsXdXj-5lI6gLA'

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('AXON: Supabase credentials missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your secrets.')
}

export const supabase = createClient(
  supabaseUrl || 'https://missing-url.supabase.co',
  supabaseAnonKey || 'missing-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
)

export const hasSupabaseKeys = Boolean(supabaseUrl && supabaseUrl !== '' && !supabaseUrl.includes('missing-url'));
