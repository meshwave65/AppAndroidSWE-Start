import { createClient } from "@supabase/supabase-js";

// Usar variáveis de ambiente do Render (via secrets) ou fallback para chaves reais
const SUPABASE_URL = 
  import.meta.env.VITE_SUPABASE_URL || 
  process.env.VITE_SUPABASE_URL ||
  "https://ufylccbdjfzydbwhpmpp.supabase.co";

const SUPABASE_ANON_KEY = 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  process.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmeWxjY2JkamZ6eWRid2hwbXBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3MDE1NjgsImV4cCI6MjA3NzI3NzU2OH0.SqbNgLH2_0gRwrQokFQpZgnIjzH2vVZtpoqmqj8tCgk";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("❌ Supabase configuration is missing!");
  console.error("SUPABASE_URL:", SUPABASE_URL);
  console.error("SUPABASE_ANON_KEY:", SUPABASE_ANON_KEY ? "***" : "missing");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
