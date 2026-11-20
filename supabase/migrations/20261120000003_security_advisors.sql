-- Correções apontadas pelo Security Advisor do Supabase.
--
-- 1) Funções auxiliares saem do esquema "public" (exposto pela API em /rest/v1/rpc)
--    para um esquema privado. As regras RLS continuam funcionando: elas apontam
--    para a função, não para o nome do esquema.
-- 2) As vistas "people" e "catalog" (security definer) viram tabelas comuns com RLS,
--    mantidas por gatilhos. Assim nenhuma consulta passa por cima das regras.

-- ---------------------------------------------------------------- esquema privado
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated; -- as regras RLS chamam private.is_mentor()

alter function public.is_mentor() set schema private;
alter function public.handle_new_user() set schema private;

revoke execute on function private.is_mentor() from public, anon;
grant execute on function private.is_mentor() to authenticated;
revoke execute on function private.handle_new_user() from public, anon, authenticated;

-- ---------------------------------------------------------------- people (nomes no fórum)
drop view if exists public.people;

create table public.people (
  id uuid primary key references public.profiles (id) on delete cascade,
  name text not null,
  role text not null
);
insert into public.people (id, name, role) select id, name, role from public.profiles;

alter table public.people enable row level security;
create policy "pessoas: alunos logados leem nomes" on public.people for select to authenticated using (true);
revoke all on public.people from anon, authenticated;
grant select on public.people to authenticated;

create function private.sync_people() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.people (id, name, role) values (new.id, new.name, new.role)
  on conflict (id) do update set name = excluded.name, role = excluded.role;
  return new;
end $$;
revoke execute on function private.sync_people() from public, anon, authenticated;

create trigger profiles_sync_people after insert or update of name, role on public.profiles
  for each row execute function private.sync_people();

-- ---------------------------------------------------------------- catalog (vitrine do login)
drop view if exists public.catalog;

create table public.catalog (
  id text primary key,
  title text not null,
  position int not null default 0,
  lessons int not null default 0
);

alter table public.catalog enable row level security;
create policy "vitrine: pública" on public.catalog for select to anon, authenticated using (true);
revoke all on public.catalog from anon, authenticated;
grant select on public.catalog to anon, authenticated;

create function private.refresh_catalog() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.catalog where true;
  insert into public.catalog (id, title, position, lessons)
    select m.id, m.title, m.position, count(l.id)::int
    from public.modules m
    left join public.lessons l on l.module_id = m.id
    group by m.id;
  return null;
end $$;
revoke execute on function private.refresh_catalog() from public, anon, authenticated;

create trigger modules_refresh_catalog after insert or update or delete on public.modules
  for each statement execute function private.refresh_catalog();
create trigger lessons_refresh_catalog after insert or update or delete on public.lessons
  for each statement execute function private.refresh_catalog();

-- preenche a vitrine agora
insert into public.catalog (id, title, position, lessons)
  select m.id, m.title, m.position, count(l.id)::int
  from public.modules m
  left join public.lessons l on l.module_id = m.id
  group by m.id;

notify pgrst, 'reload schema';
