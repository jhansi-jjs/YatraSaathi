import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://jytawdehzinxixvioinm.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5dGF3ZGVoemlueGl4dmlvaW5tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUwNjc4NzQsImV4cCI6MjEwMDY0Mzg3NH0.YkKQTmetm2ea86RZZyKkXl_ZTsfA4NyUvuZA2GON8Pg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
