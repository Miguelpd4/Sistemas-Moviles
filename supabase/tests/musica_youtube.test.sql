-- #57 · La cola es de YouTube: `source` y `track_id`, y las canciones de Spotify no se juegan.
begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

create function pg_temp.como(p_uid uuid, p_anon boolean default true) returns void
language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_uid, 'role', 'authenticated', 'is_anonymous', p_anon)::text, true);
end $$;

insert into auth.users (id, email, is_anonymous, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'ana@example.com', false, '{"display_name": "Ana"}'),
  ('22222222-2222-2222-2222-222222222222', null, true, '{}');
insert into public.cars (id, owner_id, name, nfc_code, consumption_l_100km, fuel_type, seats) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Ibiza', 'YTUB2345', 6.5, 'diesel', 5);

create temp table viaje (id uuid);
grant all on viaje to authenticated;
select pg_temp.como('11111111-1111-1111-1111-111111111111', false);
insert into viaje select public.start_session('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
select pg_temp.como('22222222-2222-2222-2222-222222222222');
select public.join_session('YTUB2345', 'Bea', 'preset', 'avatar-02', 2::smallint);

-- 1 · Lo que se añade sin decir nada es de YouTube
insert into public.music_queue (session_id, track_id, title, artist, duration_ms, added_by)
  select id, 'yt1', 'Columbia', 'Quevedo', 186000, '22222222-2222-2222-2222-222222222222' from viaje;
select is((select source from public.music_queue where track_id = 'yt1'), 'youtube', 'las canciones nuevas son de YouTube');

-- 2 · Solo hay dos servicios
select throws_ok($$ insert into public.music_queue (session_id, source, track_id, title, artist, duration_ms, added_by)
  select id, 'deezer', 'dz1', 'X', 'Y', 1000, '22222222-2222-2222-2222-222222222222' from viaje $$,
  '23514', null, 'source solo admite spotify o youtube');

-- Canciones de Spotify que quedaron de antes (como owner: ya no se añaden desde la app)
reset role;
insert into public.music_queue (session_id, source, track_id, title, artist, duration_ms, added_by, status)
  select id, 'spotify', 'sp' || n, 'Vieja ' || n, 'Spotify', 200000, '22222222-2222-2222-2222-222222222222', 'reproducida'
  from viaje, generate_series(1, 3) n;

-- 3 · Suena yt1; las otras tres son de Spotify: no hay canciones de YouTube para jugar
select pg_temp.como('11111111-1111-1111-1111-111111111111', false);
update public.music_queue set status = 'sonando', started_at = now() where track_id = 'yt1';
select pg_temp.como('22222222-2222-2222-2222-222222222222');
select throws_ok($$ select public.start_song_quiz((select id from viaje)) $$,
  'P0001', 'NOT_ENOUGH_SONGS', 'las canciones de Spotify no entran en «Adivina la canción»');

-- 4-5 · Con tres de YouTube más, la ronda sale y la solución es de YouTube
insert into public.music_queue (session_id, track_id, title, artist, duration_ms, added_by)
  select id, 'yt' || n, 'Canción ' || n, 'Artista', 200000, '22222222-2222-2222-2222-222222222222'
  from viaje, generate_series(2, 3) n;
select pg_temp.como('11111111-1111-1111-1111-111111111111', false);
insert into public.music_queue (session_id, track_id, title, artist, duration_ms, added_by)
  select id, 'yt4', 'Canción 4', 'Artista', 200000, '11111111-1111-1111-1111-111111111111' from viaje;
select pg_temp.como('22222222-2222-2222-2222-222222222222');
select lives_ok($$ select public.start_song_quiz((select id from viaje)) $$, 'con canciones de YouTube sí hay ronda');
reset role;
select ok((select s.solution ->> 'trackId' in ('yt2', 'yt3', 'yt4') from public.game_round_secrets s
    join public.game_rounds r on r.id = s.round_id
    where r.game = 'adivina_cancion' and r.session_id = (select id from viaje)),
  'la canción del fragmento es de YouTube (y no la que suena)');

select * from finish();
rollback;
