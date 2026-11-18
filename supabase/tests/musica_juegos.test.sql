-- S2-01 · Cola de música, votos para saltar, motor de juegos y fin del viaje.
begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

create function pg_temp.como(p_uid uuid, p_anon boolean default true) returns void
language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_uid, 'role', 'authenticated', 'is_anonymous', p_anon)::text, true);
end $$;

insert into auth.users (id, email, is_anonymous, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'ana@example.com', false, '{"display_name": "Ana"}'),
  ('22222222-2222-2222-2222-222222222222', null, true, '{}'),
  ('33333333-3333-3333-3333-333333333333', null, true, '{}'),
  ('44444444-4444-4444-4444-444444444444', null, true, '{}');
insert into public.cars (id, owner_id, name, nfc_code, consumption_l_100km, fuel_type, seats) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Ibiza', 'MUSI2345', 6.5, 'diesel', 5);

create temp table viaje (id uuid);
create temp table ronda (nombre text, id uuid);
grant all on viaje, ronda to authenticated;
select pg_temp.como('11111111-1111-1111-1111-111111111111', false);
insert into viaje select public.start_session('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
select pg_temp.como('22222222-2222-2222-2222-222222222222');
select public.join_session('MUSI2345', 'Bea', 'preset', 'avatar-02', 2::smallint);
select pg_temp.como('33333333-3333-3333-3333-333333333333');
select public.join_session('MUSI2345', 'Carlos', 'preset', 'avatar-03', 3::smallint);

-- 1-2 · Límite de 3 canciones
select pg_temp.como('22222222-2222-2222-2222-222222222222');
insert into public.music_queue (session_id, spotify_track_id, title, artist, duration_ms, added_by)
  select id, 't' || n, 'Canción ' || n, 'Artista', 200000, '22222222-2222-2222-2222-222222222222'
  from viaje, generate_series(1, 3) n;
select is((select count(*)::int from public.music_queue), 3, 'B añade 3 canciones');
select throws_ok($$ insert into public.music_queue (session_id, spotify_track_id, title, artist, duration_ms, added_by)
  select id, 't4', 'Canción 4', 'Artista', 200000, '22222222-2222-2222-2222-222222222222' from viaje $$,
  'P0001', 'QUEUE_LIMIT', 'la cuarta canción da QUEUE_LIMIT');

-- 3 · Un pasajero no puede cambiar el estado de una canción
update public.music_queue set status = 'sonando' where spotify_track_id = 't1';
reset role;
select is((select status from public.music_queue where spotify_track_id = 't1'), 'en_cola',
  'el update de un pasajero no cambia nada');

-- 4-6 · Votar para saltar (3 miembros)
select pg_temp.como('11111111-1111-1111-1111-111111111111', false);
update public.music_queue set status = 'sonando', started_at = now() where spotify_track_id = 't1';
select pg_temp.como('22222222-2222-2222-2222-222222222222');
select is(public.vote_skip((select id from public.music_queue where spotify_track_id = 't1')) ->> 'skipped', 'false',
  'con 1 de 3 votos sigue sonando');
select is(public.vote_skip((select id from public.music_queue where spotify_track_id = 't1')) ->> 'votes', '1',
  'votar dos veces no cuenta doble');
select pg_temp.como('33333333-3333-3333-3333-333333333333');
select is(public.vote_skip((select id from public.music_queue where spotify_track_id = 't1')) ->> 'skipped', 'true',
  'con 2 de 3 votos se salta');
reset role;
select is((select status from public.music_queue where spotify_track_id = 't1'), 'saltada', 'la canción queda saltada');

-- 8 · Con 4 miembros, 1 voto no basta
select pg_temp.como('44444444-4444-4444-4444-444444444444');
select public.join_session('MUSI2345', 'Dani', 'preset', 'avatar-04', 4::smallint);
select pg_temp.como('11111111-1111-1111-1111-111111111111', false);
update public.music_queue set status = 'sonando', started_at = now() where spotify_track_id = 't2';
select pg_temp.como('22222222-2222-2222-2222-222222222222');
select is(public.vote_skip((select id from public.music_queue where spotify_track_id = 't2')) ->> 'needed', '3',
  'con 4 miembros hacen falta 3 votos');

-- 9-11 · Rondas
insert into ronda select 'probable', public.create_round((select id from viaje), 'probable',
  '{"question": "¿Quién se dormirá antes?", "options": []}', null, 30);
select throws_ok($$ select public.create_round((select id from viaje), 'trivial', '{}') $$,
  'P0001', 'GAME_IN_PROGRESS', 'no hay dos juegos de pantalla a la vez');
select lives_ok($$ select public.create_round((select id from viaje), 'quien_la_puso', '{}') $$,
  'un juego musical puede coincidir con otro');
select pg_temp.como('44444444-4444-4444-4444-444444444444');
select throws_ok($$ select public.reveal_round((select id from ronda where nombre = 'probable')) $$,
  'P0001', 'TOO_EARLY', 'no se revela antes de tiempo');

-- 12-13 · Votos secretos y puntos de «probable»: 3 votos a C y 1 a D
select public.submit_answer((select id from ronda where nombre = 'probable'), '{"option": "44444444-4444-4444-4444-444444444444"}');
select pg_temp.como('11111111-1111-1111-1111-111111111111', false);
select public.submit_answer((select id from ronda where nombre = 'probable'), '{"option": "33333333-3333-3333-3333-333333333333"}');
select pg_temp.como('33333333-3333-3333-3333-333333333333');
select public.submit_answer((select id from ronda where nombre = 'probable'), '{"option": "33333333-3333-3333-3333-333333333333"}');
select pg_temp.como('22222222-2222-2222-2222-222222222222');
select public.submit_answer((select id from ronda where nombre = 'probable'), '{"option": "33333333-3333-3333-3333-333333333333"}');
select is((select count(*)::int from public.game_answers), 1, 'con la ronda activa cada uno solo ve su voto');
select public.reveal_round((select id from ronda where nombre = 'probable'));
reset role;
select is((select string_agg(points::text, ',' order by user_id) from public.game_answers
  where round_id = (select id from ronda where nombre = 'probable')), '10,10,10,0',
  'quienes votaron a la persona más votada ganan 10 puntos');

-- 14-17 · Trivial con solución secreta
select pg_temp.como('22222222-2222-2222-2222-222222222222');
select public.close_round((select id from ronda where nombre = 'probable'));
insert into ronda select 'trivial', public.create_round((select id from viaje), 'trivial',
  '{"question": "¿Capital de Francia?"}', '{"option": "paris"}', 20);
select is((select count(*)::int from public.game_round_secrets), 0, 'la solución no se ve con la ronda activa');
select public.submit_answer((select id from ronda where nombre = 'trivial'), '{"option": "roma"}');
select pg_temp.como('11111111-1111-1111-1111-111111111111', false);
select public.submit_answer((select id from ronda where nombre = 'trivial'), '{"option": "paris"}');
select pg_temp.como('22222222-2222-2222-2222-222222222222');
select public.reveal_round((select id from ronda where nombre = 'trivial'));
select is((select count(*)::int from public.game_round_secrets), 1, 'tras revelar se ve la solución');
reset role;
select is((select points from public.game_answers where round_id = (select id from ronda where nombre = 'trivial')
  and user_id = '11111111-1111-1111-1111-111111111111'), 100, 'quien acierta gana 100 puntos');
select pg_temp.como('33333333-3333-3333-3333-333333333333');
select throws_ok($$ select public.submit_answer((select id from ronda where nombre = 'trivial'), '{"option": "paris"}') $$,
  'P0001', 'ROUND_CLOSED', 'no se responde a una ronda revelada');

-- 18-19 · Finalizar el viaje cierra todo
select pg_temp.como('22222222-2222-2222-2222-222222222222');
select public.close_round((select id from ronda where nombre = 'trivial'));
insert into ronda select 'abierta', public.create_round((select id from viaje), 'probable', '{}', null, 30);
select pg_temp.como('11111111-1111-1111-1111-111111111111', false);
select public.end_trip((select id from viaje), 1200, 37.8, -4.7);
reset role;
select is((select status from public.sessions), 'finalizada', 'el viaje queda finalizado');
select is((select (select status from public.game_rounds where id = (select id from ronda where nombre = 'abierta'))
  || '/' || (select status from public.music_queue where spotify_track_id = 't2')), 'cerrada/reproducida',
  'la ronda activa se cierra y la canción que sonaba queda reproducida');

select * from finish();
rollback;
