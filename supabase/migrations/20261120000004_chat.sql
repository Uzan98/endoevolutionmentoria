-- Chat aluno <-> mentoria (uma conversa por aluno), com Supabase Realtime.
--
-- * messages: imutáveis pela API (sem UPDATE/DELETE), horário e remetente definidos no servidor.
-- * chat_reads: até onde cada participante leu cada conversa (não lidas e "Visto").
-- * Realtime: mensagens e leituras via Postgres Changes (respeita RLS);
--   "digitando…" e "mentor online" via canais privados (RLS em realtime.messages).

-- ---------------------------------------------------------------- mensagens
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade, -- dono da conversa
  sender_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index messages_student_created_idx on public.messages (student_id, created_at);

-- horário e remetente vêm sempre do servidor, nunca do cliente
create function private.messages_server_fields() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.created_at := now();
  new.sender_id := auth.uid();
  return new;
end $$;
revoke execute on function private.messages_server_fields() from public, anon, authenticated;
create trigger messages_server_fields before insert on public.messages
  for each row execute function private.messages_server_fields();

alter table public.messages enable row level security;
create policy "mensagens: aluno vê a própria conversa, mentor vê todas" on public.messages for select to authenticated
  using (student_id = auth.uid() or private.is_mentor());
create policy "mensagens: enviar na própria conversa (mentor em qualquer uma)" on public.messages for insert to authenticated
  with check (sender_id = auth.uid() and (student_id = auth.uid() or private.is_mentor()));
revoke all on public.messages from anon;
revoke update, delete, truncate on public.messages from authenticated;

-- ---------------------------------------------------------------- leituras
create table public.chat_reads (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (user_id, student_id)
);

alter table public.chat_reads enable row level security;
-- o aluno vê as leituras da própria conversa (para o "Visto"); o mentor vê todas
create policy "leituras: participantes da conversa" on public.chat_reads for select to authenticated
  using (user_id = auth.uid() or student_id = auth.uid() or private.is_mentor());
create policy "leituras: marcar como lida (própria)" on public.chat_reads for insert to authenticated
  with check (user_id = auth.uid() and (student_id = auth.uid() or private.is_mentor()));
create policy "leituras: atualizar a própria" on public.chat_reads for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and (student_id = auth.uid() or private.is_mentor()));
revoke all on public.chat_reads from anon;
revoke delete, truncate on public.chat_reads from authenticated;

-- ---------------------------------------------------------------- realtime
alter publication supabase_realtime add table public.messages, public.chat_reads;

-- Canais privados (broadcast/presence). Tópicos:
--   chat:<student_id>   -> "digitando…" da conversa: só o próprio aluno e mentores
--   equipe-online       -> presença do mentor: todos os logados recebem, só mentores entram
create policy "realtime: receber nos canais do chat" on realtime.messages for select to authenticated
  using (
    realtime.topic() = 'chat:' || auth.uid()::text
    or (realtime.topic() like 'chat:%' and private.is_mentor())
    or realtime.topic() = 'equipe-online'
  );
create policy "realtime: enviar nos canais do chat" on realtime.messages for insert to authenticated
  with check (
    realtime.topic() = 'chat:' || auth.uid()::text
    or (realtime.topic() like 'chat:%' and private.is_mentor())
    or (realtime.topic() = 'equipe-online' and private.is_mentor())
  );

notify pgrst, 'reload schema';
