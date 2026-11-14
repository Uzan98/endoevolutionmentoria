---
name: adicionar-conteudo
description: Adicionar ou trocar módulos, aulas, vídeos, materiais em PDF, alunos ou encontros da plataforma Endo Evolution. Use quando o cliente mandar conteúdo novo (lista de aulas, links de vídeo, PDFs) ou pedir para mudar o conteúdo de exemplo.
---

# Adicionar conteúdo à plataforma

O conteúdo vive em dois lugares:

1. **`src/data/seed.ts`** — o conteúdo inicial, que todo navegador recebe na primeira visita (ou ao clicar em "Restaurar dados de demonstração").
2. **Painel do mentor (`/admin`)** — edições feitas na interface, salvas só naquele navegador (localStorage).

Para mudanças permanentes, edite sempre o `seed.ts`.

## Passos

1. Leia `src/data/seed.ts` inteiro antes de mudar.
2. Módulos ficam em `seedModules`, na ordem de exibição. Cada aula é criada com o helper
   `lesson(titulo, duracaoEmMinutos, descricao, materiais?)`. Os ids `aula-N` são gerados em sequência —
   se reordenar ou inserir aulas no meio, revise `seedCompleted` e `seedNotes`, que usam esses ids.
3. Vídeo: troque o `videoUrl` gerado (hoje alterna `VIDEO_A`/`VIDEO_B`) pelo link real. Aceita YouTube
   (`youtu.be/ID`, `youtube.com/watch?v=ID`), Vimeo (`vimeo.com/ID` ou `vimeo.com/ID/HASH` para não listados)
   e arquivo direto `.mp4`. A conversão para embed está em `src/lib/video.ts`.
   Para passar o link na criação, acrescente um parâmetro ao helper `lesson` em vez de editar cada objeto.
4. Materiais: coloque o PDF em `public/materiais/` e referencie como `/materiais/nome.pdf`.
5. Alunos: `seedUsers` (role `"aluno"` ou `"mentor"`).
6. Encontros: `seedMeetings` é gerado por `nextThursdays()` para a demo sempre mostrar datas futuras.
   Com a agenda real, troque por datas ISO fixas.
7. Como o localStorage guarda a versão antiga, mude a constante `KEY` em `src/store.tsx`
   (ex.: `endoevolution:v2`) para que os navegadores carreguem o novo seed.
8. Verifique: `npm run build` e abra `/modulos` no navegador.
