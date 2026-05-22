# Análise de Pendências e Melhorias - AppAndroidSWE

## 📊 Estado Atual do Projeto

### ✅ O que já foi implementado:

1. **Interface Mobile-First**
   - Layout responsivo com navegação inferior
   - 6 abas principais (Auth, Insert, Tasks, Files, Search, Settings)
   - Toast notifications para feedback
   - Modal para preview de arquivos

2. **Autenticação**
   - Login com email/username
   - Registro com código de convite
   - Restauração de sessão
   - Persistência de dados do usuário

3. **Configuração de Banco de Dados**
   - Campo de Connection String (URI)
   - Parsing automático de URI
   - Substituição de placeholder `[YOUR-PASSWORD]`
   - Botão de teste de conexão
   - Salvamento em `user_configurations`

4. **Configuração de Storage**
   - Campo para URL do Supabase
   - Campo para Anon Key
   - Teste de conexão
   - Salvamento em `user_configurations`

5. **Sincronização de Origin Provider**
   - Função `extractOriginProvider()` identifica provedor (manus, chatgpt, grok, etc)
   - Salva em `origin_provider` na tabela `appsofia_tasks`
   - Filtros de LLM carregados de `user_origin_providers`

6. **Gerenciamento de Tarefas**
   - Listagem com filtros (agente, LLM, status)
   - Seleção múltipla
   - Ações (Play, Pause, Stop, Delete)
   - Refresh automático/manual

7. **Explorador de Arquivos**
   - Estrutura hierárquica (Provider → Task → Files)
   - Filtros avançados
   - Preview de documentos
   - Download de arquivos
   - Suporte a múltiplos formatos

---

## 🚧 Pendências Identificadas

### 1. **Migração de Dados para Banco do Usuário**
**Status**: Não implementado  
**Descrição**: Quando o usuário configura seu próprio banco de dados, o sistema deve:
- Copiar tarefas existentes para o banco do usuário
- Manter sincronização entre banco central e banco do usuário
- Garantir que novos registros vão para o banco do usuário

**Arquivos afetados**: `src/main.js`  
**Prioridade**: 🔴 Alta

### 2. **Sincronização de `user_origin_providers`**
**Status**: Parcialmente implementado  
**Descrição**: A tabela `user_origin_providers` deve ser alimentada:
- Quando uma tarefa é inserida com um novo origin_provider
- Quando dados são migrados para o banco do usuário
- Manter registro único de provedores por usuário

**Arquivos afetados**: `src/main.js`  
**Prioridade**: 🔴 Alta

### 3. **Seção de Migração de Dados na UI**
**Status**: Não implementado  
**Descrição**: Adicionar na aba de Settings:
- Status da migração (quantas tarefas foram migradas)
- Botão para iniciar migração manual
- Indicador visual de progresso
- Histórico de migrações

**Arquivos afetados**: `index.html`, `src/main.js`, `src/style.css`  
**Prioridade**: 🟡 Média

### 4. **Validação e Tratamento de Erros**
**Status**: Parcialmente implementado  
**Descrição**: Melhorar:
- Validação de URI de banco de dados
- Tratamento de erros de conexão
- Mensagens de erro mais descritivas
- Retry automático em caso de falha

**Arquivos afetados**: `src/main.js`  
**Prioridade**: 🟡 Média

### 5. **Documentação de API para Testes**
**Status**: Não implementado  
**Descrição**: Documentar endpoints esperados do backend:
- `/test-db` - Teste de conexão com banco
- `/test-storage` - Teste de conexão com storage
- `/migrate-tasks` - Migração de tarefas
- `/sync-origin-providers` - Sincronização de provedores

**Arquivos afetados**: `README.md`  
**Prioridade**: 🟡 Média

---

## 🔧 Melhorias Propostas

### Melhoria 1: Função de Migração de Dados
```javascript
async function migrateTasksToUserDB() {
  if (!USER_CONFIG.database) {
    showToast("Configure o banco de dados primeiro", "error");
    return;
  }
  
  // 1. Buscar tarefas do banco central
  // 2. Inserir no banco do usuário
  // 3. Sincronizar origin_providers
  // 4. Atualizar status de migração
}
```

### Melhoria 2: Sincronização de Origin Providers
```javascript
async function ensureOriginProviderInUserDB(user_uuid, origin_provider) {
  // Verificar se já existe
  // Se não, inserir em user_origin_providers
  // Manter registro único por (user_uuid, origin_provider)
}
```

### Melhoria 3: Seção de Migração na UI
- Card com status de migração
- Botão "Iniciar Migração"
- Indicador de progresso
- Histórico de migrações

### Melhoria 4: Melhor Tratamento de Erros
- Validação de URI mais robusta
- Mensagens de erro específicas
- Retry automático com backoff
- Log de erros para debugging

---

## 📋 Checklist de Implementação

- [ ] Implementar `migrateTasksToUserDB()`
- [ ] Implementar `ensureOriginProviderInUserDB()`
- [ ] Adicionar seção de migração no HTML
- [ ] Adicionar estilos para migração
- [ ] Melhorar validação de URI
- [ ] Melhorar tratamento de erros
- [ ] Atualizar README com documentação de API
- [ ] Testar fluxo completo de migração
- [ ] Fazer commit e push

---

## 🎯 Próximos Passos

1. **Implementar funções de migração** em `src/main.js`
2. **Adicionar UI para migração** em `index.html` e `src/style.css`
3. **Melhorar validação** de entrada de dados
4. **Testar** fluxo completo
5. **Documentar** mudanças no README
6. **Fazer commit** e push para o repositório

---

**Data**: 2026-05-22  
**Status**: 🔄 Em Progresso
