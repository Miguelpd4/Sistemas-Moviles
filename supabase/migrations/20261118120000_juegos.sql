-- S2-01 · Migración 0002 (1 de 2): motor de juegos (rondas, soluciones secretas y respuestas).

create table public.game_rounds (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  game text not null check (game in
    ('probable', 'trivial', 'bingo', 'adivina_cancion', 'quien_la_puso', 'dj', 'matriculas')),
  status text not null default 'activa' check (status in ('activa', 'revelada', 'cerrada')),
  payload jsonb not null default '{}'::jsonb,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  ends_at timestamptz
);
-- Un juego «de pantalla» activo a la vez; los musicales van aparte y pueden coincidir con él
create unique index game_rounds_un_juego_activo on public.game_rounds (session_id)
  where status = 'activa' and game not in ('dj', 'quien_la_puso');
create unique index game_rounds_uno_por_tipo on public.game_rounds (session_id, game)
  where status = 'activa';

create table public.game_round_secrets (
  round_id uuid primary key references public.game_rounds (id) on delete cascade,
  solution jsonb not null
);

create table public.game_answers (
  round_id uuid not null references public.game_rounds (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  answer jsonb not null,
  points integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (round_id, user_id)
);

alter table public.game_rounds enable row level security;
alter table public.game_round_secrets enable row level security;
alter table public.game_answers enable row level security;

create policy "ver rondas" on public.game_rounds for select to authenticated
  using (public.is_member(session_id));
create policy "ver solución revelada" on public.game_round_secrets for select to authenticated
  using (exists (select 1 from public.game_rounds r
    where r.id = round_id and public.is_member(r.session_id) and r.status <> 'activa'));
-- Mientras la ronda está activa, cada uno solo ve su respuesta
create policy "ver respuestas" on public.game_answers for select to authenticated
  using (exists (select 1 from public.game_rounds r
    where r.id = round_id and public.is_member(r.session_id)
      and (r.status <> 'activa' or game_answers.user_id = (select auth.uid()))));

create function public.create_round(p_session_id uuid, p_game text, p_payload jsonb,
  p_solution jsonb default null, p_seconds integer default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not public.is_member(p_session_id) then raise exception 'NOT_MEMBER'; end if;
  if exists (select 1 from public.sessions where id = p_session_id and status = 'finalizada') then
    raise exception 'TRIP_ALREADY_ENDED';
  end if;
  insert into public.game_rounds (session_id, game, payload, created_by, ends_at)
    values (p_session_id, p_game, p_payload, auth.uid(),
      case when p_seconds is null then null else now() + make_interval(secs => p_seconds) end)
    returning id into v_id;
  if p_solution is not null then
    insert into public.game_round_secrets (round_id, solution) values (v_id, p_solution);
  end if;
  return v_id;
exception
  when unique_violation then raise exception 'GAME_IN_PROGRESS';
end; $$;

create function public.submit_answer(p_round_id uuid, p_answer jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare v_round public.game_rounds;
begin
  select * into v_round from public.game_rounds where id = p_round_id;
  if not found or not public.is_member(v_round.session_id) then raise exception 'NOT_MEMBER'; end if;
  if v_round.status <> 'activa' or (v_round.ends_at is not null and now() > v_round.ends_at + interval '2 seconds') then
    raise exception 'ROUND_CLOSED';
  end if;
  insert into public.game_answers (round_id, user_id, answer) values (p_round_id, auth.uid(), p_answer)
    on conflict (round_id, user_id) do update set answer = excluded.answer, created_at = now();
end; $$;

-- Idempotente: si ya está revelada, no hace nada
create function public.reveal_round(p_round_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_round public.game_rounds;
  v_members integer;
  v_answers integer;
begin
  select * into v_round from public.game_rounds where id = p_round_id for update;
  if not found or not public.is_member(v_round.session_id) then raise exception 'NOT_MEMBER'; end if;
  if v_round.status <> 'activa' then return; end if;
  select count(*) into v_members from public.session_members
    where session_id = v_round.session_id and status = 'dentro';
  select count(*) into v_answers from public.game_answers where round_id = p_round_id;
  -- Puede revelar un administrador, quien la creó, o cualquiera si se acabó el tiempo o ya respondieron todos
  if not (public.is_admin(v_round.session_id) or v_round.created_by = auth.uid()
      or (v_round.ends_at is not null and now() >= v_round.ends_at) or v_answers >= v_members) then
    raise exception 'TOO_EARLY';
  end if;

  update public.game_rounds set status = 'revelada' where id = p_round_id;

  if v_round.game in ('trivial', 'adivina_cancion', 'quien_la_puso') then
    -- 100 puntos a quien acierta la opción de la solución
    update public.game_answers a
      set points = case when a.answer ->> 'option' = s.solution ->> 'option' then 100 else 0 end
      from public.game_round_secrets s
      where s.round_id = p_round_id and a.round_id = p_round_id;
  elsif v_round.game = 'probable' then
    -- 10 puntos a quien votó a la persona más votada (todas si hay empate)
    update public.game_answers set points = 10
      where round_id = p_round_id and answer ->> 'option' in (
        select answer ->> 'option' from public.game_answers where round_id = p_round_id
        group by 1 having count(*) = (
          select max(c) from (select count(*) as c from public.game_answers
            where round_id = p_round_id group by answer ->> 'option') t));
  end if;
  -- 'dj', 'bingo' y 'matriculas' se puntúan con sus propias RPC (Sprints 3 y 4)
end; $$;

create function public.close_round(p_round_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.game_rounds set status = 'cerrada'
    where id = p_round_id and status <> 'cerrada'
      and (public.is_admin(session_id) or created_by = auth.uid());
end; $$;

alter publication supabase_realtime add table public.game_rounds, public.game_answers;

revoke execute on function public.create_round(uuid, text, jsonb, jsonb, integer) from public, anon;
revoke execute on function public.submit_answer(uuid, jsonb) from public, anon;
revoke execute on function public.reveal_round(uuid) from public, anon;
revoke execute on function public.close_round(uuid) from public, anon;
grant execute on function public.create_round(uuid, text, jsonb, jsonb, integer) to authenticated;
grant execute on function public.submit_answer(uuid, jsonb) to authenticated;
grant execute on function public.reveal_round(uuid) to authenticated;
grant execute on function public.close_round(uuid) to authenticated;
