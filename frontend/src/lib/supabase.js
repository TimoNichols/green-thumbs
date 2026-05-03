import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

export const SUPABASE_URL = "https://kpgfaimeepellbulahuq.supabase.co";
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwZ2ZhaW1lZXBlbGxidWxhaHVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3NzE0OTMsImV4cCI6MjA5MzM0NzQ5M30.CV4R9C4rFIvbs2i6yQPdAOZEdiQ1-bq6qkXesGkqj4o";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
