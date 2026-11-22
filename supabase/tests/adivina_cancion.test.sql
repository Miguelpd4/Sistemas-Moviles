-- #21 · «Adivina la canción»: la solución solo la ve el conductor mientras dura la ronda.
begin;
create extension if not exists pgtap with schema extensions;
select plan(15);

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
  ('33333333-3333-3333-3333-333333333333', null, true, '{}');
insert into public.cars (id, owner_id, name, nfc_code, consumption_l_100km, fuel_type, seats) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Ibiza', 'ADIV2345', 6.5, 'diesel', 5);

create temp table viaje (id uuid);
create temp table ronda (n integer, id uuid);
create temp table solucion (n integer, option text, track text);
grant all on viaje, ronda, solucion to authenticated;
select pg_temp.como('11111111-1111-1111-1111-111111111111', false);
insert into viaje select public.start_session('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
select pg_temp.como('22222222-2222-2222-2222-222222222222');
select public.join_session('ADIV2345', 'Bea', 'preset', 'avatar-02', 2::smallint);
select pg_temp.como('33333333-3333-3333-3333-333333333333');
select public.join_session('ADIV2345', 'Carlos', 'preset', 'avatar-03', 3::smallint);

-- Cuatro canciones distintas en el viaje
select pg_temp.como('22222222-2222-2222-2222-222222222222');
insert into public.music_queue (session_id, track_id, title, artist, duration_ms, added_by)
  select id, 't' || n, 'Canción ' || n, 'Artista', 200000, '22222222-2222-2222-2222-222222222222'
  from viaje, generate_series(1, 3) n;
select pg_temp.como('33333333-3333-3333-3333-333333333333');
insert into public.music_queue (session_id, track_id, title, artist, duration_ms, added_by)
  select id, 't4', 'Canción 4', 'Artista', 200000, '33333333-3333-3333-3333-333333333333' from viaje;

-- 1 · Sin canción sonando no hay ronda (el reproductor no está en marcha)
select throws_ok($$ select public.start_song_quiz((select id from viaje)) $$,
  'P0001', 'NOTHING_PLAYING', 'sin canción sonando da NOTHING_PLAYING');

select pg_temp.como('11111111-1111-1111-1111-111111111111', false);
update public.music_queue set status = 'sonando', started_at = now() where track_id = 't1';

-- 2-4 · Carlos empieza: cuatro opciones y ni la canción ni el segundo van en el payload
select pg_temp.como('33333333-3333-3333-3333-333333333333');
insert into ronda select 1, public.start_song_quiz((select id from viaje));
select isnt((select id from ronda where n = 1), null, 'Carlos empieza una ronda');
select is((select jsonb_array_length(payload -> 'options') from public.game_rounds where id = (select id from ronda where n = 1)), 4,
  'cuatro canciones distintas: cuatro opciones');
select ok((select payload::text not like '%trackId%' and payload::text not like '%positionMs%'
    from public.game_rounds where id = (select id from ronda where n = 1)),
  'el payload no dice qué canción suena ni desde dónde');

-- 5-6 · Los pasajeros no ven la solución ni el fragmento
select is((select count(*)::int from public.game_round_secrets), 0, 'la solución está oculta con la ronda activa');
select throws_ok($$ select public.get_song_clip((select id from ronda where n = 1)) $$,
  'P0001', 'NOT_HOST', 'un pasajero no puede pedir el fragmento');

-- 7-8 · El conductor sí: una canción que no es la que suena y un segundo lejos de los extremos
select pg_temp.como('11111111-1111-1111-1111-111111111111', false);
select ok((select public.get_song_clip((select id from ronda where n = 1)) ->> 'trackId' in ('t2', 't3', 't4')),
  'el fragmento es de otra canción del viaje, no de la que suena');
select ok((select (public.get_song_clip((select id from ronda where n = 1)) ->> 'positionMs')::int between 30000 and 185000),
  'el segundo de inicio está entre 0:30 y 15 s antes del final');

-- 9-11 · Bea acierta, Carlos falla; sin contar al conductor ya han respondido todos y Bea revela
reset role;
insert into solucion select 1, solution ->> 'option', solution ->> 'trackId' from public.game_round_secrets;
select pg_temp.como('22222222-2222-2222-2222-222222222222');
select public.submit_answer((select id from ronda where n = 1), jsonb_build_object('option', (select option from solucion where n = 1)));
select pg_temp.como('33333333-3333-3333-3333-333333333333');
select public.submit_answer((select id from ronda where n = 1), jsonb_build_object('option',
  (select o ->> 'id' from public.game_rounds r, jsonb_array_elements(r.payload -> 'options') o
    where r.id = (select id from ronda where n = 1) and o ->> 'id' <> (select option from solucion where n = 1) limit 1)));
select pg_temp.como('22222222-2222-2222-2222-222222222222');
select lives_ok($$ select public.reveal_round((select id from ronda where n = 1)) $$,
  'el conductor no cuenta: con los dos pasajeros respondidos, cualquiera revela');
select is((select points from public.game_answers where round_id = (select id from ronda where n = 1)
  and user_id = '22222222-2222-2222-2222-222222222222'), 100, 'Bea acierta: 100 puntos');
select is((select points from public.game_answers where round_id = (select id from ronda where n = 1)
  and user_id = '33333333-3333-3333-3333-333333333333'), 0, 'Carlos falla: 0 puntos');

-- 12 · Revelada, ni el conductor pide ya el fragmento
select pg_temp.como('11111111-1111-1111-1111-111111111111', false);
select throws_ok($$ select public.get_song_clip((select id from ronda where n = 1)) $$,
  'P0001', 'ROUND_CLOSED', 'con la ronda revelada no hay fragmento');

-- 13 · La siguiente ronda usa otra canción
select pg_temp.como('33333333-3333-3333-3333-333333333333');
select public.close_round((select id from ronda where n = 1));
insert into ronda select 2, public.start_song_quiz((select id from viaje));
reset role;
insert into solucion select 2, s.solution ->> 'option', s.solution ->> 'trackId'
  from public.game_round_secrets s where s.round_id = (select id from ronda where n = 2);
select isnt((select track from solucion where n = 2), (select track from solucion where n = 1),
  'no se repite la canción de la ronda anterior');

-- 14-15 · Gastadas t2, t3 y t4 (t1 suena), no hay más rondas
select pg_temp.como('33333333-3333-3333-3333-333333333333');
select public.close_round((select id from ronda where n = 2));
insert into ronda select 3, public.start_song_quiz((select id from viaje));
select public.close_round((select id from ronda where n = 3));
select is((select count(*)::int from public.game_rounds where game = 'adivina_cancion'), 3, 'tres rondas, una por canción');
select throws_ok($$ select public.start_song_quiz((select id from viaje)) $$,
  'P0001', 'NOT_ENOUGH_SONGS', 'sin canciones nuevas da NOT_ENOUGH_SONGS');

select * from finish();
rollback;
