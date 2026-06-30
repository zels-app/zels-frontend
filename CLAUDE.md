## Regras de comportamento do agente (leia primeiro)

- Leia `../CLAUDE.md` (raiz) antes de qualquer tarefa
- Ao criar ou modificar um componente, atualize imediatamente a seção **Estrutura de arquivos atual** abaixo
- Ao criar um novo hook, adicione-o na lista da seção **hooks/** com uma linha descrevendo o que ele faz
- Ao concluir uma tarefa, registre na seção **Estado atual** do `../CLAUDE.md`
- Nunca chame `localhost:3000` diretamente — sempre use `/api/proxy/...`
- Nunca use `px` para tamanhos de fonte — sempre `rem` (usuários idosos aumentam a fonte do sistema)
- Nunca use `localStorage` para o token JWT — ele vive em cookie httpOnly

---

@AGENTS.md

# Zel's — Frontend

> **Instrução de sessão:** Ao iniciar uma nova conversa neste projeto, carregar imediatamente a skill `frontend-design:frontend-design` e aguardar o comando do Rafael para continuar de onde paramos.

SaaS de gestão de saúde para cuidado continuado de pessoas idosas. Usuários frequentemente aumentam a fonte do sistema — usar sempre `rem` para tamanhos de fonte, nunca `px` absoluto.

## Sobre o Rafael (usuário)

Rafael é iniciante em programação. Sempre explique o **porquê** de cada decisão técnica antes de mostrar a solução. Quando houver erro, descreva o que aconteceu antes de corrigir. Linguagem didática, sem jargão sem explicação.

---

## Stack (versões reais do package.json)

| Pacote | Versão |
|--------|--------|
| next | 16.2.6 |
| react | 19.2.4 |
| typescript | ^5 |
| tailwindcss | ^4 |
| shadcn | ^4.8.0 |
| @tanstack/react-query | ^5 |
| react-hook-form | ^7 |
| zod | ^4 |
| lucide-react | ^1 |
| @base-ui/react | ^1.5 |
| sonner | ^2 |
| recharts | ^2 |

> **Ícones lucide-react em uso:** `Eye`, `EyeOff` (toggle de senha — login, redefinir-senha), `Mail` (confirmação de envio de recuperação de senha), `CheckCircle` (sucesso de redefinição de senha). Reutilizar estes antes de importar novos.

> **Next.js 16 tem breaking changes.** Antes de escrever qualquer código Next.js, ler o guia relevante em `node_modules/next/dist/docs/`. Respeitar avisos de depreciação.
>
> **Breaking changes já confirmados neste projeto:**
> - `middleware.ts` foi renomeado para `proxy.ts` (a função exportada também se chama `proxy`, não `middleware`). O `proxy.ts` é o middleware real do Next.js 16 — controla acesso por dois cookies: `auth_token` (httpOnly, autenticação) e `has_profile` (não-httpOnly, indica se o usuário já criou HealthProfile). Lógica: sem token → `/login`; token sem perfil → `/onboarding`; token com perfil em `/onboarding` → `/dashboard`.
> - shadcn estilo `base-nova` usa `@base-ui/react` em vez de Radix UI — o componente `form` não existe nesse estilo; usar react-hook-form diretamente
> - Zod 4: `z.string().email()` está **deprecated** → usar `z.email()` como função de nível superior
> - `@hookform/resolvers/zod` v5 detecta automaticamente Zod 3 ou 4 — importar normalmente de `@hookform/resolvers/zod`
> - Zod 4: `errorMap` foi removido dos options de `z.enum()` → usar `error` no lugar (`error: () => ({ message: '...' })`)
> - Zod 4: `z.preprocess()` não infere o tipo corretamente → substituir por `z.enum([...]).or(z.literal('')).optional()` quando o campo é opcional e o select HTML pode enviar string vazia; tratar a string vazia no submit handler
> - Zod 4: campos de enum opcionais vindos de `<select>` precisam de cast explícito no submit se o TypeScript reclamar de string genérica: `value as 'VAL_A' | 'VAL_B'`

---

## Personas (domínio)

- **Pessoa Cuidada** — idoso que recebe o cuidado
- **Curador** — dono da conta, responsável principal
- **Familiar** — acesso somente leitura, acompanha à distância
- **Cuidador profissional** — executa tarefas de cuidado

**Médicos NÃO são usuários do sistema** — aparecem apenas como contatos na Ficha de Emergência.

---

## Backend

- URL: `http://localhost:3000`
- Swagger: `http://localhost:3000/api`
- Framework: NestJS

### Endpoints corretos

| Necessidade | Endpoint correto |
|-------------|-----------------|
| Login | `POST /auth/login` → `{ access_token, user: { id, name, email, role } }` |
| Cadastro | `POST /auth/register` → `{ id, name, email, role }` |
| Medicamentos ativos | `GET /medications/:healthProfileId?isActive=true` |
| Resumo de doses do dia | `GET /medications/today?healthProfileId=<id>` → `{ summary: { total, taken, late, pending }, doses[] }` |
| Alertas ativos | `GET /medications/alerts?healthProfileId=<id>` → `Alert[]` com `{ level, title, detail, when }` |
| Últimos sinais vitais (lista) | `GET /health-records/:healthProfileId?type=VITAL&limit=5` |
| Sinais vitais mais recentes (estruturado) | `GET /health-records/vitals/latest?healthProfileId=<id>` → `{ blood_pressure?, heart_rate?, weight? }` |
| Próximos compromissos | `GET /appointments/upcoming?healthProfileId=<id>&limit=3` → `Appointment[]` com `{ kind, title, professional?, scheduledAt }` |
| Círculo de cuidado | `GET /access-control/:healthProfileId` |
| IA | `POST /ai/process` |

### Endpoints que NÃO existem — nunca usar

- ❌ `/care-circles`
- ❌ `/ai/interpret`

### Regra crítica de IA

`POST /ai/process` **nunca salva automaticamente**. Sempre retorna sugestão para confirmação do usuário antes de persistir qualquer dado.

---

## Autenticação — JWT em cookie httpOnly

O token JWT vive em cookie `httpOnly` — **nunca em `localStorage`**. O cliente `api` usa `credentials: 'include'`. Para setar o cookie no login, usar um route handler Next.js que faz proxy da resposta do backend e define o `Set-Cookie`.

## Cookie `has_profile`

| Evento | Ação |
|--------|------|
| Login (`app/api/auth/login/route.ts`) | Chama `GET /health-profile/me` com o token recém-emitido; se 2xx → grava `has_profile=true`; se 404/erro → apaga o cookie |
| Onboarding concluído (`app/(app)/onboarding/page.tsx`) | Chama `POST /api/auth/set-profile-cookie` → grava `has_profile=true` |
| Logout (`app/api/auth/logout/route.ts`) | Apaga `has_profile` junto com `auth_token` |

- `httpOnly: false` — o `proxy.ts` (Edge Runtime) precisa ler este cookie; cookies httpOnly não são acessíveis no middleware
- Duração: 7 dias (mesmo que `auth_token`)
- **Nunca gravar este cookie diretamente no browser** — sempre via route handler `/api/auth/set-profile-cookie`

## Proxy e CORS

O cliente `api` (lib/api/client.ts) **nunca chama o backend diretamente**. Todas as chamadas vão para `/api/proxy/...` (route handler em `app/api/proxy/[...path]/route.ts`), que lê o cookie `auth_token` e injeta o header `Authorization: Bearer <token>` antes de encaminhar ao backend. Isso contorna tanto o CORS quanto a limitação de cookies httpOnly no browser.

---

## Convenções de código

- **Textos visíveis na UI:** português (pt-BR)
- **Variáveis, funções, arquivos, diretórios:** inglês
- **Tamanhos de fonte:** sempre `rem` (nunca `px`) — usuários idosos
- **Sem comentários** a menos que o "porquê" seja não óbvio
- **Títulos de tela:** todo título de tela nova DEVE usar `<PageHeader>` — nunca criar `<h1>` avulso. O overline sempre vem de `useHealthProfile()?.fullName` (TanStack Query com cache — reusar não cria requisição nova).
- **Fontes disponíveis:** `Nunito` (`--font-sans`), `DM Serif Display` (`--font-heading`), `JetBrains Mono` (`--font-mono`). Nunca referenciar fontes não carregadas (ex: `'DM Sans'`, `'var(--font-dm-sans)'`).
- **Cor de avatar:** SEMPRE usar os tokens `--zels-avatar-*` (nunca hex hardcoded). `ROLE_CONFIG` em `components/ciclo/person-card.tsx` é a fonte de verdade: entradas `ELDERLY`, `CURATOR`, `CAREGIVER`, `FAMILY`, cada uma com `color: 'var(--zels-avatar-*)'`. Avatar do usuário logado usa `ROLE_CONFIG[currentUser.role as keyof typeof ROLE_CONFIG]?.color ?? 'var(--zels-avatar-curator)'`.
- **Botões primários (shadcn `<Button>`):** sempre adicionar `style={{ color: '#ffffff' }}` — `var(--primary-foreground)` é imprevisível neste projeto e pode renderizar texto escuro. Obrigatório em telas de auth e onboarding; aplicar em qualquer novo `<Button>` com background colorido.
- **Logout:** `sidebar.tsx` chama `queryClient.clear()` após `POST /api/auth/logout` e antes de `router.push('/login')` — limpa todo o cache do TanStack Query para evitar dados da sessão anterior aparecerem para o próximo usuário.
- **`bloodType` é opcional no HealthProfile** — o campo pode ser omitido no `POST /health-profile`. No onboarding, a opção "Não sei / Informar depois" envia o body sem o campo. O schema Zod usa `z.enum([...]).or(z.literal('')).optional()` (Zod 4 — `z.preprocess` foi removido pois não inferia o tipo corretamente); o submit handler ignora o campo quando o valor é falsy (`...(bloodType && { bloodType })`). Em `perfil/page.tsx` o valor é enviado com cast explícito: `bloodType as 'A_POS' | ...`.
- **`useSearchParams()` exige `<Suspense>` boundary** — obrigatório em qualquer página que leia parâmetros da URL no Next.js 16. Extrair o componente que usa `useSearchParams` para um componente filho e envolvê-lo em `<Suspense fallback={...}>` no `page.tsx` pai; sem isso o build falha. Exemplo: `redefinir-senha/page.tsx` exporta `ResetPasswordPage` com `<Suspense>`, e `ResetPasswordForm` (filho) faz `useSearchParams()`.

---

## Padrões adicionados em 23/06/2026 — sessão de correção de bugs

### Toaster (Sonner)
- Usar `richColors` na tag `<Toaster>` para ativar cores diferenciadas por tipo de toast
- `fontFamily` deve usar `var(--font-sans)` — o token `--font-dm-sans` **não existe** neste projeto

### Redirecionamento pós-cadastro
- `cadastro/page.tsx` deve redirecionar para `/onboarding` (não `/dashboard`)
- O `proxy.ts` é quem decide se vai para `/dashboard` baseado no cookie `has_profile`

### Invalidação de cache do ciclo
- `useUpdateUser().onSuccess` deve invalidar `['access-control']` além de `['users', 'me']`
- Usar `queryClient.invalidateQueries({ queryKey: ['access-control'] })` **sem** `healthProfileId` para garantir que todas as instâncias do cache sejam invalidadas

### Curador virtual no ciclo de cuidados
- O curador vive em `profile.curatorUserId`, não na tabela `AccessControl`
- Para exibi-lo na lista, injetar um membro virtual com `useMemo` após construir `safeMembers`
- Verificar `curatorAlreadyInList` antes de injetar para evitar duplicatas
- Usar `createdAt: new Date().toISOString()` no objeto virtual para evitar crash em `memberSince()`
- `HealthProfile` inclui `curatorUser?: { id, name, displayName } | null` (adicionado em 29/06/2026) — usar `profile.curatorUser?.name ?? 'Curador'` e `profile.curatorUser?.displayName ?? null`; **nunca hardcodar `'Curador'` como nome**
- `AccessControl.user.displayName` é `string | null` (não apenas `string`) — necessário para receber `null` do curador sintético quando `curatorUser.displayName` é ausente

### Título dinâmico do dashboard (DashHero)
- `DashHero` usa `useAlerts(profile?.id)` para decidir entre "está bem" e "pedindo atenção"
- Contar **apenas** alertas com `level === 'urgent'` ou `level === 'warning'`
- Alertas `level === 'info'` são informativos e **não** ativam o estado de atenção

### Onboarding e role do usuário
- O `role` escolhido no onboarding deve ser enviado via `PATCH /users/me` **antes** do `POST /health-profile`
- As duas chamadas devem ser em sequência com `await` — se o PATCH falhar, não prosseguir para o POST

---

## Design system

Fontes: `Nunito` (sans) + `DM Serif Display` (heading) + `JetBrains Mono` (mono), carregadas via `next/font/google`.

### Paleta de cores (tokens CSS)

| Token | Valor | Uso |
|-------|-------|-----|
| `--zels-primary` | `#8BAF8A` | Sálvia — cor primária da marca |
| `--zels-primary-soft` | `rgba(139,175,138,0.15)` | Fundos sutis de destaque |
| `--zels-primary-strong` | `#5F8260` | Sálvia escurecido — texto/ícone sobre fundo claro |
| `--zels-deep` | `#2C3E2D` | Verde escuro — fundos escuros, contraste sobre sálvia |
| `--zels-terracota` | `#C4846A` | Terracota — acento moderado |
| `--zels-sunken` | `#F0EDE6` | Fundos recuados / secundários |
| `--zels-text-soft` | `rgba(61,43,31,0.68)` | Texto secundário |
| `--zels-text-faint` | `rgba(61,43,31,0.42)` | Texto terciário / placeholder |
| `--zels-urgent` | `#b8341a` | Alerta crítico / destrutivo |
| `--zels-attention` | `#a86e13` | Atenção / aviso |
| `--zels-ok` | `#5F8260` | Confirmação / sucesso |
| `--background` | `#FAF8F5` | Fundo geral (areia) |
| `--foreground` | `#3D2B1F` | Texto principal (café) |

#### Tokens semânticos de avatar (ÚNICA fonte de verdade para cor de avatar)

| Token | Resolve para | Hex | Papel |
|-------|-------------|-----|-------|
| `--zels-avatar-patient` | `var(--zels-terracota)` | `#C4846A` | Pessoa cuidada / titular |
| `--zels-avatar-curator` | `var(--zels-primary-strong)` | `#5F8260` | Curador |
| `--zels-avatar-caregiver` | `var(--zels-deep)` | `#2C3E2D` | Cuidador profissional |
| `--zels-avatar-family` | — | `#9B5A42` | Familiar (sem token equivalente na paleta) |

Classes Tailwind disponíveis: `bg-zels-primary`, `text-zels-urgent`, `border-zels-primary-soft`, `bg-zels-deep`, `text-zels-terracota`, `text-zels-primary-strong`, etc.

### Border radius

| Token | Valor |
|-------|-------|
| `rounded-sm` | 4px |
| `rounded-md` | 8px |
| `rounded-lg` | 12px |
| `rounded-xl` | 14px |
| `rounded-full` | 9999px |

---

## Estrutura de arquivos atual

```
app/
  layout.tsx                  — Root layout: fontes, metadata, <Providers>
  page.tsx                    — Redirect → /login
  globals.css                 — Tokens de design, paleta Zel's, Tailwind v4
  (auth)/
    layout.tsx                — Centra conteúdo na tela (login/cadastro/convite)
    login/page.tsx            — Formulário de login (react-hook-form + zod); após login verifica GET /health-profile/me → /dashboard se existe, /onboarding se 404; botão muda para "Verificando perfil…" durante a checagem; logo: <ZelsLogo size={72} showTagline /> dentro de <div className="mb-16">; InviteBanner (sub-componente em Suspense) exibe banner verde quando ?convite=aceito está na URL
    cadastro/page.tsx         — Formulário de cadastro + auto-login; logo: <ZelsLogo size={72} showTagline /> dentro de <div className="mb-16">
    convite/page.tsx          — Aceitação de convite por token: GET /api/proxy/invites/:token valida o token e pré-preenche o email (readonly); POST /api/proxy/invites/:token/accept cria a conta; estados tokenStatus ('loading'|'valid'|'invalid'|'expired'|'used') controlam o que é exibido; redireciona para /login?convite=aceito no sucesso; usa Suspense + ConvitePageInner (mesmo padrão de redefinir-senha)
    esqueci-minha-senha/page.tsx — Solicitar redefinição de senha; POST /auth/forgot-password via proxy; sempre mostra tela de sucesso após HTTP 200
    redefinir-senha/page.tsx  — Redefinir senha com token da URL (?token=); POST /auth/reset-password via proxy; Suspense + useSearchParams
  (app)/
    layout.tsx                — Layout autenticado com <AppShell> (sidebar + topbar)
    dashboard/page.tsx        — Dashboard real: header, grid de widgets; useEffect redireciona para /onboarding se useHealthProfile retornar undefined após carregamento; abre WelcomeModal automaticamente quando user.hasSeenWelcome === false (após carregamento, sem flash)
    ajuda/page.tsx            — Central de ajuda: 3 seções (Como funciona o Zel's com lista de funcionalidades + ícones Lucide sálvia; Perguntas frequentes com acordeão customizado via useState; Fale conosco com botão outline que abre wa.me/5511999999999 em nova aba)
    onboarding/page.tsx       — Fluxo de 3 passos (sem troca de URL): 1) escolha de papel (ELDERLY/CURATOR), 2) formulário de dados do perfil de saúde (POST /health-profile), 3) tela de confirmação com link para /dashboard e /ciclo
    medicamentos/page.tsx     — Lista de medicamentos ativos com cards expansíveis
    checklist/page.tsx        — Checklist do dia: report bar + cards de itens
    saude/page.tsx            — Registros de saúde: lista agrupada por data, filtros, formulário inline
    condicoes/page.tsx        — Condições: cards expansíveis com status, tratamentos e histórico
    exames/page.tsx           — Exames: lista com filtro de período, formulário inline de criação
    agenda/page.tsx           — Timeline dos próximos dias: medicamentos, exames, eventos
    emergencia/page.tsx       — Painel de emergência (fundo escuro, read-only)
    perfil/page.tsx           — Três seções: "Dados pessoais" (nome/apelido/telefone/e-mail read-only → PATCH /users/me; exibe "Seu papel: X" abaixo do PageHeader via roleLabels + user.role de useCurrentUser()), "Segurança" (troca de senha → PATCH /users/me/password), "Perfil de saúde" (fullName, birthDate, gender, bloodType, hasDigitalDependency, emergencyNotes → PATCH /health-profile/:id; birthDate convertido de ISO para YYYY-MM-DD; bloodType vazio omitido do payload — não enviado como null; profile.fullName exibido como overline antes do título da seção para indicar de quem é o perfil)
  api/
    auth/
      login/route.ts          — Proxy → POST /auth/login, seta cookie auth_token
      register/route.ts       — Proxy → POST /auth/register + auto-login
      logout/route.ts         — Apaga cookie auth_token
    proxy/[...path]/route.ts  — Proxy genérico: lê cookie auth_token → Authorization header

proxy.ts                      — Proteção de rotas (Next.js 16: era middleware.ts)
hooks/
  useMedicationsToday.ts      — GET /medications/today?healthProfileId → { summary, doses[] }
  useAlerts.ts                — GET /medications/alerts?healthProfileId → Alert[]
  useVitalsLatest.ts          — GET /health-records/vitals/latest?healthProfileId → { blood_pressure?, heart_rate?, weight? }
  useAppointmentsUpcoming.ts      — GET /appointments/upcoming?healthProfileId&limit=3 → Appointment[]
  useLogDose.ts                   — POST /medications/:medicationId/logs → registra dose (TAKEN/MISSED/SKIPPED); invalida today + logs + alerts
  useUpdateMedicationLog.ts       — PATCH /medications/:medicationId/logs/:logId → altera status de dose já registrada
  useDeleteMedicationLog.ts       — DELETE /medications/:medicationId/logs/:logId → remove log (endpoint pode não existir no backend — verificar NestJS)
  useRecentMedicationLogs.ts      — GET /medications/logs/recent?healthProfileId=<id>&limit=10 → logs recentes incluindo medicamentos inativos; queryKey: ['medications', 'logs', 'recent', healthProfileId]
  useDeactivateMedication.ts      — PATCH /medications/:id { isActive: false } → desativa medicamento; invalida list + today + alerts
lib/
  auth.ts                     — getAuthToken(), isAuthenticated() (server-only)
  access-level.ts             — getAccessInfo(user, profile) → AccessInfo { level, canCreate, canManage, canApprove, canPropose, isOwner, isSelf, showChecklist }; NUNCA comparar role diretamente nos componentes — sempre usar esta função
  api/
    client.ts                 — Cliente HTTP com credentials: 'include'; API_URL = '/api/proxy'
    exams.ts                  — Tipos: Biomarker { name, value, unit, referenceRange?, status }, ExamExtractedData { biomarkers[], extractedAt }, Exam { …, extractedData: ExamExtractedData | null }, ExamFilters; hooks: useExams, useCreateExam, useUpdateExam (aceita extractedData), useDeleteExam, useExtractExamBiomarkers (POST /exams/:id/extract — retorna ExamExtractedData, NUNCA persiste automaticamente; usuário revisa e confirma)
    user.ts                   — useCurrentUser() → GET /users/me
    health-profile.ts         — useHealthProfile() → GET /health-profile/me; tipo HealthProfile inclui elderlyUserId, curatorUserId? e curatorUser?: { id, name, displayName } | null (adicionado em 29/06/2026 — retornado pelo backend junto com o perfil); useUpdateHealthProfile() → PATCH /health-profile/:id (aceita UpdateHealthProfilePayload; invalida ['health-profile', 'me'])
    medications.ts            — useMedications(healthProfileId) → GET /medications/:id?isActive=true; Medication inclui approvalStatus?
    medication-logs.ts        — useMedicationLogs(id, enabled) + useCreateMedicationLog(id)
    health-records.ts         — useVitals(healthProfileId) → GET /health-records/:id?type=VITAL&limit=5
    summary.ts                — useHealthSummary(healthProfileId) → GET /summary/:id?period=7d
    checklists.ts             — useChecklist + useChecklistItems + useChecklistReport + useUpdateChecklistItem + useCreateChecklist + useCreateChecklistItem + useDeleteChecklistItem(checklistId) → DELETE /checklists/items/:itemId via proxy genérico; invalida checklist-items e checklist-report
    emergency.ts              — useEmergency(healthProfileId) → GET /emergency/:healthProfileId; staleTime: 0
    approvals.ts              — usePendingApprovals(healthProfileId) → GET /approvals/pending/:healthProfileId; useReviewMedication / useReviewCondition / useReviewTreatment → PATCH /approvals/{medications|conditions|treatments}/:id
    conditions.ts             — useConditions, useCreateCondition, useUpdateCondition, useDeleteCondition, useConditionTreatments, useCreateTreatment, useDeleteTreatment; Condition e Treatment incluem approvalStatus?
  utils.ts                    — cn()

components/
  providers.tsx               — QueryClientProvider + ReactQueryDevtools
  brand/
    zels-logo.tsx             — ZelsSymbol (3 arcos SVG concêntricos, usa currentColor) + ZelsLogo (símbolo + wordmark Nunito 900 + tagline opcional "AMAR É TER ZELO"); prop size controla altura do símbolo; showTagline exibe tagline abaixo
  layout/
    app-shell.tsx             — Client Component: gerencia estado do sidebar
    sidebar.tsx               — Nav: Dashboard / Medicamentos / Saúde / Condições / Agenda / Checklist / Ciclo / Resumo médico + item Emergência (vermelho, separado por divisor) + Ajuda (HelpCircle, acima do Sair) + logout; Checklist filtrado por access.showChecklist (oculto para level3); usa ZelsLogo size=26 no topo
    topbar.tsx                — Sticky: hambúrguer mobile + ZelsSymbol size=22 (mobile only), nome + role do usuário; avatar clicável → Link para /perfil
    page-header.tsx           — Cabeçalho padrão de tela. Props: overline? (string), title (string), subtitle? (ReactNode). Renderiza overline em font-mono maiúsculo + título em font-heading (DM Serif Display, text-2xl/sm:text-3xl) + subtítulo em text-sm text-zels-text-soft. Usado em: Medicamentos, Saúde, Condições, Exames, Agenda, Checklist, Ciclo, Resumo (desktop e mobile). NÃO usado em: Painel (hero/saudação) e Emergência (tela especial).
  domain/
    AlertCard.tsx             — Card de alerta: props level/title/detail/when; estilos por urgent/warning/info
  approvals/
    pending-approvals.tsx     — Painel de aprovações pendentes (só level1/canApprove); seções Medicamentos/Condições/Tratamentos; timeAgo() helper; toast.success/info em aprovar/rejeitar
  modals/
    welcome-modal.tsx         — Modal de boas-vindas (primeira sessão do usuário). Overlay fixo z-50, sem botão X, sem fechar ao clicar fora; lock de body.overflow enquanto aberto; 7 funcionalidades com ícones Lucide (Pill / Activity / FlaskConical / FileText / Users / Calendar / MessageCircle) na cor sálvia (#8BAF8A), consistentes com a sidebar; badge "Em breve" (terracota) no WhatsApp; PATCH /users/me { hasSeenWelcome: true } via useUpdateUser() ao clicar "Começar a usar o Zel's"; fecha em onSettled (sucesso ou erro)
  dashboard/
    dashboard-header.tsx      — Saudação "Bom dia/tarde/noite, [firstName]!"
    alerts-widget.tsx         — Lista de alertas ativos (nulo se vazio); hook useAlerts
    medications-today-widget.tsx — Resumo de doses do dia: taken/total + barra de progresso colorida
    vitals-latest-widget.tsx  — Sinais vitais mais recentes: pressão, freq. cardíaca, peso; "—" se ausente
    appointments-widget.tsx   — Próximos 3 compromissos com badge de kind; empty state se vazio
    medications-widget.tsx    — (legado) Medicamentos ativos com próximo horário
    vitals-widget.tsx         — (legado) Últimos 5 sinais vitais formatados; tempo relativo
    summary-widget.tsx        — Stats row (StatPill) + highlights como lista
  medications/
    medications-list.tsx      — Lista de medicamentos ativos; skeleton + empty state
    medication-card.tsx       — Card expansível: instruções, registro TAKEN/MISSED/SKIPPED, histórico
    edit-log-dialog.tsx       — Dialog para alterar ou remover status de dose já registrada; confirmação inline de remoção; usado por desktop e mobile
    prescription-dialog.tsx   — Dialog de criar/editar prescrição; extraído de meds-desktop.tsx; aceita prop `medications?` para validação de duplicata com aviso âmbar; usado por desktop e mobile
  checklist/
    checklist-list.tsx        — Orquestra checklist do dia: report bar + lista de itens; skeleton + empty state
    checklist-item-card.tsx   — Card por item: status badge, botões COMPLETED/PARTIAL/NOT_DONE, campo de nota inline
    checklist-report.tsx      — Barra de stats: total, concluídos, pendentes, não feitos (StatPill)
  health/
    health-records-list.tsx   — Lista com filtros de período (hoje/semana/mês) e tipo; agrupada por data
    health-record-card.tsx    — Card expansível por tipo: detalhe formatado, exclusão com confirmação inline
    health-record-form.tsx    — Formulário inline: campos dinâmicos por tipo (DIARY/SYMPTOM/VITAL/EVENT)
  conditions/
    conditions-list.tsx       — Lista de condições com formulário inline; sem abas (Exames movidos para /exames)
    condition-card.tsx        — Card expansível: badge de status, tratamentos sob demanda, formulário de tratamento inline, alteração de status
    condition-form.tsx        — Formulário inline: nome, status, diagnosisDate (opcional), notas (opcional)
    exam-card.tsx             — Card expansível: tipo, data, notas (reutilizado em /exames)
    exam-form.tsx             — Formulário inline: tipo (texto livre), examDate, notas (opcional; reutilizado em /exames)
  exams/
    exams-list.tsx            — Lista de exames com filtro de período, formulário inline e BiomarkerHistoryChart no topo (visível quando há ≥1 exame com extractedData)
    biomarker-confirmation-modal.tsx — Modal de revisão pós-extração de IA: disclaimer completo de IA (AlertTriangle âmbar), lista editável de marcadores (nome/valor/unidade/referência/status), botões adicionar/remover, confirmação obrigatória antes de persistir via useUpdateExam
    biomarker-history-chart.tsx      — Gráfico de evolução (recharts LineChart); selector de marcador por dropdown; pontos coloridos por status (normal=#5F8260, alto/baixo=#C4846A, atenção=#9B5A42); rótulos de valor+unidade acima de cada ponto (CustomLabel, font-mono 11px); linhas de referência pontilhadas vermelhas (#E05535, strokeDasharray 6 3) para Máx/Mín via parseReferenceRange(); tooltip custom; legenda de status; empty state: 0 pontos=box cinza, 1 ponto=gráfico+aviso, ≥2=gráfico completo
  agenda/
    agenda-view.tsx           — Orquestra os 3 hooks, combina em AgendaItem[], agrupa por data, renderiza timeline
    agenda-day-group.tsx      — Bloco de um dia: dot + linha de timeline + card com itens
    agenda-item-row.tsx       — Linha de item: ícone+cor por tipo (medication/exam/event), título, subtítulo, horário
  emergency/
    emergency-panel.tsx       — Tela completa de emergência: hero (nome/idade/tipo sanguíneo), notas âmbar, grid 2×2 de seções; read-only
  ui/
    button.tsx                — Componente Button (shadcn base-nova)
    input.tsx                 — Componente Input (shadcn base-nova)
    label.tsx                 — Componente Label (shadcn base-nova)
```

### Cookie de autenticação

- Nome: `auth_token` (httpOnly, sameSite: lax, maxAge: 7 dias)
- Setado pelo route handler `/api/auth/login` e `/api/auth/register`
- Lido pelo `proxy.ts` para proteger rotas
- Lido por `lib/auth.ts` para uso em Server Components

### Sistema de toasts (Sonner)

- Biblioteca: `sonner` — instalada via `npm install sonner`
- `<Toaster />` configurado em `app/(app)/layout.tsx`: `position="bottom-center"`, `duration={4000}`, estilo alinhado ao design system (fundo `#3D2B1F`, texto `#FAF8F5`, `border-radius: 12px`, fonte Nunito)
- Padrão: importar `toast` de `'sonner'` e chamar `toast.success()` / `toast.error()` no `onSuccess` / `onError` de toda `useMutation`
- Hooks que já implementam toasts: `useLogDose`, `useUpdateMedicationLog`, `useDeleteMedicationLog`, `useCreateMedicationLog` (em `lib/api/medication-logs.ts`), `useCreateMedication`, `useUpdateMedication` (em `hooks/useMedications.ts`), `useUpdateChecklistItem`, `useCreateChecklist`, `useCreateChecklistItem`, `useDeleteChecklistItem` (em `lib/api/checklists.ts`), `useCreateHealthRecord`, `useDeleteHealthRecord` (em `lib/api/health-records.ts`), `useCreateAppointment`, `useUpdateAppointment`, `useUpdateAppointmentStatus`, `useDeleteAppointment` (em `hooks/useCreateAppointment.ts`, `hooks/useUpdateAppointment.ts`, `hooks/useUpdateAppointmentStatus.ts`, `hooks/useDeleteAppointment.ts`), `useCreateCondition`, `useCreateTreatment` (em `lib/api/conditions.ts` — usa `toast.info` quando `approvalStatus === 'PENDING'`, `toast.success` caso contrário)
- **Regra de acesso:** nunca comparar `user.role` diretamente nos componentes — sempre usar `getAccessInfo()` de `lib/access-level.ts`

---

## Fatias de desenvolvimento

| # | Nome | Status |
|---|------|--------|
| 0 | Fundação (stack, design tokens, estrutura de rotas) | ✅ Concluída e aprovada |
| 1 | Autenticação (login, cadastro, convite, JWT cookie) | ✅ Concluída |
| 2 | Dashboard | ✅ Concluída (atualizada com 4 novos endpoints) |
| 3 | Medicamentos | ✅ Concluída |
| 4 | Checklist | ✅ Concluída |
| 5 | Saúde (registros, sintomas, sinais vitais) | ✅ Concluída |
| 6 | Condições e Exames | ✅ Concluída |
| 7 | Emergência | ✅ Concluída |
| 8 | Agenda | ✅ Concluída (CRUD completo via `/appointments`) |
| 9 | Ciclo de Cuidados | ✅ Concluída |
| 10 | Ficha de Emergência (impressão) | ✅ Concluída |
| 11 | Resumo Médico | ✅ Concluída |
| C | Sistema de Níveis de Acesso (CURATOR/ELDERLY/CAREGIVER/FAMILY) | ✅ Concluída |
| 12 | Convite por Token (aceitação pelo convidado) | ✅ Concluída em 29/06/2026 |

> **MVP completo ✅** — todas as fatias planejadas estão implementadas.

### Fatia 2 — notas de implementação

- CORS resolvido com route handler genérico em `app/api/proxy/[...path]/route.ts`
- Todos os hooks em `lib/api/` chamam `/api/proxy/...` (relativo, nunca `localhost:3000`)
- Resposta de `/health-records` tem shape `{ records, total, page, limit }` — chave é `records`, não `data`
- Seed em `prisma/seed.ts` (backend) com usuário `rafael@test.com / Senha@123`; ao deletar medicamentos, apagar `MedicationLog` primeiro (FK RESTRICT)
- **Atualização (novos endpoints):** Dashboard agora usa 4 novos hooks em `hooks/` (padrão separado de `lib/api/`):
  - `AlertsWidget` acima do grid — renderiza apenas se houver alertas; não exibe empty state quando vazio
  - `MedicationsTodayWidget` — substitui `MedicationsWidget`; barra de progresso colorida: 100% → verde, ≥80% → âmbar, <80% → vermelho
  - `VitalsLatestWidget` — substitui `VitalsWidget`; sempre exibe as 3 linhas (blood_pressure/heart_rate/weight), mostra "—" se dado ausente
  - `AppointmentsWidget` — novo; formatação de data em pt-BR ("hoje às 14h", "amanhã às 9h", "seg, 2 jun às 10h")
  - `AlertCard` em `components/domain/` — reutilizável; usa `bg-zels-urgent/10` e `bg-zels-attention/10` (opacity modifier do Tailwind v4)
  - Todos os widgets chamam `useHealthProfile()` (queryKey `['health-profile', 'me']`) — TanStack Query deduplica em 1 request e dispara os demais em paralelo após receber o `healthProfileId`

**Refinamento visual (pós-fatia):**
- `dash-hero.tsx`: título 52px display, highlight vermelho em "pedindo atenção", grid 2×2 de stats com JetBrains Mono 26px, banner de emergência
- `dash-timeline.tsx`: timeline horizontal 6h–24h, container único 160px com linha em `top: 50%`, marcadores alternados acima/abaixo por índice par/ímpar, agrupamento por `scheduledTime` (doses no mesmo horário viram "N meds"), anti-colisão visual; backend retorna status em minúsculas (`'late'`, `'pending'`, `'taken'`) e campo `medicationName` (não `name`)
- `dash-attention.tsx`: alertas com cards coloridos por nível
- `dash-recent-records.tsx`: registros com texto em pt-BR, tabelas `INTENSITY_PT` e `VITAL_TYPE_PT` para tradução de valores retornados em inglês pelo backend
- `dash-next-steps.tsx`: cards de compromissos com kind badge, link para `/resumo`

**Ajustes pós-MVP:**
- `dash-recent-records.tsx`: título alterado para "ÚLTIMOS REGISTROS", subtítulo "registros do dia" removido; formatDateTime mostra "hoje · HHhMM", "ontem · HHhMM" ou "D mmm · HHhMM" usando toLocaleDateString('pt-BR') para evitar bug de timezone

**Ajustes pós-MVP (sessão 2):**
- `dash-next-steps.tsx`: título alterado para "PRÓXIMOS COMPROMISSOS", subtítulo removido
- `dash-recent-records.tsx`: título alterado para "ÚLTIMOS REGISTROS", subtítulo removido; formatDateTime com "hoje/ontem/D mmm · HHhMM"
- `dash-attention.tsx`: bug corrigido — useAlerts retornava objeto mas hook esperava array (select extrai res.alerts); formatWhen corrigido (backend já envia texto legível, não ISO date); badge traduzido (urgent → Urgente, warning → Atenção, info → Info); botão "Ver detalhes" navega para /medicamentos ou /condicoes conforme relatedType; botão "Dispensar" remove alerta localmente via estado dismissed; título de alertas info/condition extraído do campo detail via split(' está ')[0]

**Ajustes pós-MVP (sessão 3):**
- Dashboard mobile substituído pelos componentes bold: `DashHero`, `DashTimeline`, `DashAttention`, `DashRecentRecords`, `DashNextSteps` — mesmo conteúdo do desktop, empilhado verticalmente no mobile (`lg:hidden flex flex-col gap-6`)
- `dash-hero.tsx` responsivo: container alterado para `flex-col lg:flex-row`; título com `clamp(2rem, 6vw, 3.25rem)` para não transbordar em telas estreitas; colunas sem flex fixo no mobile (ocupam largura total)
- `dash-hero.tsx`: label "Paciente" substituído por "Pessoa cuidada"
- `dash-next-steps.tsx`: título "PRÓXIMOS COMPROMISSOS" e cada card de compromisso são `<Link href="/agenda">` — clique em qualquer um navega para a Agenda
- Botão `<` (voltar) adicionado/corrigido em todas as telas mobile: `meds-mobile.tsx` tinha botão sem `onClick` — conectado com `router.back()`; `saude/page.tsx` e `condicoes/page.tsx` convertidos para client component e receberam botão `<` (`lg:hidden`); `care-circle-mobile.tsx` e `resumo/page.tsx` receberam `useRouter` + botão `<`; `checklist-mobile.tsx` e `agenda-mobile.tsx` já estavam corretos
- Ordem do sidebar atualizada: Dashboard / Medicamentos / Saúde / Condições / Exames / Agenda / Checklist / Ciclo / Resumo médico

### Fatia 3 — notas de implementação

Arquivos:
- `app/(app)/medicamentos/page.tsx`
- `components/medications/meds-mobile.tsx`
- `components/medications/meds-desktop.tsx`
- `components/medications/medication-card.tsx`
- `hooks/useMedications.ts`
- `hooks/useMedicationLogs.ts`
- `hooks/useLogDose.ts`

- Tela `/medicamentos`: cards expansíveis, um por medicamento ativo
- Ao expandir: mostra instruções, horários com botões de ação, histórico de logs
- Botão principal: "Confirmar tomada das HH:MM" (status TAKEN) — `scheduledAt` é construído a partir do horário do `schedule` combinado com a data atual
- Campo do body é `scheduledAt` (horário previsto), não `takenAt` — o backend seta `confirmedAt` automaticamente
- Histórico carregado sob demanda: `enabled: expanded` no `useQuery` evita requisições desnecessárias
- Erro 409 (log duplicado) tratado via `onError` da mutation — exibe mensagem inline no card
- `GET /medications/:id/logs` retorna array direto (não paginado); aceita `from?`, `to?`, `status?`

**Refinamento visual (pós-fatia):**
- `meds-mobile.tsx`: reescrito com `DayProgress` (barra colorida + legenda mono), `LateCard` com `getOverdueTime(scheduledTime)` para calcular atraso a partir de `"HH:MM"`, `NextDoseHero`, `UpcomingRow`, `TakenSection`
- `meds-desktop.tsx`: reescrito com 4 KPIs (aderência calculada de `useMedicationsToday summary`), `PrescriptionsList` com % aderência por medicamento e barra 56px, `HeatmapCard` 7 dias com células 18×18px coloridas, `DosesToday` em tabela, `ActivityLog` com os 6 logs mais recentes
- Tokens: JetBrains Mono em horários e KPIs; cores adaptativas (≥80% → primary, ≥50% → warn, <50% → urgent); `getOverdueTime` defensivo — fallback `'atrasada'` quando `scheduledTime` está ausente ou malformado

**Melhorias pós-MVP (tela de medicamentos):**
- `edit-log-dialog.tsx` criado: altera status (TAKEN/MISSED/SKIPPED) ou remove um log já registrado; confirmação inline antes de deletar; botão "Alterar" em `DosesToday` (desktop) e `MoreHorizontal` em `TakenSection` (mobile)
- `prescription-dialog.tsx` extraído de `meds-desktop.tsx`: reutilizado em desktop e mobile; valida duplicata por nome antes de salvar (aviso âmbar com opção de confirmar mesmo assim); reset garantido por desmontagem real (componente só entra na árvore quando aberto, nunca via `open={false}`)
- `meds-mobile.tsx`: botão "+" no header abre `PrescriptionDialog` em modo criação; seção colapsável "Prescrições ativas" abaixo do fluxo de doses, com nome/dosagem/horários/instruções e botão "Editar" por medicamento
- `meds-desktop.tsx`: `HeatmapCard` movido para largura total abaixo do grid principal; colunas invertidas — DosesToday+ActivityLog à esquerda (60%), PrescriptionsList à direita (40%); botões "Pulei" e "Esqueci" adicionados à tabela de doses; botão "Alterar" visível para doses com log registrado
- `useCreateMedication`: agora invalida `['medications', 'today']` e `['alerts', 'active']` no `onSuccess`; `toast.success/error` adicionados
- `useUpdateMedication`: `toast.success/error` adicionados
- Backend não implementa `DELETE /medications/:medicationId/logs/:logId` — o botão "Remover marcação" retornará 404 até o endpoint ser criado no NestJS
- Padrão `buildScheduledAt(scheduledTime)`: backend retorna `scheduledTime: "HH:MM"` (não `scheduledAt`) em `GET /medications/today`; helper constrói ISO string a partir do horário antes de chamar `POST /medications/:id/logs`
- `meds-desktop.tsx`: `normalizeStatus` agora reconhece `'skipped'` e `'missed'`; `STATUS_BADGE` tem entradas para "Pulada" (âmbar, `c.warn`) e "Esquecida" (vermelho, `c.urgent`); botões "Marcar/Pulei/Esqueci" ocultados para doses já registradas — condição mudou de `ns !== 'taken'` para `ns === 'pending' || ns === 'late'`; botão "Alterar" agora aparece também para status `skipped` e `missed`
- Backend retorna `status: 'skipped'` e `status: 'missed'` (minúsculas) em `GET /medications/today` após doses registradas com esses status
- Erro 409 ao registrar dose agora exibe toast específico: "Esta dose já foi registrada. Use 'Alterar' para mudar o status." — aplicado em `useLogDose` e `useCreateMedicationLog` via `instanceof ApiError && error.status === 409`
- `PrescriptionDialog`: desmontagem real garantida via condicional no pai (`profile?.id && dialogState.mode !== 'closed'`); `healthProfileId` no mobile protegido com `profile?.id &&` na condição de renderização — evita envio de string vazia e erro 400
- `useDeactivateMedication` criado em `hooks/useDeactivateMedication.ts`: `PATCH /medications/:id { isActive: false }`; invalida `['medications', 'list', healthProfileId]`, `['medications', 'today']` e `['alerts', 'active']`; toast de sucesso/erro
- `PrescriptionDialog`: botão "Desativar prescrição" adicionado em modo edição; confirmação inline (box vermelho) antes de executar; usa `useDeactivateMedication` internamente
- `ActivityLog` em `meds-desktop.tsx`: substituído `useQueries` por `useRecentMedicationLogs(healthProfileId)`; logs ordenados por `confirmedAt ?? scheduledAt` DESC no frontend; badge `(prescrição encerrada)` em `--zels-text-faint` quando `log.isActive === false`; `isError` logado via `console.error('[ActivityLog] erro:', error)` para debug
- `PrescriptionsList` em `meds-desktop.tsx`: detecta prescrições vencidas via `endDate < hoje`; exibe badge "Prescrição vencida" (urgent) ao lado do nome; botão "Desativar" outline-vermelho chama `useDeactivateMedication` diretamente sem abrir o dialog completo
- Doses de hoje (`DosesToday`) ordenadas pela ordem retornada pelo backend — nenhum sort no frontend

**Ajustes pós-MVP:**
- `meds-desktop.tsx` — HeatmapCard: CellStatus adicionado 'skipped'; getCellStatus() reescrita com regra de pior status (MISSED > SKIPPED > mix TAKEN+outro > TAKEN); cor âmbar (c.warn) para 'skipped'; legenda atualizada com "Pulada" entre "Atrasada" e "Esquecida"

**Ajustes pós-MVP — registro de horário real (tomada atrasada):**
- `useLogDose.ts`: campo `confirmedAt?: string` enviado no body do POST de log (backend aceita e persiste — NÃO renomear para takenAt)
- `useMedicationsToday.ts`: campo `takenAt?: string` no tipo Dose (GET /medications/today retorna takenAt derivado de confirmedAt)
- `meds-desktop.tsx` — TakenTimeDialog: clicar "Marcar" abre diálogo com 3 opções (Na hora prevista / Agora / Outro horário com input type=time); handleConfirmTaken chama logDose com scheduledAt + confirmedAt
- Status 'takenLate' separado de 'late': 'late' = dose pendente cujo horário passou (badge "Atrasada" vermelho + botões Marcar/Pulei/Esqueci); 'takenLate' = dose TAKEN tomada com atraso > 30min (badge âmbar "Tomada atrasada", sem botões)
- DosesToday: isLate usa `ns === 'taken'` (NÃO dose.status === 'TAKEN' — backend envia minúsculas) && takenAt presente && (takenAt - scheduledISO) > 30min; quando isLate, exibe badge "Tomada atrasada" + linha "tomada às HHhMM"
- HeatmapCard: CellStatus 'takenLate' (cor âmbar); getCellStatus detecta atraso > 30min em doses TAKEN; 'late' no heatmap = pendência (vermelho)
- scheduledISO = dose.scheduledAt ?? buildScheduledAt(dose.scheduledTime)
- Limite definido: >= 30min conta como tomada atrasada (exatos 30min incluídos)

### Fatia 4 — notas de implementação

Arquivos:
- `app/(app)/checklist/page.tsx`
- `components/checklist/checklist-mobile.tsx`
- `components/checklist/checklist-desktop.tsx`
- `components/checklist/task-row.tsx`
- `hooks/useChecklist.ts`
- `hooks/useChecklistItems.ts`
- `hooks/useUpdateChecklistItem.ts`
- `hooks/useCreateChecklist.ts`
- `hooks/useCreateChecklistItem.ts`

- Tela `/checklist` funcionando: barra de resumo (total/concluídos/pendentes/não feitos) + itens ordenados por `scheduledTime`
- Mobile (`lg:hidden`): itens agrupados por turno (Manhã/Tarde/Noite/Outros), pill "agora" no turno atual, bottom sheet ao tocar no item (COMPLETED/PARTIAL/NOT_DONE + nota opcional), botão flutuante "+" para adicionar item; botão "Iniciar checklist do dia" quando não existe checklist → `POST /checklists { healthProfileId, date }`
- Desktop (`hidden lg:block`): coluna esquerda read-only (status + executedAt + gráfico de barras 7 dias), coluna direita template com drag-to-reorder via `@dnd-kit/sortable` (visual only, sem persistência), feed de observações DIARY abaixo, botão "Ver relatório" abre dialog
- `GET /checklists/:healthProfileId?from=<hoje>&to=<hoje>` retorna array — pode ser vazio (checklist não é pré-criado pelo backend)
- Modelo no banco é `CaregiverChecklist` (não `Checklist`); campo do item é `itemName` (não `title`); `scheduledTime` é string "HH:MM"
- Status inicial: `PENDING`; itens já marcados mostram badge + botões sempre visíveis para correção (PATCH aceita múltiplos updates)
- Botão COMPLETED: registra direto sem nota; PARTIAL/NOT_DONE: abre campo de texto antes de confirmar
- `PATCH /checklists/items/:itemId` body: `{ status, notes? }` — nota é opcional
- Invalidar `checklist-items` e `checklist-report` no `onSuccess` da mutation para atualizar barra de resumo
- **Bug de timezone no seed:** `setHours(0,0,0,0)` grava `03:00 UTC` em Recife (UTC-3); o backend interpreta `new Date("YYYY-MM-DD")` como `00:00 UTC`; filtro `lte: 00:00Z` exclui `03:00Z` → array vazio. Correção: `setUTCHours(0,0,0,0)` no seed. O hook `todayParam()` no frontend envia data local como string `"YYYY-MM-DD"`, que é o formato correto.
- Seed do checklist usa delete-por-intervalo + create (não upsert) para limpar registros antigos com offset errado antes de recriar
- **Correção aplicada:** `ReadOnlyRow` convertido de `div` para `button` no `checklist-desktop.tsx`; `ItemDialog` adicionado para ações no desktop (clique no item → dialog centralizado com COMPLETED/PARTIAL/NOT_DONE)

**Refinamento visual (pós-fatia):**
- `checklist-mobile.tsx`: reescrito com header (chevron + "Checklist · {firstName}" + avatar roxo #8a6a9b com iniciais do usuário atual), card de status com contador "N de M tarefas" + badge de atrasadas + barra segmentada (1 segmento por tarefa, cores por status visual), `MomentoBlock` com pill "agora" preenchido verde, label + range mono + turno itálico (matutino/vespertino/noturno), fundo `rgba(46,125,107,0.06)` no período atual
- `checklist-desktop.tsx`: reescrito com gráfico de 7 dias (barras verticais sobre fundo `#efece5`, coloridas por cumprimento: ≥80% verde, ≥50% âmbar, <50% vermelho, % acima, dia abaixo), coluna esquerda read-only agrupada por período com headers compactos, coluna direita template com `groupByPeriodOrdered` (preserva ordem do drag) + badges de categoria inferida + botão "editar" desabilitado, feed de observações DIARY em grid 2 colunas de cards
- `inferCat(itemName)`: infere categoria da tarefa pelo nome — medicação / alimentação / higiene / sinais vitais / atividade / rotina
- `getVisualStatus(item)`: mapeia status do backend para visual — `COMPLETED` → done (verde), `NOT_DONE|PARTIAL` → skipped (amarelo), `PENDING` + horário passado → late (vermelho), `PENDING` normal → pending (dashed)

### Fatia 5 — notas de implementação

- Tela `/saude`: lista de registros agrupada por data, filtros de período (hoje/semana/mês) e tipo (SYMPTOM/VITAL/DIARY/EVENT)
- Cards expansíveis com detalhe formatado por tipo: texto livre (DIARY), sintoma + badge de intensidade (SYMPTOM), leitura mono (VITAL), descrição + local (EVENT)
- Criação inline com formulário de campos dinâmicos — campos mudam conforme o tipo selecionado
- Exclusão com confirmação inline no card expandido
- `GET /health-records/:healthProfileId` retorna `{ records, total, page, limit }` ou array direto — `unpack()` normaliza os dois formatos
- Invalidação: `queryClient.invalidateQueries({ queryKey: ['health-records'] })` cobre lista e vitais-widget (prefixo comum)
- **Bug de timezone no filtro `to`:** backend interpreta `"YYYY-MM-DD"` como `00:00 UTC`; filtro `createdAt <= 00:00Z` exclui registros criados no decorrer do dia. Correção: `to` é enviado como amanhã (`today + 1 dia`), garantindo `createdAt <= 00:00Z do dia seguinte`
- **Tradução de intensidade:** seed salvou `mild`/`moderate` em inglês; `INTENSITY_CONFIG` em `health-record-card.tsx` tem aliases ingleses apontando para os mesmos valores em português. Formulário salva sempre em português (`leve`/`moderado`/`forte`)
- Edição não implementada — backend não expõe `PATCH /health-records/:id`
- **Bug de agrupamento por data corrigido:** `localDateKey(iso)` usa `toLocaleDateString('pt-BR')` para gerar a chave de agrupamento — evita que registros criados após 21h (UTC-3) sejam agrupados no dia seguinte. `dateGroupLabel` também compara datas locais. Aplicado em `components/health/health-records-list.tsx`.

### Fatia 6 — notas de implementação

- Tela `/condicoes` com abas "Condições" e "Exames" — troca de aba reseta o formulário inline aberto
- Cards de condição expansíveis: badge de status colorido por semântica (INVESTIGATING=âmbar, ACTIVE=vermelho, CONTROLLED=verde, RESOLVED=cinza, CHRONIC=azul)
- Tratamentos carregados sob demanda: `enabled: expanded` no `useConditionTreatments` — mesmo padrão de logs de medicamento
- Formulário de tratamento embutido no próprio `condition-card.tsx` (nunca standalone) — campos: `description` (obrigatório), `startDate` (obrigatório), `endDate` e `notes` (opcionais)
- Alteração de status via `PATCH /conditions/:id` com `{ status }` — botão "Salvar" fica desabilitado se o status selecionado for igual ao atual
- Exames: `GET /exams/:healthProfileId` retorna array direto; campo de data é `examDate` (não `date` nem `performedAt`); tipo é texto livre (não enum)
- Filtro de período nos exames: Último mês / Últimos 6 meses / Último ano / Todos — filtro padrão é "Últimos 6 meses"
- `POST /conditions` body: `{ healthProfileId, name, status, diagnosisDate?, notes? }`
- `POST /conditions/:conditionId/treatments` body: `{ description, startDate, endDate?, notes? }`
- `POST /exams` body: `{ healthProfileId, type, examDate, notes? }` — `fileUrl` fica `null` (upload não implementado)
- Seed do backend: `prisma.treatment.deleteMany` antes de `prisma.condition.deleteMany` (FK RESTRICT); depois `prisma.exam.deleteMany`

**Edição e exclusão adicionadas (pós-fatia):**
- `useUpdateCondition`, `useDeleteCondition` em `lib/api/conditions.ts`
- `useDeleteTreatment` em `lib/api/conditions.ts`
- `useUpdateExam`, `useDeleteExam` em `lib/api/exams.ts`
- Backend: novos endpoints DELETE /conditions/:id, DELETE /conditions/:conditionId/treatments/:id, PATCH /exams/:id, DELETE /exams/:id
- Proxy corrigido: `app/api/proxy/[...path]/route.ts` trata status 204 separadamente (`NextResponse(null, { status: 204 })`) — corrige erro "Invalid response status code 204" do Next.js 16

### Fatia 7 — notas de implementação

- Tela `/emergencia` com fundo `#141210` (escuro) — nega o padding do `<main>` via `-m-6 md:-m-8` para sangrar até as bordas; todas as outras telas continuam com o fundo creme padrão
- Hero: nome + idade à esquerda, tipo sanguíneo em `3.25rem font-bold text-zels-urgent` à direita — maior elemento visual para leitura rápida sob stress
- Notas de emergência em box âmbar (`bg-amber-400/10 border-amber-400/20`) — só renderiza se `emergencyNotes` existir
- Grid 2×2 de seções (single col em mobile): Medicamentos, Condições, Sinais Vitais Recentes, Eventos Recentes
- `recentEvents[].summary` pode vir como objeto `data` do `HealthRecord` em vez de string — `extractSummary()` normaliza: `symptom` → `text` → `description` → `type+systolic` → `type+value` → fallback "Registro de saúde"
- Capitalização de eventos feita em JS (`capitalize()` só no primeiro char) — CSS `text-transform: capitalize` foi evitado pois capitaliza cada palavra e quebra unidades como `mmHg` → `MmHg`
- Contraste WCAG AA garantido: nenhuma cor usa opacidade — `text-white` (21:1), `text-stone-300` (12.9:1), `text-stone-400` (8.1:1) sobre `#141210`
- Item "Emergência" no sidebar separado por divisor, sempre em `text-zels-urgent` (vermelho) independente da rota ativa
- `staleTime: 0` no `useEmergency` — dados sempre refetchados ao entrar na tela
- Shape do `GET /emergency/:healthProfileId`: `{ patient: { name, age, bloodType, emergencyNotes? }, medications: [{ name, dosage, schedule }], conditions: [{ name, status }], recentVitals: [{ type, data, recordedAt }], recentEvents: [{ type, summary, recordedAt }], generatedAt }`

### Fatia 8 — notas de implementação

Arquivos:
- `app/(app)/agenda/page.tsx`
- `components/agenda/agenda-mobile.tsx`
- `components/agenda/agenda-desktop.tsx`
- `components/agenda/appointment-form.tsx`
- `components/agenda/kind-badge.tsx`
- `hooks/useAppointments.ts`
- `hooks/useAppointmentsUpcoming.ts` (atualizado: `OTHER`, `AppointmentStatus`, `status`, `durationMinutes`)
- `hooks/useCreateAppointment.ts`
- `hooks/useUpdateAppointment.ts`
- `hooks/useUpdateAppointmentStatus.ts`
- `hooks/useDeleteAppointment.ts`
- `lib/format.ts` (helpers de data pt-BR: `formatAppointmentDate`, `toISOLocal`, `toDatetimeLocal`)

- Mobile (`lg:hidden`): card em destaque do próximo SCHEDULED + lista de até 5 próximos + histórico (3 últimos COMPLETED/CANCELLED) + FAB "+" + bottom sheet para criar/editar/ver detalhe; CANCELLED com texto tachado
- Desktop (`hidden lg:block`): strip de 30 dias com dots coloridos por kind, lista filtrada pelo dia clicado, card do próximo compromisso na coluna direita, dialog para criar/editar
- Ações de status: `PATCH /appointments/:id/status { status }` — "Marcar como realizado" (COMPLETED) e "Cancelar" (CANCELLED)
- `AppointmentStatus`: `SCHEDULED | COMPLETED | CANCELLED`; `AppointmentKind`: `CONSULTATION | EXAM | THERAPY | VACCINE | OTHER`
- Todas as mutations invalidam `['appointments', 'list']` e `['appointments', 'upcoming']` — Dashboard atualiza automaticamente
- **Shape real do backend:** `GET /appointments` retorna `{ appointments: Appointment[], total, page, limit }` — chave é `appointments`, não `data` nem array direto
- **Bug de fuso horário:** agrupamento por data em `byDate` usa `toISOLocal(new Date(appt.scheduledAt))` (data local), não `.slice(0, 10)` (data UTC) — evita mismatch quando offset inverte o dia
- Normalização defensiva em todos os hooks: `Array.isArray(res) ? res : r.appointments ?? r.data ?? []`

**Refinamento visual (pós-fatia):**
- `kind-badge.tsx`: `kindTone(kind)` retorna `KindTone { fg, bg }` — CONSULTATION/VACCINE → `#2E7D6B`, EXAM → `#3b6fb6`, THERAPY → `#A86E13`; `KindBadge` usa `style` inline (não classes Tailwind)
- `agenda-desktop.tsx`: `CalendarStrip` 30 dias com pills por kind; `selectedDay: Date | null` (null = todos futuros); `NextHighlight` com borderLeft na cor do kind
- `formatShortDate()` e `timeUntil()` definidos localmente em `agenda-mobile.tsx`; bug: `useAppointments` com params undefined causava 500

### Fatia 9 — notas de implementação

Arquivos:
- `app/(app)/ciclo/page.tsx`
- `components/ciclo/care-circle-mobile.tsx`
- `components/ciclo/care-circle-desktop.tsx`
- `components/ciclo/person-card.tsx`
- `components/ciclo/invite-form.tsx`
- `components/ciclo/invite-elderly-form.tsx`
- `hooks/useAccessControl.ts`
- `hooks/useInviteElderly.ts`
- `hooks/useCreateAccess.ts`
- `hooks/useUpdateAccess.ts`
- `hooks/useDeleteAccess.ts`

- `GET /access-control/:healthProfileId` retorna lista de `AccessControl`; normalização: `Array.isArray(res) ? res : r.members ?? r.data ?? []`
- `PersonCard` tem `variant="list"` (mobile, chips + menu "...") e `variant="grid"` (desktop, toggle switches + botão remover inline); exporta `getInitials`, `ROLE_CONFIG`, `PermissionToggle` para reuso
- Curador detectado via `currentUser.role === 'CURATOR'` — apenas Curador vê controles de edição
- Convite simulado: `POST /access-control` com `userId` direto; nota no formulário explica que em produção seria por SMS/e-mail
- Dialog de edição (desktop) / bottom sheet de edição (mobile) compartilham o mesmo fluxo: PATCH + confirmação inline antes de DELETE
- `canRegister` default no formulário de convite: `false` para FAMILY, `true` para CAREGIVER

**Refinamento visual (pós-fatia):**
- `care-circle-desktop.tsx`: `CircleHero` hub-and-spoke (avatar titular 84px `#c5a275` + grid 6 colunas); `PersonGridCard` com chips VER/REGISTRAR/EDITAR/GERENCIAR/EMERGÊNCIA mapeados de `canView`/`canRegister`/`roleInProfile`
- `roleAccent(role)`: CURATOR → `#2E7D6B`, CAREGIVER → `#A86E13`, FAMILY → `rgba(30,28,24,0.68)` — distinto de `ROLE_CONFIG`
- Backend: `GET /access-control` agora inclui `user: { id, name, email, role }` como obrigatório; tipo `AccessControl` em `useAccessControl.ts` atualizado

### Fatia 10 — notas de implementação

Arquivos:
- `app/(app)/ficha-emergencia/page.tsx`
- `components/emergencia/emergency-view.tsx`
- `components/emergencia/emergency-print.tsx`

- Reutiliza `lib/api/emergency.ts` (hook `useEmergency` + todos os tipos) — não criado novo `hooks/useEmergency.ts` pois teria mesmo queryKey `['emergency', healthProfileId]` e causaria conflito
- Paleta **fixa** em `emergency-view.tsx` (variável `P`): não herda tokens do tema. Fundo `#1a1a1a`, texto `#fff`, crítico `#ef4444`, aviso `#f59e0b`, seção `#2a2a2a`
- `emergency-print.tsx` usa exclusivamente `inline styles` (garantia de renderização no browser de impressão); `display: grid, gridTemplateColumns: '1fr 1fr'` para layout 2 colunas no papel
- Detecção de alergias: `emergencyNotes.toLowerCase().includes('alergi')` → banner vermelho com "⚠ ATENÇÃO"; caso contrário, box âmbar normal
- `print:hidden` em `<EmergencyView>` e `hidden print:block` em `<EmergencyPrint>` — Tailwind v4 `print:` variant cuida da alternância
- `page.tsx` aplica `-m-6 md:-m-8 print:m-0` para sangrar o fundo escuro na tela e resetar na impressão
- Sidebar: link "Emergência" atualizado de `/emergencia` para `/ficha-emergencia`

### Fatia 11 — notas de implementação

Arquivos:
- `app/(app)/resumo/page.tsx`
- `app/(app)/resumo/[id]/page.tsx`
- `components/resumo/summary-detail.tsx`
- `components/resumo/summary-print.tsx`

- Reutiliza `lib/api/summary.ts` (hook `useSummary`) — adicionado `staleTime: 10 * 60 * 1000` (10 min)
- Reutiliza `lib/api/emergency.ts` para dados do paciente na coluna lateral (nome, idade, condições, medicamentos)
- `[id]` = `"7d" | "30d" | "90d"` — IDs inválidos fazem fallback para `"7d"`
- Backend não persiste resumos: `page.tsx` exibe 3 cards estáticos de período; `[id]/page.tsx` carrega o resumo gerado dinamicamente
- "Regenerar" invalida a queryKey `['summary', healthProfileId, period]` — o backend sempre gera novo ao refetch
- "Pergunte ao Zel's": POST `/ai/process { prompt }` → normaliza `res.result ?? res.response ?? res.message ?? res.content`; nunca salva automaticamente
- Sidebar: item "Resumo médico" com ícone `FileText` e `href: '/resumo'` adicionado antes de "Emergência"; detecção de ativo usa `pathname.startsWith(href + '/')` para cobrir sub-rotas `/resumo/7d` etc.
- Print: `print:hidden` na view interativa, `hidden print:block` no `SummaryPrint` — mesmo padrão da Fatia 10; estilos inline em `summary-print.tsx`
- `params` em `[id]/page.tsx` é Promise (Next.js 16 breaking change) — usar `await params`

**Refinamento visual (pós-fatia):**
- `summary-detail.tsx`: `TargetSelector` (Consulta vinculada/Profissional/Uso geral) — "Consulta vinculada" usa `useAppointmentsUpcoming`; `AskZels` normaliza `res.result ?? res.response ?? res.message ?? res.content`; `SidebarPanel` sticky
- `summary-print.tsx`: helpers `PrintSection` + `formatVitalValue`; usa `useEmergency` (nome/idade/tipo sanguíneo) e `useCurrentUser` (curador no rodapé)
- `resumo/page.tsx`: Client Component; card 30d com borda `rgba(46,125,107,0.4)`; botão "+ Novo resumo" navega para `/resumo/30d`

**MVP completo ✅ — sem próximos passos obrigatórios.**

### Fatia C — Sistema de Níveis de Acesso

Arquivos criados/modificados:
- `lib/access-level.ts` (novo)
- `lib/api/approvals.ts` (novo)
- `lib/api/health-profile.ts` (elderlyUserId, curatorUserId adicionados ao tipo)
- `lib/api/conditions.ts` (approvalStatus em Condition e Treatment; toast.info em PENDING)
- `hooks/useMedications.ts` (approvalStatus em Medication; toast.info em PENDING)
- `components/approvals/pending-approvals.tsx` (novo)
- `components/dashboard/dash-hero.tsx` (prop isSelf; narrativa em primeira pessoa)
- `app/(app)/dashboard/page.tsx` (convertido para client component; PendingApprovals integrado)
- `components/layout/sidebar.tsx` (Checklist filtrado por access.showChecklist)
- `components/medications/meds-desktop.tsx` (canCreate/canManage controlam botões)
- `components/medications/meds-mobile.tsx` (canCreate/canManage controlam botões)
- `components/conditions/conditions-list.tsx` (canCreate/canManage propagados)
- `components/conditions/condition-card.tsx` (canCreate/canManage controlam botões em TreatmentRow)

Regras do sistema:
- CURATOR → level1 (canCreate, canManage, canApprove, showChecklist)
- ELDERLY + próprio perfil → level1
- CAREGIVER → level2 (canCreate, canPropose, showChecklist; aprovações pendentes)
- FAMILY → level2 (canCreate, canPropose; sem showChecklist)
- ELDERLY em perfil de outro → level3 (somente leitura)
- Regra de ouro: sempre `getAccessInfo()`, nunca `user.role` direto nos componentes

### Fatia 13 — Convite para pessoa cuidada (frontend, concluída em 29/06/2026)

Arquivos criados/modificados:
- `hooks/useInviteElderly.ts` — mutation para POST /health-profile/:id/invite-elderly; invalida queryKey ['health-profile']
- `components/ciclo/invite-elderly-form.tsx` — formulário de convite (email + texto explicativo + estado de sucesso); mesmos estilos do InviteForm
- `components/ciclo/care-circle-desktop.tsx` — DialogState estendido com 'invite-elderly'; botão "Vincular a pessoa cuidada" (ícone Heart, estilo outline sálvia) visível quando isCurator && !profile?.elderlyUserId; DialogOverlay para InviteElderlyForm
- `components/ciclo/care-circle-mobile.tsx` — SheetState estendido com 'invite-elderly'; banner condicional com subtítulo; BottomSheet para InviteElderlyForm
- `lib/api/health-profile.ts` — elderlyUserId alterado de `string` para `string | null`

### Fatia 7 — Convite por email (concluída)

Arquivos criados/modificados:
- `hooks/useInviteByEmail.ts` — mutation para POST /api/proxy/access-control/invite
- `components/ciclo/invite-form.tsx` — reescrito para usar email em vez de UUID

Padrões adicionados:
- `z.email()` obrigatório no Zod 4 (não `z.string().email()`)
- `onCancel?: () => void` mantido como prop opcional sem uso no corpo para não quebrar componentes pai
- Erros do backend exibidos inline no formulário via `onError` do `useMutation`

### Fatia 12 — Convite por Token (concluída em 29/06/2026)

Arquivos modificados:
- `app/(auth)/convite/page.tsx` — reescrito com integração real ao backend
- `app/(auth)/login/page.tsx` — adicionado `InviteBanner` para `?convite=aceito`

**Comportamento da tela `/convite`:**
- Lê o token via `useSearchParams` dentro de `<Suspense>` (obrigatório no Next.js 16 — mesmo padrão de `redefinir-senha/page.tsx`)
- `useEffect` chama `GET /api/proxy/invites/:token` ao montar o componente
- Estado `tokenStatus: 'loading' | 'valid' | 'invalid' | 'expired' | 'used'` controla o que é exibido:
  - `loading` → "Validando seu convite…"
  - `valid` → formulário com email pré-preenchido e bloqueado
  - `used` → "Este convite já foi utilizado."
  - `expired` → "Este convite expirou. Peça um novo convite ao responsável."
  - `invalid` com token → "Este link de convite é inválido."
  - `invalid` sem token → "Nenhum convite encontrado. Verifique o link recebido por e-mail."
- Detecção de `expired`/`used` por palavras-chave na mensagem do backend (`expir`, `utiliz/usado/used`)
- Campo email fora do schema Zod (não validado pelo formulário — é display-only)
- Submit chama `POST /api/proxy/invites/:token/accept` com `{ name, password }`
- Sucesso redireciona para `/login?convite=aceito`

**Banner de confirmação no login:**
- Componente `InviteBanner` (sub-componente dentro de `<Suspense fallback={null}>`)
- Lê `useSearchParams` de forma isolada — `LoginPage` principal não usa `useSearchParams`
- Renderiza `null` se o parâmetro não estiver presente (sem custo visual)
- Mensagem: "Conta criada com sucesso! Faça login para acessar o Zel's."
- Estilo: fundo `rgba(95,130,96,0.12)`, texto `var(--zels-primary-strong)`, borda sálvia sutil

---

## Melhorias futuras

### ✅ "Adicionar aos medicamentos" no card de tratamento
- Implementado em `components/conditions/condition-card.tsx`
- `TreatmentRow` tem botão "Adicionar aos medicamentos" (ícone Pill)
- `parseTreatment(description)` extrai name e dosage do texto do tratamento
- Abre `PrescriptionDialog` em modo criação com name e dosage pré-preenchidos
- Usuário ainda preenche frequência, horários e data de início manualmente

### ✅ Upload de arquivo em exames
- `hooks/useUploadExamFile.ts` — POST /exams/:id/upload via FormData
- `hooks/useExamFileUrl.ts` — GET /exams/file/:id
- `exam-card.tsx` — botão "Anexar arquivo" / "Substituir" (cursor pointer, cor primary) / link "Ver"
- Badge âmbar "Aguardando resultado" quando fileUrl null + notes preenchido
- Badge verde "Resultado anexado" quando fileUrl preenchido
- Proxy já suportava multipart via arrayBuffer() — nenhuma alteração necessária

### ✅ Exame criado automaticamente ao agendar compromisso tipo EXAM
- `useCreateAppointment.ts` — após criar EXAM, faz POST /exams automaticamente
- Mapeamento: title → type, scheduledAt → examDate, notes → notes
- Falha no POST /exams não reverte o compromisso — toast.warning orienta o usuário
- Chip "Futuros" adicionado aos filtros de exames (examDate >= 00:00:01 hoje)
- Bug corrigido: from fixado em setHours(0,0,1,0) para evitar loop infinito de queries

### ✅ Checklist automático com sugestões
- `SuggestionsSheet` (`components/checklist/suggestions-sheet.tsx`): busca medicações (`GET /medications/today`), compromissos (`GET /appointments`) e rotinas (`GET /checklist-templates/:healthProfileId`) em paralelo antes de criar o checklist
- Dialog de confirmação com três grupos: Rotinas, Medicações, Compromissos
- Todos os itens pré-selecionados; usuário pode desmarcar antes de confirmar

### ✅ Tarefas de rotina no checklist
- Novo model `ChecklistTemplate` no backend (módulo checklists)
- Endpoints: `POST/GET/PATCH/DELETE /checklist-templates`
- `hooks/useChecklistTemplates.ts`: `useChecklistTemplates`, `useCreateChecklistTemplate`, `useDeleteChecklistTemplate`
- Toggle "Apenas hoje / Rotina diária" no `AddItemSheet` (mobile) e `AddItemInline` (desktop)
- `components/checklist/routines-sheet.tsx`: gerenciar rotinas cadastradas
- Período "Madrugada" (0h–5h59) adicionado ao checklist mobile

### ✅ Desfazer + Reagendar na Agenda
- Botão "Desfazer" em compromissos `COMPLETED`/`CANCELLED`/`MISSED`: chama `PATCH /appointments/:id/status { status: 'SCHEDULED' }`
- Botão "Reagendar" disponível em todos os status (`SCHEDULED` e não-`SCHEDULED`)
- `agenda-mobile.tsx` e `agenda-desktop.tsx` atualizados

### ✅ Melhorias visuais no Checklist
- Badge "SOMENTE LEITURA" removido do desktop
- `StatusCircle` adicionado em `components/checklist/task-row.tsx`: círculo visual por status (verde+check, âmbar, vermelho+X, cinza vazio)
- `task-row.tsx` compartilhado entre mobile e desktop

---

## Polimentos recentes (sessão 05/06/2026)

### Dashboard (`components/dashboard/dash-hero.tsx`)
- Card "GLICEMIA" corrigido: estava exibindo `heart_rate`; agora usa `blood_glucose` (mg/dL)
- Card "HUMOR" renomeado para "FREQ. CARDÍACA" e conectado aos dados reais de `heart_rate`
- Hook `useVitalsLatest` (`hooks/useVitalsLatest.ts`): tipo `LatestVitals` atualizado com campo `blood_glucose`

### Checklist (`components/checklist/checklist-desktop.tsx`)
- Proporção das colunas ajustada: coluna "Template do checklist" de 280px → 360px
- Texto "até HH:MM" removido do cabeçalho da seção "Hoje · José" (não comunicava nada útil)
- Função `currentTimeLabel()` removida (ficou sem uso)
- `SortableRow`: botão "editar" (disabled) substituído por `Trash2` funcional com `window.confirm` + `useDeleteChecklistItem`

### Checklist (`components/checklist/checklist-mobile.tsx`)
- `RoutinesSheet`: já tem delete com confirmação inline (`Trash2` + `useDeleteChecklistTemplate`) — sem `window.confirm`, confirmação em dois passos direto no sheet

---

## Pendências conhecidas

### Botão "editar" no Template do Checklist
- **Localização:** componente `SortableRow` em `components/checklist/checklist-desktop.tsx`
- **Estado atual:** botão `disabled`, sem handler — placeholder visual
- **O que falta para implementar:**
  1. Backend: atualizar `PATCH /checklists/items/:itemId` para aceitar `itemName` e `scheduledTime`
  2. Frontend: atualizar hook `useUpdateChecklistItem` em `lib/api/checklists.ts` para incluir esses campos
  3. Frontend: implementar formulário inline de edição no `SortableRow`

### ~~Curador ausente na tela de Ciclo de Cuidados~~ — ✅ Resolvido em 29/06/2026
- **Solução:** backend atualizado para incluir `curatorUser: { id, name, displayName }` em `GET /health-profile/me`; tipo `HealthProfile` atualizado em `lib/api/health-profile.ts`; `useMemo` em `care-circle-desktop.tsx` e `care-circle-mobile.tsx` usa `profile.curatorUser?.name ?? 'Curador'` e `profile.curatorUser?.displayName ?? null` ao construir o membro sintético
- **Padrão:** `AccessControl.user.displayName` é `string | null` (não apenas `string`) — aceita `null` quando o curador ainda não definiu apelido

---

## Alterações recentes — sessão 29/06/2026

### lib/api/health-profile.ts
- Tipo `HealthProfile` atualizado: campo `curatorUser?: { id: string; name: string; displayName?: string | null } | null` adicionado — retornado pelo backend junto com `GET /health-profile/me`

### hooks/useAccessControl.ts
- `AccessControl.user.displayName` alterado de `string | undefined` para `string | null` — necessário para compatibilidade com o curador sintético (que passa `null` quando o curador não tem apelido)

### components/ciclo/care-circle-desktop.tsx e care-circle-mobile.tsx
- Curador sintético no `useMemo` agora usa `profile.curatorUser?.name ?? 'Curador'` e `profile.curatorUser?.displayName ?? null` — exibe o nome real do curador em vez de texto genérico

### app/(app)/perfil/page.tsx
- Adicionado `roleLabels` e exibição de "Seu papel: X" abaixo do `<PageHeader>` (via `user.role` de `useCurrentUser()`)
- Adicionado `profile.fullName` como overline acima do título "Perfil de saúde" para indicar de quem é o perfil

---

## Alterações recentes — sessão 07/06/2026

### hooks — appointments
- useCreateAppointment: removido bloco if (kind === 'EXAM') que chamava
  api.post('/exams') diretamente; onSuccess agora invalida ['exams']
- useUpdateAppointment: adicionada invalidação de ['exams'] no onSuccess
- useDeleteAppointment: adicionada invalidação de ['exams'] no onSuccess
  O backend agora é o único responsável por gerenciar exames vinculados.

### components/agenda/agenda-desktop.tsx
- Removido botão Cancelar (mudança de produto: compromissos só podem
  ser excluídos definitivamente)
- Adicionado botão lixeira (Trash2) com confirmação de dois cliques
  em AppointmentRow e NextAppointmentCard
- Adicionados três modos de visualização: '30days' | 'monthly' | 'all'
  controlados por estado viewMode
- Janela de busca ampliada de +30 para +365 dias
- Novos componentes internos: MonthlyView e AllAppointmentsView
- CalendarStrip: prop title?: string adicionada (título condicional)
- Campo scheduledAt: onChange intercepta ano > 4 dígitos e trunca

### components/agenda/agenda-mobile.tsx
- Removido botão Cancelar do AppointmentDetail

### Mudança estrutural: Exames movidos para tela própria
- Criado `app/(app)/exames/page.tsx` — rota independente `/exames`
- Criado `components/exams/exams-list.tsx` — componente principal da tela de exames
- `components/layout/sidebar.tsx`: item "Exames" adicionado entre Condições e Agenda, ícone `FlaskConical`
- `components/conditions/conditions-list.tsx`: aba de Exames removida; tela de Condições exibe conteúdo direto, sem tab switcher
- `app/(app)/condicoes/page.tsx`: título atualizado de "Condições e Exames" para "Condições"
- `exam-card.tsx` e `exam-form.tsx` permanecem em `components/conditions/` — importados de lá pelo novo `exams-list.tsx`
- `lib/api/exams.ts` e `agenda-view.tsx` não foram alterados

---

## Alterações recentes — sessão 15/06/2026

### Harmonização de cores de avatares e badges

- Criados 4 tokens `--zels-avatar-*` em `app/globals.css` (única fonte de verdade para cor de avatar)
- `ROLE_CONFIG` em `components/ciclo/person-card.tsx` migrado dos hex antigos (`#7b8aa6`, `#a87b8a`, `#8a6a9b`) para os novos tokens; entrada `ELDERLY` adicionada (`label: 'Paciente'`, `color: var(--zels-avatar-patient)`)
- 3 avatares do paciente titular migrados de `#c5a275` para `var(--zels-avatar-patient)`: `care-circle-desktop.tsx`, `care-circle-mobile.tsx`, `dash-hero.tsx`
- 3 avatares do usuário logado migrados de hex fixo para papel real via `ROLE_CONFIG[currentUser.role]?.color`: `care-circle-mobile.tsx` (já tinha ROLE_CONFIG importado), `agenda-mobile.tsx` (ROLE_CONFIG importado de `@/components/ciclo/person-card`), `checklist-mobile.tsx` (idem); fallback `var(--zels-avatar-curator)` durante carregamento
- `KIND_TONE` em `components/agenda/kind-badge.tsx` harmonizado com a paleta da marca: EXAM → terracota, THERAPY → `--zels-avatar-family` (#9B5A42), VACCINE → `--zels-deep` (corrige duplicata de cor com CONSULTATION)
- Botão "Remover" em `components/ciclo/care-circle-desktop.tsx`: 2 ocorrências de `#b8341a` substituídas por `var(--zels-urgent)`

---

## Padrões visuais consolidados (sessão 20/06/2026)

### Regra inviolável de texto em botões
`var(--primary-foreground)` é IMPREVISÍVEL neste projeto.
Todo botão com background colorido deve usar `color: '#ffffff'` fixo.
Nunca usar `var(--primary-foreground)` — mesmo que pareça correto.

### Tokens de cor obrigatórios
- Botões de ação primária: `background: var(--primary)`, `color: '#ffffff'`
- Botões de ação escura: `background: var(--zels-deep)`, `color: '#ffffff'`
- Avatares: sempre `var(--zels-avatar-patient/curator/caregiver/family)`
  Nunca hex hardcoded de avatar.
- Overlines de seção (labels uppercase): `color: var(--zels-primary)`
  Nunca `rgba(61,43,31,0.42)` em overlines interativas ou de seção.
- Café `#3D2B1F`: APENAS para texto corrido. Nunca como `backgroundColor` de botão.

### Painel de métricas do dashboard
O componente `HeroStat` usa `background: var(--zels-deep)` (`#2C3E2D`).
Texto dentro dele: sempre `#ffffff` ou `rgba(250,248,245,X)` — nunca café.

---

## Medicamentos — KPI cards (atualizado 23/06/2026)

- **"Aderência últimos 7 dias"**: usa `computeWeeklyStats()` — exclui hoje do cálculo; loading por `medsLoading || anyLogsLoading`
- **"Aderência últimos 30 dias"**: usa `compute30DayStats()` — janela de logs estendida para 30 dias (`fromDate = days30[0]`); retorna `null` quando `totalExpected === 0`, exibe `--%`
- **"Dias 100%"** e **"Atrasos últimos 7 dias"**: sem mudança de lógica; `lateCount` e `perfectDays` continuam vindos de `computeWeeklyStats()`
- **Seção "Doses de hoje"**: exibe `X/Y · Z% hoje` com cor dinâmica — verde (`c.primary`) = 100%, âmbar (`c.warn`) = ≥75%, terracota (`c.urgent`) = abaixo de 75%
- **Arquivo:** `components/medications/meds-desktop.tsx`
- **Atenção:** `fromDate` agora usa `days30[0]` (30 dias atrás) para que `logsByMedId` cubra ambas as janelas; o heatmap e `PrescriptionsList` continuam recebendo `days` (7 dias)

---

## Comandos úteis

```bash
npm run dev     # inicia o servidor de desenvolvimento
npm run build   # build de produção
npm run lint    # ESLint
```
