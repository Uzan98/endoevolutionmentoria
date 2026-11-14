---
name: backend-producao
description: Levar a plataforma Endo Evolution da demonstração (dados no navegador) para produção com login real, banco de dados compartilhado e vídeos protegidos. Use quando o cliente aprovar o projeto e pedir para colocar alunos reais.
---

# Da demonstração para produção

Hoje toda a persistência está em `src/store.tsx` (localStorage). As páginas só usam o hook `useStore()`,
então a troca de backend acontece nesse arquivo, sem reescrever telas.

## Plano sugerido (Supabase)

1. **Confirmar com o usuário** o provedor (Supabase é o sugerido: auth + Postgres + storage, plano gratuito
   para começar) e quem será o dono da conta. Não crie contas em nome do cliente.
2. **Tabelas** (com Row Level Security ligada):
   - `profiles` (id = auth.users.id, name, city, role `aluno|mentor`)
   - `modules` (id, title, description, position)
   - `lessons` (id, module_id, title, description, duration_min, video_url, position)
   - `materials` (id, lesson_id, name, file_path)
   - `progress` (user_id, lesson_id, completed_at) — PK composta
   - `notes` (user_id, lesson_id, text, updated_at)
   - `meetings` (id, title, starts_at, duration_min, link)
   Políticas: alunos leem conteúdo e só leem/escrevem o próprio `progress`/`notes`; mentor escreve tudo.
3. **Auth**: trocar `login`/`logout` por `supabase.auth.signInWithPassword` / `signOut`; o cadastro de alunos
   pelo mentor vira um convite por e-mail (`auth.admin.inviteUserByEmail` numa Edge Function — nunca exponha a
   service key no front). Remover a senha `demo123` e o bloco de acesso de demonstração do `Login.tsx`.
4. **Store**: manter a mesma interface `Store`, carregando dados com React Query ou `useEffect` e trocando cada
   `setDb` por chamadas ao Supabase. Estados de carregamento e erro dentro de cada bloco.
5. **Materiais**: bucket privado no Supabase Storage com URLs assinadas.
6. **Vídeos**: YouTube não listado é o mais simples, mas qualquer um com o link assiste. Para conteúdo pago,
   use Vimeo com privacidade por domínio, Panda Video ou Bunny Stream. `src/lib/video.ts` já aceita Vimeo;
   adicione o formato do provedor escolhido ali.
7. **Variáveis**: `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no `.env` local e na Vercel. Nunca commitar `.env`.
8. **Verificar**: fluxo completo em dois navegadores diferentes (mentor publica, aluno vê; aluno conclui, mentor
   vê o progresso).
