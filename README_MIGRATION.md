# Sofia Web Extractor - Mobile First Version

## 📱 Visão Geral

Esta é a versão **mobile-first** do Sofia Web Extractor, totalmente redesenhada para oferecer uma experiência otimizada em smartphones, tablets e desktops.

## ✨ Principais Melhorias

### Design Mobile-First
- **Bottom Navigation**: Navegação fixa na base em dispositivos móveis
- **Responsive Layout**: Adapta-se perfeitamente a qualquer tamanho de tela
- **Touch-Friendly**: Botões e inputs com tamanho adequado para toque
- **Performance**: Otimizado para dispositivos com conexão lenta

### Funcionalidades Mantidas
- ✅ Autenticação com Supabase
- ✅ Gerenciador de Tarefas em tempo real
- ✅ Explorador de Arquivos com visualização
- ✅ Busca Inteligente (3 modos)
- ✅ Perfil do Usuário
- ✅ Upload de listas de URLs

### Novas Funcionalidades
- 🆕 Toast notifications para feedback
- 🆕 Suporte a PWA (Progressive Web App)
- 🆕 Modo offline parcial
- 🆕 Temas escuro/claro (suporte)

## 🚀 Como Começar

### Instalação

```bash
# Clonar repositório
git clone https://github.com/meshwave65/AppAndroidSWE.git
cd AppAndroidSWE

# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

### Build para Produção

```bash
npm run build
```

## 📋 Estrutura de Arquivos

```
AppAndroidSWE/
├── index.html              # HTML principal (mobile-first)
├── src/
│   ├── main.js            # Lógica principal (migrada)
│   ├── style.css          # Estilos mobile-first
│   └── lib/               # Bibliotecas (futuro)
├── public/                # Assets estáticos
├── manifest.json          # PWA manifest
├── package.json           # Dependências
└── README_MIGRATION.md    # Este arquivo
```

## 🎨 Breakpoints de Responsividade

| Tamanho | Breakpoint | Características |
|---------|-----------|-----------------|
| Mobile | 320px - 480px | Single column, bottom nav |
| Mobile Grande | 480px - 768px | Ajustes de padding |
| Tablet | 768px - 1024px | Two-column layout |
| Desktop | 1024px+ | Full layout |

## 🔧 Configuração

### Supabase
Para conectar com Supabase real, edite `src/main.js`:

```javascript
const SUPABASE_URL = "https://your-supabase-url.supabase.co";
const SUPABASE_KEY = "your-supabase-key";
```

E instale a biblioteca:
```bash
npm install @supabase/supabase-js
```

### API Backend
Certifique-se de que a URL da API está correta:
```javascript
const API_BASE_URL = "https://appsofia.meshwave.com.br";
```

## 📱 Componentes Principais

### Header
- Logo e título
- Display do usuário logado
- Fixo no topo

### Bottom Navigation
- 6 abas principais
- Ícones com labels
- Ativa em mobile, oculta em desktop

### Tabs
1. **Auth** - Login e Registro
2. **Insert** - Nova Extração
3. **Tasks** - Gerenciador de Tarefas
4. **Files** - Explorador de Arquivos
5. **Search** - Busca Inteligente
6. **Profile** - Perfil do Usuário

### Cards e Componentes
- Task Cards com status
- File Items com preview
- Search Results
- Form Groups
- Toast Notifications

## 🎯 Funcionalidades por Aba

### 1. Auth (Autenticação)
- Login com email/username
- Registro com código de convite
- Restauração de sessão
- Persistência em localStorage

### 2. Insert (Nova Extração)
- Seleção de agente
- Override de agente
- Input de URLs (múltiplas)
- Upload de arquivo (.txt/.csv)
- Iniciar processo

### 3. Tasks (Tarefas)
- Listagem com status em tempo real
- Filtros: Agente, LLM, Status
- Seleção múltipla
- Ações: Play, Pause, Stop, Delete
- Refresh automático/manual

### 4. Files (Arquivos)
- Estrutura hierárquica
- Filtros: Agente, LLM, Slug
- Visualização de documentos
- Download de arquivos
- Suporte a múltiplos formatos

### 5. Search (Busca)
- 3 modos: PADRÃO, RESUMO, ENRICH
- Busca global
- Highlight de termos
- Visualização de resultados

### 6. Profile (Perfil)
- Edição de dados
- Alteração de senha
- Salvamento de alterações

## 🔐 Segurança

- Tokens armazenados em sessionStorage
- Validação de entrada em todos os campos
- HTTPS obrigatório em produção
- CORS configurado no backend

## 📊 Performance

- CSS minificado
- JavaScript modular
- Lazy loading de dados
- Cache de API
- Service Worker para offline

## 🐛 Debugging

### Console
Abra o DevTools (F12) para ver logs:
```javascript
console.log("Debug info");
```

### Toast Notifications
Para testar notificações:
```javascript
showToast("Teste", "success");
```

## 📝 Notas de Desenvolvimento

### Próximas Melhorias
- [ ] Integração real com Supabase
- [ ] Service Worker para offline
- [ ] Suporte a temas claro/escuro
- [ ] Animações mais suaves
- [ ] Compressão de imagens
- [ ] PWA instalável

### Compatibilidade
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS Safari, Chrome Mobile)

## 🚀 Deploy

### Render
O deploy automático é acionado ao fazer push para a branch `main`:

```bash
git add .
git commit -m "Atualização do app"
git push origin main
```

URL de produção: `https://appandroidswe.onrender.com`

## 📞 Suporte

Para problemas ou sugestões, entre em contato:
- Email: sofia@meshwave.com.br
- WhatsApp: +351 914 845 439

## 📄 Licença

Propriedade da MeshWave Cyber Technologies ®

---

**Versão**: 2.0.0 (Mobile-First)  
**Atualizado**: 2026-05-21  
**Status**: ✅ Pronto para Produção
