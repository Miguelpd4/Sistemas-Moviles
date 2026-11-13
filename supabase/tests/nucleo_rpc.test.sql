-- S1-03 · Pruebas de las RPC del núcleo. Se ejecutan con: npx supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(26);

create function pg_temp.como(p_uid uuid, p_anon boolean default false) returns void
language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_uid, 'role', 'authenticated', 'is_anonymous', p_anon)::text, true);
end $$;

-- A y E conductores; B, C y D pasajeros anónimos
insert into auth.users (id, email, is_anonymous, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'ana@example.com', false, '{"display_name": "Ana"}'),
  ('22222222-2222-2222-2222-222222222222', null, true, '{}'),
  ('33333333-3333-3333-3333-333333333333', null, true, '{}'),
  ('44444444-4444-4444-4444-444444444444', null, true, '{}'),
  ('55555555-5555-5555-5555-555555555555', 'eva@example.com', false, '{"display_name": "Eva"}');
insert into public.cars (id, owner_id, name, nfc_code, consumption_l_100km, fuel_type, seats) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Ibiza', 'PRUEBA23', 6.5, 'diesel', 5),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '55555555-5555-5555-5555-555555555555', 'Clio', 'OTRO2345', 5.0, 'gasolina_95', 5),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '55555555-5555-5555-5555-555555555555', 'Furgo', 'CERRADO7', 8.0, 'diesel', 7);

-- 1-3 · start_session
select pg_temp.como('11111111-1111-1111-1111-111111111111');
select is(public.start_session('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
          public.start_session('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
          'start_session dos veces devuelve el mismo viaje');
select is((select count(*)::int from public.sessions where status <> 'finalizada'), 1, 'solo hay un viaje abierto');
select throws_ok($$ select public.start_session('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb') $$,
  'P0001', 'CAR_NOT_FOUND', 'no se puede abrir un viaje con un coche ajeno');

-- 4-7 · Vista previa y errores de código
select pg_temp.como('22222222-2222-2222-2222-222222222222', true);
select throws_ok($$ select public.join_session('NADA2345', 'Bea', 'preset', 'avatar-02', 3::smallint) $$,
  'P0001', 'NO_ACTIVE_SESSION', 'un código que no existe da NO_ACTIVE_SESSION');
select throws_ok($$ select public.get_session_preview('OTRO2345') $$,
  'P0001', 'NO_ACTIVE_SESSION', 'un coche sin viaje abierto da NO_ACTIVE_SESSION');
select is(public.get_session_preview('prueba23') ->> 'driver_name', 'Ana',
  'la vista previa acepta minúsculas y da el nombre del conductor');
select is(public.get_session_preview('PRUEBA23') -> 'taken_seats', '[1]'::jsonb,
  'al principio solo está ocupado el asiento del conductor');

-- 8-12 · Asientos y nombre
select is(public.join_session('PRUEBA23', 'Bea', 'preset', 'avatar-02', 3::smallint) ->> 'status', 'dentro',
  'B entra en el asiento 3');
select pg_temp.como('33333333-3333-3333-3333-333333333333', true);
select throws_ok($$ select public.join_session('PRUEBA23', 'Carlos', 'preset', 'avatar-03', 3::smallint) $$,
  'P0001', 'SEAT_TAKEN', 'el asiento 3 ya está ocupado');
select throws_ok($$ select public.join_session('PRUEBA23', 'Carlos', 'preset', 'avatar-03', 1::smallint) $$,
  'P0001', 'INVALID_SEAT', 'el asiento del conductor no se puede elegir');
select throws_ok($$ select public.join_session('PRUEBA23', 'Carlos', 'preset', 'avatar-03', 6::smallint) $$,
  'P0001', 'INVALID_SEAT', 'no existe el asiento 6 en un coche de 5 plazas');
select throws_ok($$ select public.join_session('PRUEBA23', '   ', 'preset', 'avatar-03', 4::smallint) $$,
  'P0001', 'INVALID_NAME', 'el nombre no puede estar vacío');

-- 13-15 · Volver a entrar actualiza la fila
select pg_temp.como('22222222-2222-2222-2222-222222222222', true);
select lives_ok($$ select public.join_session('PRUEBA23', 'Bea', 'preset', 'avatar-05', 4::smallint) $$,
  'B cambia al asiento 4');
reset role;
select is((select count(*)::int from public.session_members where user_id = '22222222-2222-2222-2222-222222222222'), 1,
  'B sigue teniendo una sola fila');
select is((select seat from public.session_members where user_id = '22222222-2222-2222-2222-222222222222'), 4::smallint,
  'el asiento de B es ahora el 4');

-- 16-17 · El conductor que toca su propia pegatina
select pg_temp.como('11111111-1111-1111-1111-111111111111');
select is(public.join_session('PRUEBA23', 'Ana', 'preset', 'avatar-01', 3::smallint) ->> 'status', 'dentro',
  'el conductor recibe dentro');
reset role;
select is((select seat from public.session_members where user_id = '11111111-1111-1111-1111-111111111111'), 1::smallint,
  'el conductor sigue en el asiento 1');

-- 18-19 · Vista previa tras los cambios
select pg_temp.como('33333333-3333-3333-3333-333333333333', true);
select is(public.get_session_preview('PRUEBA23') -> 'taken_seats', '[1, 4]'::jsonb,
  'el asiento 3 queda libre cuando B se cambia al 4');
select pg_temp.como('22222222-2222-2222-2222-222222222222', true);
select is(public.get_session_preview('PRUEBA23') ->> 'my_status', 'dentro', 'B aparece como dentro');

-- 20-24 · Viaje con aprobación
select pg_temp.como('55555555-5555-5555-5555-555555555555');
select lives_ok($$ select public.start_session('cccccccc-cccc-cccc-cccc-cccccccccccc', 'aprobacion') $$,
  'E abre un viaje con aprobación');
select pg_temp.como('44444444-4444-4444-4444-444444444444', true);
select is(public.join_session('CERRADO7', 'Dani', 'preset', 'avatar-04', 2::smallint) ->> 'status', 'pendiente',
  'D queda pendiente');
select is((select count(*)::int from public.session_members), 1, 'D pendiente solo ve su propia fila');
select is(public.get_session_preview('CERRADO7') ->> 'my_status', 'pendiente', 'la vista previa dice pendiente');
reset role;
update public.session_members set status = 'rechazado' where user_id = '44444444-4444-4444-4444-444444444444';
select pg_temp.como('44444444-4444-4444-4444-444444444444', true);
select throws_ok($$ select public.join_session('CERRADO7', 'Dani', 'preset', 'avatar-04', 2::smallint) $$,
  'P0001', 'JOIN_REJECTED', 'un rechazado no puede volver a entrar');

-- 25 · join_session actualiza el perfil
reset role;
select is((select display_name from public.profiles where id = '22222222-2222-2222-2222-222222222222'), 'Bea',
  'el nombre elegido se guarda en el perfil');

-- 26 · Sin usuario en el JWT
select set_config('role', 'authenticated', true);
select set_config('request.jwt.claims', '{"role": "authenticated"}', true);
select throws_ok($$ select public.start_session('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') $$,
  'P0001', 'NOT_AUTHENTICATED', 'sin usuario no se puede crear un viaje');

select * from finish();
rollback;
