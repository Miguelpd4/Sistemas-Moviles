-- #21 · «Adivina la canción»: suenan 10 s de una canción del viaje desde un punto al azar en el
-- móvil del conductor y los demás eligen cuál es entre varias de la cola.
-- Sin tablas nuevas: usa game_rounds, game_round_secrets y game_answers con sus políticas RLS.
-- La canción y el segundo exacto van en la solución secreta; solo el conductor los lee mientras
-- dura la ronda (get_song_clip), porque es su móvil el que la hace sonar.

-- Canciones distintas del viaje (una fila por canción de Spotify, la más reciente).
create function public.session_tracks(p_session_id uuid)
returns setof public.music_queue language sql stable security definer set search_path = '' as $$
  select distinct on (q.spotify_track_id) q.* from public.music_queue q
  where q.session_id = p_session_id
  order by q.spotify_track_id, q.created_at desc;
$$;
revoke execute on function public.session_tracks(uuid) from public, anon, authenticated;

create function public.start_song_quiz(p_session_id uuid, p_seconds integer default 25)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_answer public.music_queue;
  v_options jsonb;
  v_low integer;
  v_high integer;
  v_position integer;
  v_id uuid;
begin
  if not public.is_member(p_session_id) then raise exception 'NOT_MEMBER'; end if;
  if exists (select 1 from public.sessions where id = p_session_id and status = 'finalizada') then
    raise exception 'TRIP_ALREADY_ENDED';
  end if;
  -- Si no suena nada, el reproductor del conductor no está en marcha y nadie oiría el fragmento.
  if not exists (select 1 from public.music_queue where session_id = p_session_id and status = 'sonando') then
    raise exception 'NOTHING_PLAYING';
  end if;

  -- La solución: una canción del viaje que no esté sonando ni haya salido ya en este juego.
  select t.* into v_answer from public.session_tracks(p_session_id) t
    where t.status <> 'sonando'
      and not exists (select 1 from public.game_rounds r join public.game_round_secrets s on s.round_id = r.id
        where r.session_id = p_session_id and r.game = 'adivina_cancion'
          and s.solution ->> 'trackId' = t.spotify_track_id)
    order by random() limit 1;
  if not found then raise exception 'NOT_ENOUGH_SONGS'; end if;

  -- Opciones: la buena y hasta 3 canciones distintas más del viaje, desordenadas.
  select jsonb_agg(jsonb_build_object('id', x.id, 'label', x.title, 'detail', x.artist) order by random())
    into v_options
    from (
      select v_answer.id, v_answer.title, v_answer.artist
      union all
      (select t.id, t.title, t.artist from public.session_tracks(p_session_id) t
        where t.spotify_track_id <> v_answer.spotify_track_id order by random() limit 3)
    ) x;
  if jsonb_array_length(v_options) < 3 then raise exception 'NOT_ENOUGH_SONGS'; end if;

  -- Un segundo al azar lejos del principio y del final (10 s de fragmento).
  v_low := least(30000, v_answer.duration_ms / 4);
  v_high := greatest(v_low, v_answer.duration_ms - 15000);
  v_position := v_low + floor(random() * (v_high - v_low))::integer;

  insert into public.game_rounds (session_id, game, payload, created_by, ends_at)
    values (p_session_id, 'adivina_cancion', jsonb_build_object('options', v_options, 'clipSeconds', 10),
      auth.uid(), now() + make_interval(secs => least(greatest(p_seconds, 15), 60)))
    returning id into v_id;
  insert into public.game_round_secrets (round_id, solution)
    values (v_id, jsonb_build_object('option', v_answer.id, 'trackId', v_answer.spotify_track_id,
      'positionMs', v_position));
  return v_id;
exception
  when unique_violation then raise exception 'GAME_IN_PROGRESS';
end; $$;

-- Solo el conductor, y solo con la ronda activa: qué canción poner y desde qué segundo.
create function public.get_song_clip(p_round_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_round public.game_rounds;
  v_solution jsonb;
begin
  select * into v_round from public.game_rounds where id = p_round_id;
  if not found or not public.is_member(v_round.session_id) then raise exception 'NOT_MEMBER'; end if;
  if not public.is_host(v_round.session_id) then raise exception 'NOT_HOST'; end if;
  if v_round.game <> 'adivina_cancion' or v_round.status <> 'activa' then raise exception 'ROUND_CLOSED'; end if;
  select solution into v_solution from public.game_round_secrets where round_id = p_round_id;
  return jsonb_build_object('trackId', v_solution ->> 'trackId', 'positionMs', (v_solution ->> 'positionMs')::integer,
    'clipMs', coalesce((v_round.payload ->> 'clipSeconds')::integer, 10) * 1000);
end; $$;

-- Igual que antes, pero el conductor no cuenta para «ya han respondido todos»: conduce y no juega.
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
  end if;
  -- 'dj', 'bingo' y 'matriculas' se puntúan con sus propias RPC (Sprints 3 y 4)
end; $$;

revoke execute on function public.start_song_quiz(uuid, integer) from public, anon;
revoke execute on function public.get_song_clip(uuid) from public, anon;
grant execute on function public.start_song_quiz(uuid, integer) to authenticated;
grant execute on function public.get_song_clip(uuid) to authenticated;
