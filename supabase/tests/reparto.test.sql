-- #25 · Al finalizar, la gasolina se reparte a partes iguales y se calculan los pagos.
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

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
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Ibiza', 'REPA2345', 6.5, 'diesel', 5);

create temp table viaje (id uuid);
grant all on viaje to authenticated;
select pg_temp.como('11111111-1111-1111-1111-111111111111', false);
insert into viaje select public.start_session('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
select pg_temp.como('22222222-2222-2222-2222-222222222222');
select public.join_session('REPA2345', 'Bea', 'preset', 'avatar-02', 2::smallint);
select pg_temp.como('33333333-3333-3333-3333-333333333333');
select public.join_session('REPA2345', 'Carlos', 'preset', 'avatar-03', 3::smallint);

-- 1 · Nadie puede llamar al reparto directamente
select throws_ok($$ select public.settle_trip((select id from viaje)) $$, '42501', null,
  'settle_trip no se puede llamar desde la app');

-- Ana sale a 1,54 €/L, hace 100 km y finaliza: 100 × 6,5/100 × 1,54 = 10,01 €
select pg_temp.como('11111111-1111-1111-1111-111111111111', false);
select public.start_trip((select id from viaje), 1.54, 37.88, -4.77);
select public.end_trip((select id from viaje), 100000, 37.9, -4.8);

-- 2-3 · La gasolina queda como gasto de la conductora
select pg_temp.como('22222222-2222-2222-2222-222222222222');
select is((select amount_cents from public.expenses where session_id = (select id from viaje) and kind = 'combustible'),
  1001, 'la gasolina son 1001 céntimos');
select is((select paid_by from public.expenses where session_id = (select id from viaje)),
  '11111111-1111-1111-1111-111111111111'::uuid, 'la paga la conductora');

-- 4-6 · Reparto: 334 + 334 + 333 (el céntimo que sobra, los primeros por id). Ana pagó 1001: cobra 667
select is((select count(*)::int from public.payments where session_id = (select id from viaje)), 2, 'dos pagos');
select is((select amount_cents from public.payments where session_id = (select id from viaje)
    and from_user = '22222222-2222-2222-2222-222222222222'), 334, 'Bea paga 3,34 € a Ana');
select is((select amount_cents from public.payments where session_id = (select id from viaje)
    and from_user = '33333333-3333-3333-3333-333333333333'), 333, 'Carlos paga 3,33 € a Ana');

-- 7 · Todo a Ana y pendiente
select is((select count(*)::int from public.payments where session_id = (select id from viaje)
    and to_user = '11111111-1111-1111-1111-111111111111' and status = 'pendiente'), 2, 'los dos pagos van a Ana, pendientes');

-- 8 · Alguien de fuera no ve nada
select pg_temp.como('44444444-4444-4444-4444-444444444444');
select is((select count(*)::int from public.payments) + (select count(*)::int from public.expenses), 0,
  'alguien de fuera no ve ni gastos ni pagos');

-- 9 · Un viaje cerrado sin salir no reparte nada
reset role;
insert into public.cars (id, owner_id, name, nfc_code, consumption_l_100km, fuel_type, seats) values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'León', 'SINS2345', 6.5, 'diesel', 5);
create temp table otro (id uuid);
grant all on otro to authenticated;
select pg_temp.como('11111111-1111-1111-1111-111111111111', false);
insert into otro select public.start_session('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
select public.end_trip((select id from otro), 0, null, null);
select is((select count(*)::int from public.payments where session_id = (select id from otro)), 0,
  'cerrar un viaje sin salir no crea pagos');

select * from finish();
rollback;
