/**
 * SOFIA - Workspace Bootstrap Module
 * Responsável por criar automaticamente a estrutura de tabelas no Supabase do usuário.
 */

import { createClient } from '@supabase/supabase-js';

export async function bootstrapUserWorkspace(url, key) {
  const supabase = createClient(url, key);
  
  const tables = [
    {
      name: 'appsofia_tasks',
      sql: `
        CREATE TABLE IF NOT EXISTS public.appsofia_tasks (
          id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
          created_at timestamptz DEFAULT now(),
          user_name text,
          client_uuid uuid,
          session_user_id uuid,
          user_uuid uuid,
          url text,
          slug text,
          origin_provider text,
          agente text,
          status text DEFAULT 'STAGED',
          extractor_status text DEFAULT 'STAGED',
          downloader_status text DEFAULT 'STAGED',
          metadata jsonb DEFAULT '{}'::jsonb
        );
      `
    },
    {
      name: 'user_origin_providers',
      sql: `
        CREATE TABLE IF NOT EXISTS public.user_origin_providers (
          id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
          created_at timestamptz DEFAULT now(),
          user_uuid uuid,
          client_uuid uuid,
          origin_provider text,
          UNIQUE(user_uuid, origin_provider)
        );
      `
    }
  ];

  const results = [];

  for (const table of tables) {
    try {
      // Como o Supabase JS não tem um comando direto para executar SQL arbitrário (por segurança),
      // o ideal é que o usuário execute o SQL manualmente ou use uma Edge Function.
      // Para o bootstrap automático via cliente, tentamos verificar se a tabela existe.
      const { error } = await supabase.from(table.name).select('*').limit(1);
      
      if (error && (error.code === 'PGRST116' || error.message.includes('does not exist'))) {
        results.push({ table: table.name, status: 'missing', message: 'Tabela não encontrada. Por favor, use o SQL Editor no Supabase.' });
      } else if (error) {
        results.push({ table: table.name, status: 'error', message: error.message });
      } else {
        results.push({ table: table.name, status: 'ok', message: 'Tabela pronta.' });
      }
    } catch (e) {
      results.push({ table: table.name, status: 'error', message: e.message });
    }
  }

  return results;
}
