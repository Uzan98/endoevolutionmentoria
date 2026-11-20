-- Chat: horários sempre do servidor para quem usa o app.
-- * messages: remetente e horário forçados só em chamadas de usuários logados
--   (o seed e o SQL editor, sem auth.uid(), podem gravar conversas de exemplo com datas passadas).
-- * chat_reads: "lido até" = agora no servidor (o relógio do celular pode estar errado).

create or replace function private.messages_server_fields() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null then
    new.created_at := now();
    new.sender_id := auth.uid();
  end if;
  return new;
end $$;
revoke execute on function private.messages_server_fields() from public, anon, authenticated;

create function private.chat_reads_server_time() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null then
    new.last_read_at := now();
  end if;
  return new;
end $$;
revoke execute on function private.chat_reads_server_time() from public, anon, authenticated;
create trigger chat_reads_server_time before insert or update on public.chat_reads
  for each row execute function private.chat_reads_server_time();
