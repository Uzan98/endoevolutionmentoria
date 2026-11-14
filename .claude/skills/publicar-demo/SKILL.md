---
name: publicar-demo
description: Gerar o build e publicar a plataforma Endo Evolution num link público (Vercel ou Netlify) para o cliente acessar. Use quando pedirem para colocar no ar, gerar link, publicar ou fazer deploy.
---

# Publicar a demonstração

## Antes

1. `npm install && npm run build` precisa terminar sem erros (o `build` já roda a checagem de tipos).
2. `npm run preview` e abra http://localhost:4173: entre como aluna e como mentor e passe pelas telas.

## Vercel (recomendado)

- Pelo site: importar o repositório do GitHub em vercel.com → framework "Vite" → Deploy. Nada a configurar:
  `vercel.json` já redireciona todas as rotas para o `index.html`.
- Pela linha de comando (o usuário precisa estar logado na Vercel na máquina dele):
  `npx vercel --prod`.

## Netlify

- Build command `npm run build`, publish directory `dist`. O arquivo `public/_redirects` cuida das rotas.

## Depois

- Mande ao cliente o link e os acessos de demonstração (README).
- Lembre: cada navegador tem seus próprios dados nesta versão. Se o cliente for testar o painel do mentor,
  explique que as mudanças não aparecem em outro aparelho até existir o backend (skill `backend-producao`).
- Nunca publique com dados pessoais reais de alunos enquanto a camada de dados for localStorage.
