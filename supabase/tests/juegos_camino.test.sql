-- #48 · Trivial del camino (respuesta entre las opciones) y Cazamatrículas (submit_plate).
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

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
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Ibiza', 'CAMI2345', 6.5, 'diesel', 5);
create temp table viaje (id uuid);
create temp table ronda (id uuid);
grant all on viaje, ronda to authenticated;
select pg_temp.como('11111111-1111-1111-1111-111111111111', false);
insert into viaje select public.start_session('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
select pg_temp.como('22222222-2222-2222-2222-222222222222');
select public.join_session('CAMI2345', 'Bea', 'preset', 'avatar-02', 2::smallint);
select pg_temp.como('33333333-3333-3333-3333-333333333333');
select public.join_session('CAMI2345', 'Carlos', 'preset', 'avatar-03', 3::smallint);

-- 1-5 · plate_matches
select ok(public.plate_matches('{"kind": "letras", "letters": ["K", "M"]}', '1234MKB'), 'letras: K y M en cualquier orden');
select ok(not public.plate_matches('{"kind": "letras", "letters": ["K", "M"]}', '1234KBB'), 'letras: falta la M');
select ok(public.plate_matches('{"kind": "suma", "total": 20}', '5582BCD'), 'suma: 5+5+8+2 = 20');
select ok(public.plate_matches('{"kind": "empieza", "letter": "L"}', '1236LBC')
  and not public.plate_matches('{"kind": "empieza", "letter": "L"}', '1237LBC'), 'empieza: por L y número par');
select ok(public.plate_matches('{"kind": "repite", "digit": "7"}', '7172BCD')
  and not public.plate_matches('{"kind": "repite", "digit": "7"}', '7123BCD'), 'repite: dos sietes');

-- 6-7 · Trivial: la respuesta tiene que ser una de las opciones
select pg_temp.como('22222222-2222-2222-2222-222222222222');
insert into ronda select public.create_round((select id from viaje), 'trivial',
  '{"kind": "cual_es", "question": "¿Qué sitio es?", "options": [{"id": "1", "label": "A"}, {"id": "2", "label": "B"}]}',
  '{"option": "2"}', 30);
select throws_ok($$ select public.submit_answer((select id from ronda), '{"option": "9"}') $$,
  'P0001', 'INVALID_OPTION', 'trivial: una opción que no existe no vale');
select pg_temp.como('33333333-3333-3333-3333-333333333333');
select public.submit_answer((select id from ronda), '{"option": "2"}');
select pg_temp.como('22222222-2222-2222-2222-222222222222');
select public.submit_answer((select id from ronda), '{"option": "1"}');
select public.reveal_round((select id from ronda));
select is((select points from public.game_answers where round_id = (select id from ronda)
  and user_id = '33333333-3333-3333-3333-333333333333'), 100, 'trivial: quien acierta se lleva 100');
select public.close_round((select id from ronda));
delete from ronda;

-- 8-16 · Cazamatrículas
insert into ronda select public.create_round((select id from viaje), 'matriculas',
  '{"challenge": {"kind": "letras", "letters": ["K", "M"]}}', null, 180);
select throws_ok($$ select public.submit_answer((select id from ronda), '{"option": "x"}') $$,
  'P0001', 'WRONG_GAME', 'las matrículas no van por submit_answer');
select throws_ok($$ select public.submit_plate((select id from ronda), 'CO-1234-AB') $$,
  'P0001', 'PLATE_INVALID', 'una matrícula antigua o mal escrita no vale');
select throws_ok($$ select public.submit_plate((select id from ronda), '1234 BCD') $$,
  'P0001', 'PLATE_NO_MATCH', 'una matrícula que no cumple el reto no vale');
select is(public.submit_plate((select id from ronda), '1234 km-b'), 100, 'Bea la encuentra la primera: 100 puntos');
select throws_ok($$ select public.submit_plate((select id from ronda), '9876MKZ') $$,
  'P0001', 'ALREADY_FOUND', 'cada uno solo una vez por ronda');
select pg_temp.como('33333333-3333-3333-3333-333333333333');
select is(public.submit_plate((select id from ronda), '1234KMB'), 75, 'Carlos, segundo: 75 puntos');
select is((select answer ->> 'plate' from public.game_answers where round_id = (select id from ronda)
  and user_id = '22222222-2222-2222-2222-222222222222'), null, 'con la ronda activa no se ve la de los demás');
select pg_temp.como('11111111-1111-1111-1111-111111111111', false);
select throws_ok($$ select public.submit_plate((select id from ronda), '1234KMC') $$,
  'P0001', 'DRIVER_CANT_PLAY', 'el conductor conduce: no juega');
select pg_temp.como('44444444-4444-4444-4444-444444444444');
select throws_ok($$ select public.submit_plate((select id from ronda), '1234KMC') $$,
  'P0001', 'NOT_MEMBER', 'alguien de fuera no juega');

select * from finish();
rollback;
