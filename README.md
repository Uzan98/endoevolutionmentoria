# Endo Evolution · Plataforma da mentoria

Área de membros com video-aulas organizadas em módulos. Versão de demonstração (MVP) para apresentar ao cliente.

## Rodar localmente

```bash
npm install
npm run dev
```

Abra http://localhost:5173. O site já aponta para o Supabase do projeto (arquivo `.env`). Acessos de demonstração (senha `demo123`):

| Perfil | E-mail |
| --- | --- |
| Aluna | aluna@endoevolution.com |
| Mentor | mentor@endoevolution.com |

A tela de login tem botões que preenchem esses dados.

## O que a demonstração tem

**Área do aluno**
- Login com rotas protegidas.
- Início: progresso geral, módulo atual, "continue de onde parou", próximos encontros ao vivo, anotações.
- Módulos: lista com status e uma barra por aula (largura = duração da aula).
- Página da aula: player (YouTube, Vimeo ou .mp4), marcar como concluída (automático ao fim de um .mp4), próxima aula, materiais em PDF, anotações pessoais.
- Encontros ao vivo: agenda com link da sala.
- Fórum de dúvidas: perguntas por módulo/aula, busca, filtros (sem resposta, resolvidas, minhas), respostas com destaque para o mentor, "marcar como solução", votos e notificação quando alguém responde. Cada aula mostra as dúvidas ligadas a ela.
- Meu perfil: dados pessoais e troca de senha.
- Layout próprio para celular (menu em tela cheia).

**Painel do mentor** (`/admin`, só para o perfil mentor)
- Criar, editar, excluir e reordenar módulos e aulas; colar o link do vídeo com pré-visualização; anexar materiais.
- Alunos: progresso de cada aluno, cadastro de novos alunos.
- Encontros: agendar e remover.
- Fórum: contador no menu com as dúvidas que ainda não têm resposta do mentor; o mentor pode responder, marcar solução e moderar (excluir).
- Cadastrar aluno envia um convite por e-mail (função `convidar-aluno` no Supabase); o aluno cria a senha pelo link.

## App no celular (PWA)

A plataforma é um app instalável:

- **Android (Chrome):** aparece o convite "Instalar o app" no início (e no menu "Mais"); um toque instala.
- **iPhone (Safari):** o convite explica: Compartilhar → Adicionar à Tela de Início.
- Abre em tela cheia, com ícone próprio, barra de status verde e atalhos (Módulos, Fórum, Encontros) ao segurar o ícone no Android.
- Funciona offline (tudo menos os vídeos, que precisam de internet); um aviso aparece quando cai a conexão.
- No celular: barra de abas inferior, busca e notificações na barra superior, vídeo da aula preso no topo ao rolar, formulários abrindo de baixo para cima, campos com 16px (sem zoom no iPhone) e respeito ao entalhe e à barra de gestos.

Arquivos: `vite.config.ts` (manifesto e service worker via vite-plugin-pwa), `public/icons/`, `public/screenshots/`, `src/lib/pwa.ts`.

## Banco de dados e login (Supabase)

A plataforma usa o Supabase (projeto `ENDOEVOLUTION`, região us-east-1) para login, banco e regras de segurança.

- **Configuração:** `.env` tem a URL do projeto e a chave **pública** (publishable). A chave secreta nunca vai para o site.
- **Estrutura do banco:** `supabase/migrations/` (tabelas e regras RLS: aluno só altera os próprios dados; só o mentor mexe no conteúdo; visitante sem login não vê nada além da vitrine de módulos). Funções auxiliares ficam no esquema `private`, fora da API. Security Advisor sem alertas, exceto a proteção contra senhas vazadas, que exige o plano Pro (ligar em Authentication → Policies ao migrar).
- **Função de servidor:** `supabase/functions/convidar-aluno/` (cadastro de aluno pelo mentor, com convite por e-mail).
- **Conteúdo e contas de demonstração:** `supabase/seed.sql`, gerado por `npm run seed:gen` a partir de `src/data/`.
- **Antes de uma apresentação:** rode `supabase/reset-demo-data.sql` no SQL Editor do Supabase para desfazer o que as contas de demonstração fizeram.
- **Antes de liberar para alunos reais:** rode `supabase/remove-demo.sql` (apaga as contas de demonstração) e mude `VITE_DEMO_LOGIN=false` no `.env`.
- **Cópia local:** o app guarda os dados da última visita no aparelho; abre na hora e funciona sem internet (só leitura). A cópia é apagada ao sair.

## Antes de ir para produção (pendências)

- **E-mails:** o Supabase envia pelo Resend (SMTP `smtp.resend.com`, limite de 30/h no Supabase; 3.000/mês e 100/dia no plano gratuito do Resend). Modelos em português em `supabase/templates/` (aplicar com `python3 scripts/email-templates.py --apply`). **Pendente:** registrar o domínio, verificá-lo no Resend e trocar o remetente provisório `onboarding@resend.dev` (que só entrega para o dono da conta Resend) por `nao-responda@<domínio>`.
- **Vídeos:** os vídeos de exemplo são clipes de domínio público. Troque pelos links reais (de preferência Vimeo ou Panda Video, com proteção por domínio).
- **Pagamento:** ainda não integrado (Stripe ou Hotmart/Kiwify liberando o acesso automaticamente).
- **LGPD:** política de privacidade e termos de uso. Os dados ficam nos EUA (região do projeto); isso precisa constar na política.
- **Contas no nome do cliente:** ver `.claude/skills/publicar-demo` e a conversa sobre transferência da Vercel e do Supabase.

## Estrutura

```
src/
  data/seed.ts         conteúdo inicial: módulos, aulas, alunos, encontros
  store.tsx            camada de dados (Supabase + cópia local para abrir rápido e offline)
  lib/supabase.ts      cliente do Supabase
  lib/                 formatação (datas, durações) e leitura de links de vídeo
  components/          Shell (menu), VideoPlayer, LessonStrip (barra de aulas), ícones
  pages/               Login, Home, Modules, ModulePage, LessonPage, Meetings, Profile, Admin
  styles.css           todo o visual (tokens no :root)
public/materiais/      PDFs de apoio
public/img/            dente translúcido em alta resolução (efeitos em src/components/ToothArt.tsx)
docs/ROTEIRO.md        passo a passo de como a plataforma foi construída e próximos passos
.claude/skills/        skills do projeto para o Claude Code continuar o trabalho
```

## Publicar

`npm run build` gera a pasta `dist/`. Funciona em Vercel (`vercel.json` incluso) ou Netlify (`public/_redirects` incluso). Passo a passo em `.claude/skills/publicar-demo`.
