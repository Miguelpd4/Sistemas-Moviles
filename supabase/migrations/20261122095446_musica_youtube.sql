-- #57 · Música con YouTube: la cola deja de ser de Spotify.
-- Cada canción guarda de qué servicio es (`source`) y su id en ese servicio (`track_id`, antes
-- `spotify_track_id`). Las nuevas son de YouTube; las de Spotify que queden de las pruebas se
-- conservan, pero no se ponen ni entran en «Adivina la canción».
-- Sin tablas nuevas: las políticas RLS de music_queue no cambian.

alter table public.music_queue rename column spotify_track_id to track_id;
-- Las filas que ya había son de Spotify; a partir de ahora, YouTube por defecto.
alter table public.music_queue
  add column source text not null default 'spotify' check (source in ('spotify', 'youtube'));
alter table public.music_queue alter column source set default 'youtube';

-- Canciones distintas del viaje que se pueden poner (de YouTube), una fila por canción: la más reciente.
create or replace function public.session_tracks(p_session_id uuid)
returns setof public.music_queue language sql stable security definer set search_path = '' as $$
  select distinct on (q.track_id) q.* from public.music_queue q
  where q.session_id = p_session_id and q.source = 'youtube'
  order by q.track_id, q.created_at desc;
$$;

create or replace function public.start_song_quiz(p_session_id uuid, p_seconds integer default 25)
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
          and s.solution ->> 'trackId' = t.track_id)
    order by random() limit 1;
  if not found then raise exception 'NOT_ENOUGH_SONGS'; end if;

  -- Opciones: la buena y hasta 3 canciones distintas más del viaje, desordenadas.
  select jsonb_agg(jsonb_build_object('id', x.id, 'label', x.title, 'detail', x.artist) order by random())
    into v_options
    from (
      select v_answer.id, v_answer.title, v_answer.artist
      union all
      (select t.id, t.title, t.artist from public.session_tracks(p_session_id) t
        where t.track_id <> v_answer.track_id order by random() limit 3)
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
    values (v_id, jsonb_build_object('option', v_answer.id, 'trackId', v_answer.track_id,
      'positionMs', v_position));
  return v_id;
exception
  when unique_violation then raise exception 'GAME_IN_PROGRESS';
end; $$;

-- Igual que en #20, pero la canción de DJ es de YouTube.
create or replace function public.add_dj_song(p_round_id uuid, p_track_id text, p_title text, p_artist text,
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
  insert into public.music_queue (session_id, source, track_id, title, artist, album_art_url, duration_ms,
      added_by, dj_round_id)
    values (v_round.session_id, 'youtube', p_track_id, p_title, p_artist, p_album_art_url, greatest(p_duration_ms, 1),
      auth.uid(), p_round_id)
    returning id into v_id;
  return v_id;
end; $$;
