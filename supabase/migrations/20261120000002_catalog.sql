-- Vitrine pública para a tela de login: só o nome dos módulos e quantas aulas têm.
-- Nada de links de vídeo, descrições de aula ou dados de alunos.
create view public.catalog with (security_invoker = false) as
  select m.id, m.title, m.position, count(l.id)::int as lessons
  from public.modules m
  left join public.lessons l on l.module_id = m.id
  group by m.id
  order by m.position;

grant select on public.catalog to anon, authenticated;
