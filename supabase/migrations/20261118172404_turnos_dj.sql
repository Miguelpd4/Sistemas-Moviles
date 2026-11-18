-- #20 · Turnos de DJ: cada pasajero elige una canción por turnos (por orden de asiento); cuando
-- han sonado todas, se vota la mejor (sin votarse a uno mismo) y quien la puso gana 50 puntos.
-- La ronda es un game_round 'dj' que convive con los juegos de pantalla. Las canciones de la
-- ronda van a la cola normal marcadas con dj_round_id.

alter table public.music_queue
  add column dj_round_id uuid references public.game_rounds (id) on delete set null;
create index music_queue_ronda_dj on public.music_queue (dj_round_id) where dj_round_id is not null;

-- Las canciones de DJ solo entran por add_dj_song, que comprueba el turno.
drop policy "añadir a la cola" on public.music_queue;
create policy "añadir a la cola" on public.music_queue for insert to authenticated
  with check (added_by = (select auth.uid()) and status = 'en_cola' and dj_round_id is null
    and public.is_member(session_id));

-- A quién le toca: el primero de la lista que sigue dentro, no se ha saltado y aún no ha elegido.
create function public.dj_current_turn(p_round_id uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select (e.turn ->> 'id')::uuid
  from public.game_rounds r, jsonb_array_elements(r.payload -> 'turns') with ordinality as e(turn, n)
  where r.id = p_round_id
    and exists (select 1 from public.session_members m where m.session_id = r.session_id
      and m.user_id = (e.turn ->> 'id')::uuid and m.status = 'dentro')
    and not coalesce(r.payload -> 'skipped', '[]'::jsonb) ? (e.turn ->> 'id')
    and not exists (select 1 from public.music_queue q where q.dj_round_id = r.id
      and q.added_by = (e.turn ->> 'id')::uuid)
  order by e.n limit 1;
$$;

-- Fase de la ronda: eligiendo (falta alguien por elegir), escuchando (quedan canciones por sonar),
-- votando (ya han sonado todas) o vacia (todos se saltaron el turno).
create function public.dj_phase(p_round_id uuid)
returns text language sql stable security definer set search_path = '' as $$
  select case
    when public.dj_current_turn(p_round_id) is not null then 'eligiendo'
    when not exists (select 1 from public.music_queue where dj_round_id = p_round_id) then 'vacia'
    when exists (select 1 from public.music_queue where dj_round_id = p_round_id
      and status in ('en_cola', 'sonando')) then 'escuchando'
    else 'votando'
  end;
$$;

create function public.start_dj_round(p_session_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_turns jsonb;
  v_id uuid;
begin
  if not public.is_member(p_session_id) then raise exception 'NOT_MEMBER'; end if;
  if exists (select 1 from public.sessions where id = p_session_id and status = 'finalizada') then
    raise exception 'TRIP_ALREADY_ENDED';
  end if;
  -- El conductor conduce: los turnos son de los pasajeros, por orden de asiento.
  select jsonb_agg(jsonb_build_object('id', m.user_id, 'label', m.display_name,
      'avatarKind', m.avatar_kind, 'avatarValue', m.avatar_value) order by m.seat nulls last, m.joined_at)
    into v_turns
    from public.session_members m
    where m.session_id = p_session_id and m.status = 'dentro' and m.role <> 'conductor';
  if jsonb_array_length(coalesce(v_turns, '[]'::jsonb)) < 2 then raise exception 'NOT_ENOUGH_DJS'; end if;

  insert into public.game_rounds (session_id, game, payload, created_by)
    values (p_session_id, 'dj', jsonb_build_object('turns', v_turns, 'skipped', '[]'::jsonb), auth.uid())
    returning id into v_id;
  return v_id;
exception
  when unique_violation then raise exception 'GAME_IN_PROGRESS';
end; $$;

create function public.add_dj_song(p_round_id uuid, p_track_id text, p_title text, p_artist text,
  p_album_art_url text, p_duration_ms integer)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_round public.game_rounds;
  v_id uuid;
begin
  select * into v_round from public.game_rounds where id = p_round_id;
  if not found or not public.is_member(v_round.session_id) then raise exception 'NOT_MEMBER'; end if;
  if v_round.game <> 'dj' or v_round.status <> 'activa' then raise exception 'ROUND_CLOSED'; end if;
  if public.dj_current_turn(p_round_id) is distinct from auth.uid() then raise exception 'NOT_YOUR_TURN'; end if;
  insert into public.music_queue (session_id, spotify_track_id, title, artist, album_art_url, duration_ms,
      added_by, dj_round_id)
    values (v_round.session_id, p_track_id, p_title, p_artist, p_album_art_url, greatest(p_duration_ms, 1),
      auth.uid(), p_round_id)
    returning id into v_id;
  return v_id;
end; $$;

-- El conductor, el copiloto o quien empezó la ronda pueden saltar el turno de quien no elige.
create function public.skip_dj_turn(p_round_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_round public.game_rounds;
  v_turn uuid;
begin
  select * into v_round from public.game_rounds where id = p_round_id for update;
  if not found or not public.is_member(v_round.session_id) then raise exception 'NOT_MEMBER'; end if;
  if not (public.is_admin(v_round.session_id) or v_round.created_by = auth.uid()) then raise exception 'NOT_ADMIN'; end if;
  if v_round.game <> 'dj' or v_round.status <> 'activa' then raise exception 'ROUND_CLOSED'; end if;
  v_turn := public.dj_current_turn(p_round_id);
  if v_turn is null then return; end if;
  update public.game_rounds
    set payload = jsonb_set(payload, '{skipped}', coalesce(payload -> 'skipped', '[]'::jsonb) || to_jsonb(v_turn::text))
    where id = p_round_id;
end; $$;

-- Como antes, más las reglas del DJ: solo se vota con todas las canciones ya sonadas, a una
-- canción de la ronda y nunca a la propia.
create or replace function public.submit_answer(p_round_id uuid, p_answer jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare v_round public.game_rounds;
begin
  select * into v_round from public.game_rounds where id = p_round_id;
  if not found or not public.is_member(v_round.session_id) then raise exception 'NOT_MEMBER'; end if;
  if v_round.status <> 'activa' or (v_round.ends_at is not null and now() > v_round.ends_at + interval '2 seconds') then
    raise exception 'ROUND_CLOSED';
  end if;
  if v_round.game = 'quien_la_puso' and exists (select 1 from public.game_round_secrets
      where round_id = p_round_id and solution ->> 'option' = auth.uid()::text) then
    raise exception 'OWN_SONG';
  end if;
  if v_round.game = 'dj' then
    if public.dj_phase(p_round_id) <> 'votando' then raise exception 'VOTING_NOT_OPEN'; end if;
    if not exists (select 1 from public.music_queue
        where dj_round_id = p_round_id and id::text = p_answer ->> 'option') then
      raise exception 'INVALID_OPTION';
    end if;
    if exists (select 1 from public.music_queue
        where dj_round_id = p_round_id and id::text = p_answer ->> 'option' and added_by = auth.uid()) then
      raise exception 'OWN_SONG';
    end if;
  end if;
  insert into public.game_answers (round_id, user_id, answer) values (p_round_id, auth.uid(), p_answer)
    on conflict (round_id, user_id) do update set answer = excluded.answer, created_at = now();
end; $$;

-- Como antes, más el DJ: se revela en la fase de votar y 50 puntos para quien puso la canción
-- más votada (para todos si hay empate).
create or replace function public.reveal_round(p_round_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_round public.game_rounds;
  v_members integer;
  v_answers integer;
begin
  select * into v_round from public.game_rounds where id = p_round_id for update;
  if not found or not public.is_member(v_round.session_id) then raise exception 'NOT_MEMBER'; end if;
  if v_round.status <> 'activa' then return; end if;
  if v_round.game = 'dj' and public.dj_phase(p_round_id) <> 'votando' then raise exception 'TOO_EARLY'; end if;
  select count(*) into v_members from public.session_members m
    where m.session_id = v_round.session_id and m.status = 'dentro' and m.role <> 'conductor'
      and not (v_round.game = 'quien_la_puso' and exists (select 1 from public.game_round_secrets s
        where s.round_id = p_round_id and s.solution ->> 'option' = m.user_id::text));
  select count(*) into v_answers from public.game_answers where round_id = p_round_id;
  -- Puede revelar un administrador, quien la creó, o cualquiera si se acabó el tiempo o ya respondieron todos
  if not (public.is_admin(v_round.session_id) or v_round.created_by = auth.uid()
      or (v_round.ends_at is not null and now() >= v_round.ends_at) or v_answers >= greatest(v_members, 1)) then
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
  elsif v_round.game = 'dj' then
    -- 50 puntos al DJ de la canción más votada; se guardan en su fila de respuestas (o en una nueva)
    insert into public.game_answers (round_id, user_id, answer, points)
      select p_round_id, q.added_by, '{}'::jsonb, 50
      from public.music_queue q
      where q.dj_round_id = p_round_id and q.id::text in (
        select answer ->> 'option' from public.game_answers where round_id = p_round_id
        group by 1 having count(*) = (
          select max(c) from (select count(*) as c from public.game_answers
            where round_id = p_round_id and answer ? 'option' group by answer ->> 'option') t))
    on conflict (round_id, user_id) do update set points = 50;
  end if;
  -- 'bingo' y 'matriculas' se puntúan con sus propias RPC (Sprint 4)
end; $$;

-- dj_current_turn y dj_phase solo se usan dentro de las RPC (la app calcula la fase con lib/games/dj).
revoke execute on function public.dj_current_turn(uuid) from public, anon, authenticated;
revoke execute on function public.dj_phase(uuid) from public, anon, authenticated;
revoke execute on function public.start_dj_round(uuid) from public, anon;
revoke execute on function public.add_dj_song(uuid, text, text, text, text, integer) from public, anon;
revoke execute on function public.skip_dj_turn(uuid) from public, anon;
grant execute on function public.start_dj_round(uuid) to authenticated;
grant execute on function public.add_dj_song(uuid, text, text, text, text, integer) to authenticated;
grant execute on function public.skip_dj_turn(uuid) to authenticated;
