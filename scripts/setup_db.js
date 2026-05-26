/**
 * SOFIA - Local Infrastructure Setup Script
 * Este script pode ser executado localmente via Node.js para configurar seu Supabase.
 * 
 * Uso: 
 * 1. Preencha as variáveis de ambiente no arquivo .env ou diretamente aqui.
 * 2. Execute: node scripts/setup_db.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'SUA_URL_AQUI';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'SUA_SERVICE_ROLE_KEY_AQUI';

if (SUPABASE_URL === 'SUA_URL_AQUI' || SUPABASE_KEY === 'SUA_SERVICE_ROLE_KEY_AQUI') {
  console.error('❌ Erro: Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no seu ambiente.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const SQL_TABLES = `
-- Criar tabela de tarefas
CREATE TABLE IF NOT EXISTS public.appsofia_tasks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  user_name text,
  client_uuid uuid,
  session_user_id uuid,
  user_uuid uuid,
  full_url text,
  slug text,
  origin_provider text,
  agente text,
  status text DEFAULT 'STAGED',
  extractor_status text DEFAULT 'STAGED',
  downloader_status text DEFAULT 'STAGED',
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Criar tabela de providers
CREATE TABLE IF NOT EXISTS public.user_origin_providers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  user_uuid uuid,
  client_uuid uuid,
  origin_provider text,
  UNIQUE(user_uuid, origin_provider)
);

-- Criar tabela de agentes
CREATE TABLE IF NOT EXISTS public.user_agents (
  id bigserial not null,
  client_uuid uuid not null,
  user_uuid uuid not null,
  agent_name text not null,
  created_at timestamp with time zone null default now(),
  constraint user_agents_pkey primary key (id),
  constraint user_agents_unique unique (user_uuid, agent_name)
);
`;

async function setup() {
  console.log('🚀 Iniciando Setup da Infraestrutura Sofia...');

  // 1. Criar Bucket
  console.log('📦 Criando Bucket de Storage...');
  const { data: bucket, error: bucketError } = await supabase.storage.createBucket('sofia_storage_user', {
    public: true
  });

  if (bucketError && bucketError.message.includes('already exists')) {
    console.log('✅ Bucket já existe. Pulando...');
  } else if (bucketError) {
    console.error('❌ Erro ao criar bucket:', bucketError.message);
  } else {
    console.log('✅ Bucket criado com sucesso!');
  }

  // 2. Criar Tabelas
  // Nota: O cliente JS não executa SQL arbitrário. 
  // Em um script local, recomendamos usar a biblioteca 'pg' ou o CLI do Supabase.
  console.log('\n📝 INSTRUÇÃO PARA TABELAS:');
  console.log('Como o SDK do Supabase não executa SQL DDL diretamente por segurança,');
  console.log('por favor, execute o seguinte SQL no seu SQL Editor do dashboard:\n');
  console.log(SQL_TABLES);
  
  console.log('\n✨ Setup finalizado!');
}

setup();
