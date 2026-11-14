# Roteiro: da ideia à demonstração

Como a plataforma foi construída, passo a passo, com a skill usada em cada etapa, e o que vem depois.

## Fase 1 — MVP de demonstração (feito)

| Passo | O que foi feito | Skill |
| --- | --- | --- |
| 1. Escopo | Definido o mínimo para apresentar: login, módulos, player, progresso, materiais, encontros, painel do mentor. Sem backend: dados no navegador. | — (planejamento) |
| 2. Direção visual | Estilo "editorial": saudação tipográfica como título, painéis em cinza-mineral, verde-petróleo só nos dados (aulas concluídas, aula atual). Fontes Instrument Sans e Instrument Serif. | `taste-skill` (modo app) |
| 3. Dados de exemplo | 6 módulos de endodontia, 22 aulas com duração, 6 usuários, 3 encontros com datas sempre futuras. | — |
| 4. Código | React + TypeScript + Vite + React Router. Camada de dados isolada em `src/store.tsx`. | — |
| 5. Verificação visual | Capturas em 1440px e 390px, lint de design (0 falhas) e inspetor no navegador (0 falhas). | `taste-skill` (lint/inspect) |
| 6. Teste de fluxo | Navegador automatizado: rotas protegidas, erro de senha, concluir aula, anotação, permissão do mentor, publicar aula e vê-la como aluno. | `playwright` |
| 7. Documentação | README, este roteiro e as skills do projeto. | — |

## Roteiro da apresentação ao cliente (5 minutos)

1. **Login** — mostrar a tela e entrar como aluna.
2. **Início** — "o aluno sabe na hora onde parou e quanto falta".
3. **Aula** — clicar em "Continuar aula", mostrar player, materiais e anotações; marcar como concluída e voltar ao início para ver o progresso mudar.
4. **Celular** — abrir no celular (ou reduzir a janela) e mostrar o menu.
5. **Mentor** — sair, entrar como mentor, abrir o painel, criar uma aula colando um link do YouTube e mostrar que ela aparece para o aluno.
6. Antes de cada apresentação: painel do mentor → "Restaurar dados de demonstração".

## Fase 2 — Produção (próximos passos)

| Passo | O que fazer | Skill |
| --- | --- | --- |
| 1. Conteúdo real | Receber do cliente: lista de módulos e aulas, links dos vídeos, PDFs, logo e cores. | `adicionar-conteudo` |
| 2. Backend | Autenticação real, banco de dados e armazenamento (sugestão: Supabase). | `backend-producao` |
| 3. Vídeos protegidos | Vimeo (privacidade por domínio) ou Panda Video / Bunny Stream para impedir download e compartilhamento. | `backend-producao` |
| 4. Publicação | Domínio próprio (ex.: membros.endoevolution.com.br) na Vercel. | `publicar-demo` |
| 5. Extras | Certificado de conclusão, liberação gradual de módulos, comentários por aula, e-mails de boas-vindas, integração com checkout (Hotmart/Kiwify). | — |
