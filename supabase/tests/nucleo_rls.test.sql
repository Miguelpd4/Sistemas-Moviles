-- S1-02 · Pruebas de RLS del núcleo. Se ejecutan con: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(21);

-- Actuar como un usuario: rol authenticated + JWT con su id
create function pg_temp.como(p_uid uuid, p_anon boolean default false) returns void
language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_uid, 'role', 'authenticated', 'is_anonymous', p_anon)::text, true);
end $$;

-- Datos: A conductor con email, B y C pasajeros anónimos
insert into auth.users (id, email, is_anonymous, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'ana@example.com', false, '{"display_name": "Ana"}'),
  ('22222222-2222-2222-2222-222222222222', null, true, '{}'),
  ('33333333-3333-3333-3333-333333333333', null, true, '{}');
insert into public.cars (id, owner_id, name, nfc_code, consumption_l_100km, fuel_type, seats) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Ibiza', 'PRUEBA23', 6.5, 'diesel', 5);

-- 1-3 · Perfil automático
select is((select count(*)::int from public.profiles), 3, 'el trigger crea un perfil por usuario');
select is((select is_anonymous from public.profiles where id = '22222222-2222-2222-2222-222222222222'), true,
  'el perfil de un anónimo queda marcado como anónimo');
select is((select display_name from public.profiles where id = '11111111-1111-1111-1111-111111111111'), 'Ana',
  'el nombre del registro pasa al perfil');

-- 4-6 · El conductor crea su viaje y lo ve
select pg_temp.como('11111111-1111-1111-1111-111111111111');
select lives_ok($$ select public.start_session('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') $$, 'A crea el viaje');
select is((select count(*)::int from public.sessions), 1, 'A ve su viaje');
select is((select count(*)::int from public.session_members), 1, 'A ve su fila de conductor');

-- Guardar el id del viaje para usarlo con otros usuarios
reset role;
create temp table viaje as select id from public.sessions;
grant select on viaje to authenticated;

-- 7-13 · Un pasajero que no está en el viaje no ve nada ni puede colarse
select pg_temp.como('22222222-2222-2222-2222-222222222222', true);
select is((select count(*)::int from public.sessions), 0, 'B no ve viajes ajenos');
select is((select count(*)::int from public.session_members), 0, 'B no ve miembros ajenos');
select throws_ok(
  $$ insert into public.session_members (session_id, user_id, display_name, avatar_value)
     values ((select id from viaje), '22222222-2222-2222-2222-222222222222', 'Bea', 'avatar-02') $$,
  '42501', null, 'B no puede insertarse a mano en session_members');
select throws_ok(
  $$ insert into public.cars (owner_id, name, nfc_code, consumption_l_100km, fuel_type)
     values ('22222222-2222-2222-2222-222222222222', 'Coche', 'ANONIMO2', 5, 'diesel') $$,
  '42501', null, 'un anónimo no puede registrar coches');
select is((select count(*)::int from public.profiles where id = '11111111-1111-1111-1111-111111111111'), 0,
  'B no ve el perfil de A antes de entrar');
select lives_ok($$ update public.profiles set display_name = 'Bea' where id = '22222222-2222-2222-2222-222222222222' $$,
  'B edita su propio perfil');
update public.profiles set display_name = 'X' where id = '11111111-1111-1111-1111-111111111111';
reset role;
select is((select display_name from public.profiles where id = '11111111-1111-1111-1111-111111111111'), 'Ana',
  'B no puede editar el perfil de A');
select pg_temp.como('22222222-2222-2222-2222-222222222222', true);

-- 14-18 · Tras entrar con la RPC, B ve el viaje
select lives_ok($$ select public.join_session('PRUEBA23', 'Bea', 'preset', 'avatar-02', 3::smallint) $$,
  'B entra con join_session');
select is((select count(*)::int from public.session_members), 2, 'B ve a los 2 miembros');
select is((select count(*)::int from public.profiles where id = '11111111-1111-1111-1111-111111111111'), 1,
  'B ve el perfil de A');
select is((select count(*)::int from public.sessions), 1, 'B ve el viaje');
select is((select count(*)::int from public.cars), 1, 'B ve el coche del viaje');

-- 19-20 · Sin sesión (rol anon)
select set_config('role', 'anon', true);
select set_config('request.jwt.claims', '{"role": "anon"}', true);
select is((select count(*)::int from public.sessions), 0, 'sin sesión no se ve ningún viaje');
select throws_ok($$ select public.join_session('PRUEBA23', 'Intruso', 'preset', 'avatar-01', null) $$,
  '42501', null, 'sin sesión no se puede llamar a join_session');

-- 21 · Otro anónimo fuera del viaje no ve a sus miembros
select pg_temp.como('33333333-3333-3333-3333-333333333333', true);
select is((select count(*)::int from public.profiles where id = '22222222-2222-2222-2222-222222222222'), 0,
  'C no ve el perfil de B');

select * from finish();
rollback;
