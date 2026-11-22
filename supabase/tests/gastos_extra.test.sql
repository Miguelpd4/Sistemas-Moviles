-- #26 · Gastos extra: los añade cualquiera del viaje mientras dura y entran en el reparto.
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
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Ibiza', 'GAST2345', 6.5, 'diesel', 5);
create temp table viaje (id uuid);
grant all on viaje to authenticated;
select pg_temp.como('11111111-1111-1111-1111-111111111111', false);
insert into viaje select public.start_session('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
select pg_temp.como('22222222-2222-2222-2222-222222222222');
select public.join_session('GAST2345', 'Bea', 'preset', 'avatar-02', 2::smallint);
select pg_temp.como('33333333-3333-3333-3333-333333333333');
select public.join_session('GAST2345', 'Carlos', 'preset', 'avatar-03', 3::smallint);
select pg_temp.como('11111111-1111-1111-1111-111111111111', false);
select public.start_trip((select id from viaje), 1.54, 37.88, -4.77);

-- 1 · Bea paga un peaje de 3 € con su ticket
select pg_temp.como('22222222-2222-2222-2222-222222222222');
select lives_ok($$ insert into public.expenses (session_id, paid_by, kind, description, amount_cents, receipt_path)
  select id, '22222222-2222-2222-2222-222222222222', 'peaje', 'AP-4', 300, id::text || '/22222222-2222-2222-2222-222222222222/1.jpg'
  from viaje $$, 'Bea añade un peaje con su ticket');

-- 2 · Nadie apunta gasolina a mano
select throws_ok($$ insert into public.expenses (session_id, paid_by, kind, amount_cents)
  select id, '22222222-2222-2222-2222-222222222222', 'combustible', 500 from viaje $$,
  '42501', null, 'la gasolina no se apunta a mano');

-- 3 · Ni a nombre de otro
select throws_ok($$ insert into public.expenses (session_id, paid_by, kind, amount_cents)
  select id, '33333333-3333-3333-3333-333333333333', 'parking', 500 from viaje $$,
  '42501', null, 'no se apunta un gasto a nombre de otro');

-- 4 · Ni con un ticket de otro viaje
select throws_ok($$ insert into public.expenses (session_id, paid_by, kind, amount_cents, receipt_path)
  select id, '22222222-2222-2222-2222-222222222222', 'parking', 500, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/x.jpg' from viaje $$,
  '42501', null, 'el ticket tiene que ser de este viaje');

-- 5 · Alguien de fuera no
select pg_temp.como('44444444-4444-4444-4444-444444444444');
select throws_ok($$ insert into public.expenses (session_id, paid_by, kind, amount_cents)
  values ((select id from viaje), '44444444-4444-4444-4444-444444444444', 'peaje', 100) $$,
  '42501', null, 'alguien de fuera no añade gastos');

-- 6-7 · Al finalizar: 10,01 € de gasolina (Ana) + 3 € de peaje (Bea) = 13,01 € → 4,34 + 4,34 + 4,33
select pg_temp.como('11111111-1111-1111-1111-111111111111', false);
select public.end_trip((select id from viaje), 100000, 37.9, -4.8);
select is((select amount_cents from public.payments where session_id = (select id from viaje)
    and from_user = '22222222-2222-2222-2222-222222222222'), 134, 'Bea, que pagó el peaje, solo paga 1,34 € a Ana');
select is((select amount_cents from public.payments where session_id = (select id from viaje)
    and from_user = '33333333-3333-3333-3333-333333333333'), 433, 'Carlos paga 4,33 € a Ana');

-- 8 · Con el viaje terminado ya no se añaden gastos
select pg_temp.como('22222222-2222-2222-2222-222222222222');
select throws_ok($$ insert into public.expenses (session_id, paid_by, kind, amount_cents)
  select id, '22222222-2222-2222-2222-222222222222', 'parking', 200 from viaje $$,
  '42501', null, 'con el viaje terminado no se añaden gastos');

select * from finish();
rollback;
