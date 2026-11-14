# Endo Evolution · Plataforma da mentoria

Área de membros com video-aulas organizadas em módulos. Versão de demonstração (MVP) para apresentar ao cliente.

## Rodar localmente

```bash
npm install
npm run dev
```

Abra http://localhost:5173. Acessos de demonstração (senha `demo123`):

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
- "Restaurar dados de demonstração" volta tudo ao estado inicial antes de uma apresentação.

## App no celular (PWA)

A plataforma é um app instalável:

- **Android (Chrome):** aparece o convite "Instalar o app" no início (e no menu "Mais"); um toque instala.
- **iPhone (Safari):** o convite explica: Compartilhar → Adicionar à Tela de Início.
- Abre em tela cheia, com ícone próprio, barra de status verde e atalhos (Módulos, Fórum, Encontros) ao segurar o ícone no Android.
- Funciona offline (tudo menos os vídeos, que precisam de internet); um aviso aparece quando cai a conexão.
- No celular: barra de abas inferior, busca e notificações na barra superior, vídeo da aula preso no topo ao rolar, formulários abrindo de baixo para cima, campos com 16px (sem zoom no iPhone) e respeito ao entalhe e à barra de gestos.

Arquivos: `vite.config.ts` (manifesto e service worker via vite-plugin-pwa), `public/icons/`, `public/screenshots/`, `src/lib/pwa.ts`.

## Limites desta versão (importante para a conversa com o cliente)

- **Os dados ficam no navegador** (localStorage). Cada computador tem sua própria cópia; o que o mentor cadastra não aparece no celular do aluno. Para produção, ver `.claude/skills/backend-producao`.
- **Os vídeos de exemplo** são clipes de domínio público (CC0, MDN), não aulas reais. Troque pelo link de cada aula no painel do mentor.
- **Os PDFs** em `public/materiais/` são de exemplo e precisam ser substituídos pelo material oficial.
- Nomes de alunos, temas de aulas e encontros são conteúdo de exemplo para o cliente confirmar.
- Senhas não são criptografadas (é só uma demonstração).

## Estrutura

```
src/
  data/seed.ts         conteúdo inicial: módulos, aulas, alunos, encontros
  store.tsx            camada de dados (localStorage) — trocar por backend em produção
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
