import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("❌ Supabase configuration is missing!");

  if (!SUPABASE_URL) {
    console.error("VITE_SUPABASE_URL is missing.");
  }

  if (!SUPABASE_ANON_KEY) {
    console.error("VITE_SUPABASE_ANON_KEY is missing.");
  }
}

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

export { createClient };
