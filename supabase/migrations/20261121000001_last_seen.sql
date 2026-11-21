-- Último acesso de cada aluno (painel do mentor: quem está ativo, quem sumiu).
-- Gravado pelo próprio app ao abrir (no máximo a cada 10 min), só pelo servidor: o aluno
-- não consegue escrever uma data qualquer nem alterar a de outra pessoa.
alter table public.profiles add column if not exists last_seen_at timestamptz;

create or replace function public.marcar_acesso() returns void
language sql security definer set search_path = '' as $$
  update public.profiles set last_seen_at = now()
  where id = auth.uid() and (last_seen_at is null or last_seen_at < now() - interval '10 minutes');
$$;
revoke execute on function public.marcar_acesso() from public, anon;
grant execute on function public.marcar_acesso() to authenticated;

notify pgrst, 'reload schema';
