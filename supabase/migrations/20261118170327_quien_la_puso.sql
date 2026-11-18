-- #22 · «¿Quién la ha puesto?»: adivinar quién del coche ha puesto la canción que suena.
-- La ronda la crea el servidor a partir de la canción que suena (la solución es su `added_by`).
-- Sin tablas nuevas: usa game_rounds, game_round_secrets y game_answers con sus políticas RLS.

-- Pasa a ser un juego «de pantalla»: no puede coincidir con otro juego activo de la pestaña Juegos.
drop index public.game_rounds_un_juego_activo;
create unique index game_rounds_un_juego_activo on public.game_rounds (session_id)
  where status = 'activa' and game <> 'dj';

-- Empieza una ronda con la canción que suena. Las opciones son los que están dentro del coche.
create function public.start_guess_who(p_session_id uuid, p_seconds integer default 20)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_song public.music_queue;
  v_options jsonb;
  v_id uuid;
begin
  if not public.is_member(p_session_id) then raise exception 'NOT_MEMBER'; end if;
  if exists (select 1 from public.sessions where id = p_session_id and status = 'finalizada') then
    raise exception 'TRIP_ALREADY_ENDED';
  end if;
  select * into v_song from public.music_queue where session_id = p_session_id and status = 'sonando';
  if not found then raise exception 'NOTHING_PLAYING'; end if;
  if exists (select 1 from public.game_rounds where session_id = p_session_id
      and game = 'quien_la_puso' and payload ->> 'queueId' = v_song.id::text) then
    raise exception 'SONG_ALREADY_USED';
  end if;

  select jsonb_agg(jsonb_build_object('id', m.user_id, 'label', m.display_name,
      'avatarKind', m.avatar_kind, 'avatarValue', m.avatar_value) order by m.seat nulls first, m.joined_at)
    into v_options
    from public.session_members m where m.session_id = p_session_id and m.status = 'dentro';
  if jsonb_array_length(coalesce(v_options, '[]'::jsonb)) < 3 then raise exception 'NOT_ENOUGH_PLAYERS'; end if;

  insert into public.game_rounds (session_id, game, payload, created_by, ends_at)
    values (p_session_id, 'quien_la_puso',
      jsonb_build_object('queueId', v_song.id, 'title', v_song.title, 'artist', v_song.artist,
        'albumArtUrl', v_song.album_art_url, 'options', v_options),
      auth.uid(), now() + make_interval(secs => least(greatest(p_seconds, 10), 60)))
    returning id into v_id;
  insert into public.game_round_secrets (round_id, solution)
    values (v_id, jsonb_build_object('option', v_song.added_by));
  return v_id;
exception
  when unique_violation then raise exception 'GAME_IN_PROGRESS';
end; $$;

-- Igual que antes, pero quien puso la canción no puede responder a su propia ronda.
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
  insert into public.game_answers (round_id, user_id, answer) values (p_round_id, auth.uid(), p_answer)
    on conflict (round_id, user_id) do update set answer = excluded.answer, created_at = now();
end; $$;

-- Igual que antes, pero en «¿Quién la ha puesto?» no se espera la respuesta de quien la puso.
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
    where m.session_id = v_round.session_id and m.status = 'dentro'
      and not (v_round.game = 'quien_la_puso' and exists (select 1 from public.game_round_secrets s
        where s.round_id = p_round_id and s.solution ->> 'option' = m.user_id::text));
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

revoke execute on function public.start_guess_who(uuid, integer) from public, anon;
grant execute on function public.start_guess_who(uuid, integer) to authenticated;
