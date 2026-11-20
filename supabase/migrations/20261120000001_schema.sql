-- Endo Evolution · estrutura do banco
-- Tabelas, regras de segurança (RLS) e funções auxiliares.
-- Pode ser aplicado num projeto Supabase novo (SQL Editor ou supabase db push).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- perfis
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  email text not null default '',
  role text not null default 'aluno' check (role in ('aluno', 'mentor')),
  genero text check (genero in ('f', 'm')),
  city text,
  joined_at date not null default current_date,
  last_lesson_id text
);

-- cria o perfil quando um usuário é criado no Auth (cadastro, convite ou seed)
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name, city)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'name', split_part(coalesce(new.email, ''), '@', 1)),
    new.raw_user_meta_data ->> 'city'
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- o usuário logado é mentor?
create function public.is_mentor() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'mentor');
$$;

-- ---------------------------------------------------------------- conteúdo
create table public.modules (
  id text primary key default gen_random_uuid()::text,
  title text not null,
  description text not null default '',
  position int not null default 0
);

create table public.lessons (
  id text primary key default gen_random_uuid()::text,
  module_id text not null references public.modules (id) on delete cascade,
  title text not null,
  description text not null default '',
  duration_min int not null default 10 check (duration_min > 0),
  video_url text not null default '',
  materials jsonb not null default '[]'::jsonb, -- [{id, name, url}]
  position int not null default 0
);
create index on public.lessons (module_id, position);

create table public.meetings (
  id text primary key default gen_random_uuid()::text,
  title text not null,
  starts_at timestamptz not null,
  duration_min int not null default 90,
  link text not null default ''
);

-- ---------------------------------------------------------------- aluno
create table public.progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id text not null references public.lessons (id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table public.notes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id text not null references public.lessons (id) on delete cascade,
  body text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

-- ---------------------------------------------------------------- fórum
create table public.threads (
  id text primary key default gen_random_uuid()::text,
  title text not null check (char_length(title) between 8 and 160),
  body text not null check (char_length(body) >= 15),
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  module_id text not null references public.modules (id) on delete cascade,
  lesson_id text references public.lessons (id) on delete set null,
  solution_id text,
  created_at timestamptz not null default now()
);

create table public.replies (
  id text primary key default gen_random_uuid()::text,
  thread_id text not null references public.threads (id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) >= 1),
  created_at timestamptz not null default now()
);
create index on public.replies (thread_id);

alter table public.threads
  add constraint threads_solution_fk foreign key (solution_id) references public.replies (id) on delete set null;

create table public.thread_votes (
  thread_id text not null references public.threads (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  primary key (thread_id, user_id)
);

create table public.reply_votes (
  reply_id text not null references public.replies (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  primary key (reply_id, user_id)
);

-- nomes visíveis no fórum sem expor e-mail dos colegas
create view public.people with (security_invoker = false) as
  select id, name, role from public.profiles;

-- ---------------------------------------------------------------- RLS
alter table public.profiles enable row level security;
alter table public.modules enable row level security;
alter table public.lessons enable row level security;
alter table public.meetings enable row level security;
alter table public.progress enable row level security;
alter table public.notes enable row level security;
alter table public.threads enable row level security;
alter table public.replies enable row level security;
alter table public.thread_votes enable row level security;
alter table public.reply_votes enable row level security;

-- perfis: cada um vê o seu; o mentor vê todos. Ninguém muda o próprio papel.
create policy "perfil: ver o próprio ou mentor" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_mentor());
create policy "perfil: editar o próprio" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.profiles from authenticated;
grant update (name, city, genero, last_lesson_id) on public.profiles to authenticated;

-- conteúdo: qualquer aluno logado lê; só o mentor escreve
create policy "módulos: ler" on public.modules for select to authenticated using (true);
create policy "módulos: mentor escreve" on public.modules for all to authenticated using (public.is_mentor()) with check (public.is_mentor());
create policy "aulas: ler" on public.lessons for select to authenticated using (true);
create policy "aulas: mentor escreve" on public.lessons for all to authenticated using (public.is_mentor()) with check (public.is_mentor());
create policy "encontros: ler" on public.meetings for select to authenticated using (true);
create policy "encontros: mentor escreve" on public.meetings for all to authenticated using (public.is_mentor()) with check (public.is_mentor());

-- progresso e anotações: só os próprios; o mentor lê o progresso da turma
create policy "progresso: ver" on public.progress for select to authenticated using (user_id = auth.uid() or public.is_mentor());
create policy "progresso: marcar" on public.progress for insert to authenticated with check (user_id = auth.uid());
create policy "progresso: desmarcar" on public.progress for delete to authenticated using (user_id = auth.uid());
create policy "anotações: próprias" on public.notes for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- fórum
create policy "dúvidas: ler" on public.threads for select to authenticated using (true);
create policy "dúvidas: perguntar" on public.threads for insert to authenticated with check (author_id = auth.uid());
create policy "dúvidas: autor ou mentor edita" on public.threads for update to authenticated
  using (author_id = auth.uid() or public.is_mentor()) with check (author_id = auth.uid() or public.is_mentor());
create policy "dúvidas: autor ou mentor exclui" on public.threads for delete to authenticated using (author_id = auth.uid() or public.is_mentor());
create policy "respostas: ler" on public.replies for select to authenticated using (true);
create policy "respostas: responder" on public.replies for insert to authenticated with check (author_id = auth.uid());
create policy "respostas: autor ou mentor exclui" on public.replies for delete to authenticated using (author_id = auth.uid() or public.is_mentor());
create policy "votos dúvida: ler" on public.thread_votes for select to authenticated using (true);
create policy "votos dúvida: próprio" on public.thread_votes for insert to authenticated with check (user_id = auth.uid());
create policy "votos dúvida: retirar" on public.thread_votes for delete to authenticated using (user_id = auth.uid());
create policy "votos resposta: ler" on public.reply_votes for select to authenticated using (true);
create policy "votos resposta: próprio" on public.reply_votes for insert to authenticated with check (user_id = auth.uid());
create policy "votos resposta: retirar" on public.reply_votes for delete to authenticated using (user_id = auth.uid());

-- visitantes sem login não acessam nada
revoke all on all tables in schema public from anon;
revoke all on public.people from anon;
grant select on public.people to authenticated;
