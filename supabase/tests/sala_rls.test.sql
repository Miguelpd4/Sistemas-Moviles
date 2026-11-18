-- S2-01 · Gestión de la sala, viaje y canales privados de Realtime. Se ejecutan con: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

create function pg_temp.como(p_uid uuid, p_anon boolean default true) returns void
language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_uid, 'role', 'authenticated', 'is_anonymous', p_anon)::text, true);
end $$;

-- A conductor; B, C y D pasajeros; E de fuera
insert into auth.users (id, email, is_anonymous, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'ana@example.com', false, '{"display_name": "Ana"}'),
  ('22222222-2222-2222-2222-222222222222', null, true, '{}'),
  ('33333333-3333-3333-3333-333333333333', null, true, '{}'),
  ('44444444-4444-4444-4444-444444444444', null, true, '{}'),
  ('55555555-5555-5555-5555-555555555555', null, true, '{}');
insert into public.cars (id, owner_id, name, nfc_code, consumption_l_100km, fuel_type, seats) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Ibiza', 'SALA2345', 6.5, 'diesel', 5);

create temp table viaje (id uuid);
grant all on viaje to authenticated;
select pg_temp.como('11111111-1111-1111-1111-111111111111', false);
insert into viaje select public.start_session('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
select public.set_join_mode((select id from viaje), 'aprobacion');

select pg_temp.como('22222222-2222-2222-2222-222222222222');
select public.join_session('SALA2345', 'Bea', 'preset', 'avatar-02', 2::smallint);
select pg_temp.como('33333333-3333-3333-3333-333333333333');
select public.join_session('SALA2345', 'Carlos', 'preset', 'avatar-03', 3::smallint);
select pg_temp.como('44444444-4444-4444-4444-444444444444');
select public.join_session('SALA2345', 'Dani', 'preset', 'avatar-04', 4::smallint);

-- 1-2 · Aprobación
select pg_temp.como('11111111-1111-1111-1111-111111111111', false);
select lives_ok($$ select public.review_join((select id from viaje), '22222222-2222-2222-2222-222222222222', true) $$,
  'el conductor acepta a B');
select pg_temp.como('22222222-2222-2222-2222-222222222222');
select throws_ok($$ select public.review_join((select id from viaje), '33333333-3333-3333-3333-333333333333', true) $$,
  'P0001', 'NOT_ADMIN', 'un pasajero no puede aceptar a nadie');

-- 3-4 · El copiloto acepta
select pg_temp.como('11111111-1111-1111-1111-111111111111', false);
select public.set_copilot((select id from viaje), '22222222-2222-2222-2222-222222222222');
select pg_temp.como('22222222-2222-2222-2222-222222222222');
select lives_ok($$ select public.review_join((select id from viaje), '33333333-3333-3333-3333-333333333333', true) $$,
  'el copiloto acepta a C');
reset role;
select is((select status from public.session_members where user_id = '33333333-3333-3333-3333-333333333333'), 'dentro',
  'C pasa a dentro');

-- 5-7 · Copiloto
select pg_temp.como('33333333-3333-3333-3333-333333333333');
select throws_ok($$ select public.set_copilot((select id from viaje), '33333333-3333-3333-3333-333333333333') $$,
  'P0001', 'NOT_HOST', 'un pasajero no puede nombrar copiloto');
select pg_temp.como('11111111-1111-1111-1111-111111111111', false);
select public.set_copilot((select id from viaje), '33333333-3333-3333-3333-333333333333');
reset role;
select is((select count(*)::int from public.session_members where role = 'copiloto'), 1, 'solo hay un copiloto');
select is((select user_id from public.session_members where role = 'copiloto'), '33333333-3333-3333-3333-333333333333'::uuid,
  'el copiloto es ahora C');

-- 8-9 · Rechazar
select pg_temp.como('11111111-1111-1111-1111-111111111111', false);
select public.review_join((select id from viaje), '44444444-4444-4444-4444-444444444444', false);
select throws_ok($$ select public.review_join((select id from viaje), '44444444-4444-4444-4444-444444444444', true) $$,
  'P0001', 'NOT_PENDING', 'quien ya no espera no se puede aceptar');
reset role;
select is((select status from public.session_members where user_id = '44444444-4444-4444-4444-444444444444'), 'rechazado',
  'D queda rechazado');

-- 10-13 · Canales privados de Realtime
select pg_temp.como('33333333-3333-3333-3333-333333333333');
select set_config('realtime.topic', 'sala:' || (select id from viaje), true);
select lives_ok($$ insert into realtime.messages (topic, payload) values (realtime.topic(), '{}') $$,
  'un miembro puede enviar al canal de su sala');
select pg_temp.como('55555555-5555-5555-5555-555555555555');
select throws_ok($$ insert into realtime.messages (topic, payload) values (realtime.topic(), '{}') $$,
  '42501', null, 'alguien de fuera no puede enviar al canal');
select is((select count(*)::int from realtime.messages), 0, 'alguien de fuera no lee el canal de la sala');
reset role;
insert into realtime.messages (topic, payload)
  select 'entrada:' || id || ':55555555-5555-5555-5555-555555555555:x', '{}' from viaje;
select pg_temp.como('55555555-5555-5555-5555-555555555555');
select set_config('realtime.topic', 'entrada:' || (select id from viaje) || ':55555555-5555-5555-5555-555555555555:x', true);
select is((select count(*)::int from realtime.messages where topic like 'entrada:%'), 1,
  'cada uno lee su canal de espera');

-- 14 · Puntos GPS
select pg_temp.como('33333333-3333-3333-3333-333333333333');
select throws_ok($$ insert into public.trip_points (session_id, lat, lon, recorded_at) values ((select id from viaje), 37.8, -4.7, now()) $$,
  '42501', null, 'un pasajero no puede guardar puntos GPS');

-- 15-17 · Iniciar el viaje
select throws_ok($$ select public.start_trip((select id from viaje), 1.5, 37.8, -4.7) $$,
  'P0001', 'NOT_HOST', 'solo el conductor inicia el viaje');
select pg_temp.como('11111111-1111-1111-1111-111111111111', false);
select throws_ok($$ select public.start_trip((select id from viaje), 9, 37.8, -4.7) $$,
  'P0001', 'INVALID_PRICE', 'un precio absurdo no vale');
select public.start_trip((select id from viaje), 1.5, 37.8, -4.7);
select throws_ok($$ select public.start_trip((select id from viaje), 1.5, 37.8, -4.7) $$,
  'P0001', 'TRIP_NOT_OPEN', 'no se puede iniciar dos veces');

-- 18 · Salir del viaje
select pg_temp.como('22222222-2222-2222-2222-222222222222');
select public.leave_session((select id from viaje));
reset role;
select is((select status || coalesce(seat::text, '-') from public.session_members where user_id = '22222222-2222-2222-2222-222222222222'),
  'fuera-', 'al salir, B queda fuera y libera su asiento');

select * from finish();
rollback;
