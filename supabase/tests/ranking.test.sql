-- #33 · Ranking general: solo cuentan las rondas reveladas, salen todos (también con 0) y cada
-- viaje tiene el suyo.
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

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
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Ibiza', 'RANK2345', 6.5, 'diesel', 5);
create temp table viaje (n int, id uuid);
create temp table ronda (n int, id uuid);
grant all on viaje, ronda to authenticated;

-- Viaje 1: Ana conduce; Bea y Carlos van detrás
select pg_temp.como('11111111-1111-1111-1111-111111111111', false);
insert into viaje select 1, public.start_session('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
select pg_temp.como('22222222-2222-2222-2222-222222222222');
select public.join_session('RANK2345', 'Bea', 'preset', 'avatar-02', 2::smallint);
select pg_temp.como('33333333-3333-3333-3333-333333333333');
select public.join_session('RANK2345', 'Carlos', 'preset', 'avatar-03', 3::smallint);
select pg_temp.como('11111111-1111-1111-1111-111111111111', false);
select public.start_trip((select id from viaje where n = 1), 1.5, 37.88, -4.78);

-- Ronda 1 («probable»), revelada: Bea y Carlos votan a Carlos (el más votado) → 10 cada uno
select pg_temp.como('22222222-2222-2222-2222-222222222222');
insert into ronda select 1, public.create_round((select id from viaje where n = 1), 'probable',
  '{"options": [{"id": "33333333-3333-3333-3333-333333333333", "label": "Carlos"}]}', null, 30);
select public.submit_answer((select id from ronda where n = 1), '{"option": "33333333-3333-3333-3333-333333333333"}');
select pg_temp.como('33333333-3333-3333-3333-333333333333');
select public.submit_answer((select id from ronda where n = 1), '{"option": "33333333-3333-3333-3333-333333333333"}');
select pg_temp.como('22222222-2222-2222-2222-222222222222');
select public.reveal_round((select id from ronda where n = 1));
select public.close_round((select id from ronda where n = 1));

-- Ronda 2 (Cazamatrículas): Carlos caza la suya (100), pero el viaje termina con la ronda activa
insert into ronda select 2, public.create_round((select id from viaje where n = 1), 'matriculas',
  '{"challenge": {"kind": "letras", "letters": ["K", "M"]}}', null, 180);
select pg_temp.como('33333333-3333-3333-3333-333333333333');
select public.submit_plate((select id from ronda where n = 2), '1234KMB');
select pg_temp.como('11111111-1111-1111-1111-111111111111', false);
select public.end_trip((select id from viaje where n = 1), 1000, 37.89, -4.77);

-- 1-2 · Solo la ronda revelada queda marcada como puntuada
reset role;
select isnt((select revealed_at from public.game_rounds where id = (select id from ronda where n = 1)), null,
  'la ronda revelada queda marcada aunque luego se cierre');
select is((select revealed_at from public.game_rounds where id = (select id from ronda where n = 2)), null,
  'la ronda que cerró end_trip a medias no cuenta');

-- 3-4 · Clasificación del viaje 1: todos, también Ana con 0; los 100 de la ronda a medias no suman
select pg_temp.como('22222222-2222-2222-2222-222222222222');
select is((select string_agg(display_name || ':' || points, ' ' order by display_name) from public.trip_ranking((select id from viaje where n = 1))),
  'Ana:0 Bea:10 Carlos:10', 'suma solo las rondas puntuadas y salen todos los del coche');
select is((select rounds_won from public.trip_ranking((select id from viaje where n = 1)) where display_name = 'Carlos'), 1,
  'Carlos ha puntuado en una ronda');

-- 5 · Alguien de fuera no ve nada
select pg_temp.como('44444444-4444-4444-4444-444444444444');
select is((select count(*)::int from public.trip_ranking((select id from viaje where n = 1))), 0, 'alguien de fuera no ve el ranking');

-- 6-7 · Viaje 2 con el mismo coche: empieza de cero y sin mezclar gente
select pg_temp.como('11111111-1111-1111-1111-111111111111', false);
insert into viaje select 2, public.start_session('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
select pg_temp.como('22222222-2222-2222-2222-222222222222');
select public.join_session('RANK2345', 'Bea', 'preset', 'avatar-02', 2::smallint);
select is((select string_agg(display_name || ':' || points, ' ' order by display_name) from public.trip_ranking((select id from viaje where n = 2))),
  'Ana:0 Bea:0', 'cada viaje tiene su propio ranking');
select is((select count(*)::int from public.trip_ranking((select id from viaje where n = 2)) where display_name = 'Carlos'), 0,
  'quien no iba en este viaje no aparece');

-- 8 · Los clientes no pueden marcar una ronda como puntuada
update public.game_rounds set revealed_at = now() where id = (select id from ronda where n = 2);
reset role;
select is((select revealed_at from public.game_rounds where id = (select id from ronda where n = 2)), null,
  'nadie cambia revealed_at desde la app');

select * from finish();
rollback;
