# juki° — planner pessoal 2027

**Stack:** React + TypeScript + Vite + Supabase + Cloudflare Pages.

## Banco conectado
O banco correto é o projeto **jujuplanner**: `https://ogylfuvgzwdsuilvzzli.supabase.co` (ref `ogylfuvgzwdsuilvzzli`).

Em 14/11/2026 foi aplicada diretamente neste projeto a migração `initialize_jujuplanner_2027_private_schema`, criando as tabelas:
- `projects`, `tasks`, `recurrence_rules`
- `habits`, `habit_logs`
- `finance_transactions`, `finance_debts`, `finance_debt_payments`
- `planner_notes`

As nove tabelas foram verificadas com RLS ativado e política por `owner_id = auth.uid()`. Nenhuma conta havia sido cadastrada no momento da verificação. Não rode novamente o arquivo experimental `supabase/finance-2027.sql` em cima deste banco: ele foi elaborado antes do bootstrap completo e não é a migração aplicada.

## Cloudflare Pages
Configure o repositório GitHub `toullps/juki-organizer` com:
- Build command: `npm run build`
- Output directory: `dist`
- Root directory: `/`
- Environment variables (Cloudflare Pages > Settings > Environment variables):
  - `VITE_SUPABASE_URL=https://ogylfuvgzwdsuilvzzli.supabase.co`
  - `VITE_SUPABASE_PUBLISHABLE_KEY=` chave publicável do projeto, obtida em Supabase > Settings > API Keys.

**Nunca use service_role ou secret key no frontend.** O domínio final precisa ser incluído em Supabase Auth > URL Configuration (Site URL/Redirect URLs), conforme o fluxo de login utilizado.

## Privacidade
A proteção dos dados é feita pelas políticas RLS no banco, mas a **autocriação de contas deve ser bloqueada após criar a conta pessoal**. Até lá, a interface ainda permite cadastro; não publicar como acesso estritamente privado antes de finalizar a configuração de autenticação.

## Validar antes do deploy
- `npm install`
- `npx tsc --noEmit`
- `npm run build`
- Login/cadastro real, RLS por usuário, criar/editar tarefas, hábitos, finanças, notas; testar iPad e celular.
- Google Calendar e cartão/fatura permanecem no backlog.
