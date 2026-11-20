-- Remove as contas de demonstração e tudo o que elas criaram (progresso, anotações, dúvidas).
-- Módulos, aulas e encontros continuam. Rode antes de liberar para alunos reais.
delete from auth.users where id in ('00000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000002', '00000000-0000-4000-a000-000000000003', '00000000-0000-4000-a000-000000000004', '00000000-0000-4000-a000-000000000005', '00000000-0000-4000-a000-000000000006');
