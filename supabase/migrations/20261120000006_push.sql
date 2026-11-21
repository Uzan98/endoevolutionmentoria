-- Notificações push (Web Push) para o app instalado e o navegador.
--
-- Fluxo: algo acontece no banco (mensagem, resposta, dúvida, aula nova, encontro chegando)
--   -> gatilho chama a Edge Function enviar-push (pg_net, assíncrono: não atrasa quem gravou)
--   -> a função escolhe quem recebe, respeita as preferências e envia para cada aparelho.
-- O segredo que autoriza o banco a chamar a função fica no Vault (nome: push_hook_secret)
-- e nos segredos da função (PUSH_HOOK_SECRET). Nunca no código.

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

-- ---------------------------------------------------------------- aparelhos inscritos
create table public.push_subscriptions (
  endpoint text primary key check (endpoint like 'https://%'),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
create policy "push: ver os próprios aparelhos" on public.push_subscriptions for select to authenticated
  using (user_id = auth.uid());
create policy "push: remover os próprios aparelhos" on public.push_subscriptions for delete to authenticated
  using (user_id = auth.uid());
revoke all on public.push_subscriptions from anon;
revoke insert, update, truncate on public.push_subscriptions from authenticated; -- só pela função abaixo

-- Registra (ou passa para a pessoa logada) o aparelho. Um aparelho compartilhado
-- recebe só as notificações de quem entrou por último nele.
create function public.registrar_aparelho(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'login necessário'; end if;
  if p_endpoint !~ '^https://' or length(p_endpoint) > 1000 or length(p_p256dh) > 200 or length(p_auth) > 100 then
    raise exception 'inscrição inválida';
  end if;
  insert into public.push_subscriptions (endpoint, user_id, p256dh, auth, user_agent)
  values (p_endpoint, auth.uid(), p_p256dh, p_auth, left(p_user_agent, 300))
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth,
        user_agent = excluded.user_agent, last_seen_at = now();
end $$;
revoke execute on function public.registrar_aparelho(text, text, text, text) from public, anon;
grant execute on function public.registrar_aparelho(text, text, text, text) to authenticated;

-- ---------------------------------------------------------------- preferências
create table public.notification_prefs (
  user_id uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  chat boolean not null default true,
  forum boolean not null default true,
  meetings boolean not null default true,
  lessons boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.notification_prefs enable row level security;
create policy "preferências: as próprias" on public.notification_prefs for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.notification_prefs from anon;

-- ---------------------------------------------------------------- consultas usadas pela função (só service_role)
-- mensagens não lidas de alguém (número no ícone do app)
create function public.push_unread_count(p_user uuid) returns integer
language sql stable security definer set search_path = '' as $$
  select count(*)::int
  from public.messages m
  left join public.chat_reads r on r.user_id = p_user and r.student_id = m.student_id
  where m.sender_id <> p_user
    and m.created_at > coalesce(r.last_read_at, '-infinity')
    and (m.student_id = p_user
         or exists (select 1 from public.profiles p where p.id = p_user and p.role = 'mentor'));
$$;
revoke execute on function public.push_unread_count(uuid) from public, anon, authenticated;
grant execute on function public.push_unread_count(uuid) to service_role;

-- encontros que pedem lembrete agora (1 h antes e no início); cada lembrete sai uma vez só
create table private.meeting_notices (
  meeting_id text not null references public.meetings (id) on delete cascade,
  kind text not null check (kind in ('1h', 'agora')),
  sent_at timestamptz not null default now(),
  primary key (meeting_id, kind)
);
create function public.push_due_meetings() returns table (meeting_id text, title text, starts_at timestamptz, kind text)
language plpgsql security definer set search_path = '' as $$
begin
  return query
  with due as (
    select m.id, m.title, m.starts_at, '1h'::text as kind from public.meetings m
     where m.starts_at between now() + interval '50 minutes' and now() + interval '65 minutes'
    union all
    select m.id, m.title, m.starts_at, 'agora' from public.meetings m
     where m.starts_at between now() - interval '10 minutes' and now() + interval '5 minutes'
  ), marked as (
    insert into private.meeting_notices (meeting_id, kind)
    select d.id, d.kind from due d
    on conflict do nothing
    returning private.meeting_notices.meeting_id, private.meeting_notices.kind
  )
  select d.id, d.title, d.starts_at, d.kind from due d
  join marked k on k.meeting_id = d.id and k.kind = d.kind;
end $$;
revoke execute on function public.push_due_meetings() from public, anon, authenticated;
grant execute on function public.push_due_meetings() to service_role;

-- ---------------------------------------------------------------- gatilhos -> função
create function private.push_call(p_type text, p_record jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_secret text;
begin
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'push_hook_secret';
  if v_secret is null then return; end if; -- push ainda não configurado: não faz nada
  perform net.http_post(
    url := 'https://gvqkdmbmuihcmpwikcgp.supabase.co/functions/v1/enviar-push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secret),
    body := jsonb_build_object('type', p_type, 'record', p_record),
    timeout_milliseconds := 10000
  );
end $$;
revoke execute on function private.push_call(text, jsonb) from public, anon, authenticated;

create function private.push_on_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- só o que as pessoas fazem pelo app (o seed e o SQL editor não disparam notificações)
  if auth.uid() is not null then
    perform private.push_call(tg_argv[0], to_jsonb(new));
  end if;
  return null;
end $$;
revoke execute on function private.push_on_insert() from public, anon, authenticated;

create trigger push_message after insert on public.messages
  for each row execute function private.push_on_insert('message');
create trigger push_reply after insert on public.replies
  for each row execute function private.push_on_insert('reply');
create trigger push_thread after insert on public.threads
  for each row execute function private.push_on_insert('thread');
create trigger push_lesson after insert on public.lessons
  for each row execute function private.push_on_insert('lesson');

-- lembretes de encontro: a cada 5 minutos
select cron.schedule('push-lembrete-encontros', '*/5 * * * *', $$select private.push_call('meetings', null)$$);

notify pgrst, 'reload schema';
