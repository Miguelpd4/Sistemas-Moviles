-- #29 · Solo el conductor o el copiloto ponen el destino del viaje.
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
  ('22222222-2222-2222-2222-222222222222', null, true, '{}'),
  ('33333333-3333-3333-3333-333333333333', null, true, '{}');
insert into public.cars (id, owner_id, name, nfc_code, consumption_l_100km, fuel_type, seats) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Ibiza', 'DEST2345', 6.5, 'diesel', 5);
create temp table viaje (id uuid);
grant all on viaje to authenticated;
select pg_temp.como('11111111-1111-1111-1111-111111111111', false);
insert into viaje select public.start_session('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
select pg_temp.como('22222222-2222-2222-2222-222222222222');
select public.join_session('DEST2345', 'Bea', 'preset', 'avatar-02', 2::smallint);
select pg_temp.como('33333333-3333-3333-3333-333333333333');
select public.join_session('DEST2345', 'Carlos', 'preset', 'avatar-03', 3::smallint);

-- 1 · Un pasajero no
select throws_ok($$ select public.set_destination((select id from viaje), 'Sevilla', 37.39, -5.98) $$,
  'P0001', 'NOT_ADMIN', 'un pasajero no pone el destino');

-- 2-3 · El copiloto sí
select pg_temp.como('11111111-1111-1111-1111-111111111111', false);
select public.set_copilot((select id from viaje), '22222222-2222-2222-2222-222222222222');
select pg_temp.como('22222222-2222-2222-2222-222222222222');
select lives_ok($$ select public.set_destination((select id from viaje), 'Sevilla', 37.39, -5.98) $$, 'el copiloto pone el destino');
select is((select destination_name || ' ' || destination_lat from public.sessions where id = (select id from viaje)),
  'Sevilla 37.39', 'el destino queda guardado');

-- 4 · Coordenadas imposibles
select throws_ok($$ select public.set_destination((select id from viaje), 'Marte', 137.0, -5.98) $$,
  'P0001', 'INVALID_DESTINATION', 'coordenadas fuera de rango');

-- 5 · Quitar el destino
select public.set_destination((select id from viaje), null, null, null);
select is((select destination_lat from public.sessions where id = (select id from viaje)), null, 'se puede quitar el destino');

select * from finish();
rollback;
