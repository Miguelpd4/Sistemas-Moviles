-- #27 · Solo quien paga o quien cobra marca un pago como hecho.
begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

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
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Ibiza', 'PAGO2345', 6.5, 'diesel', 5);
create temp table viaje (id uuid);
create temp table pago (id uuid);
grant all on viaje, pago to authenticated;
select pg_temp.como('11111111-1111-1111-1111-111111111111', false);
insert into viaje select public.start_session('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
select pg_temp.como('22222222-2222-2222-2222-222222222222');
select public.join_session('PAGO2345', 'Bea', 'preset', 'avatar-02', 2::smallint);
select pg_temp.como('33333333-3333-3333-3333-333333333333');
select public.join_session('PAGO2345', 'Carlos', 'preset', 'avatar-03', 3::smallint);
-- 100 km a 1,54 €/L: Bea debe 3,34 € y Carlos 3,33 € a Ana
select pg_temp.como('11111111-1111-1111-1111-111111111111', false);
select public.start_trip((select id from viaje), 1.54, 37.88, -4.77);
select public.end_trip((select id from viaje), 100000, 37.9, -4.8);
insert into pago select id from public.payments where session_id = (select id from viaje)
  and from_user = '22222222-2222-2222-2222-222222222222';

select pg_temp.como('33333333-3333-3333-3333-333333333333');
select throws_ok($$ select public.mark_payment_paid((select id from pago)) $$,
  'P0001', 'NOT_MEMBER', 'Carlos no puede marcar el pago de Bea');
select pg_temp.como('22222222-2222-2222-2222-222222222222');
select lives_ok($$ select public.mark_payment_paid((select id from pago)) $$, 'Bea marca su pago');
select is((select status from public.payments where id = (select id from pago)), 'pagado', 'queda pagado');
select pg_temp.como('11111111-1111-1111-1111-111111111111', false);
select lives_ok($$ select public.mark_payment_paid((select id from pago)) $$, 'quien cobra también puede (y repetirlo no falla)');

select * from finish();
rollback;
